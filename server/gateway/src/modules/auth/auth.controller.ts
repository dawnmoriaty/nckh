import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TokenService } from './token.service';
import { AuthGrpcService } from '../grpc/auth-grpc.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/auth.decorator';
import type { RequestUser } from './strategies/jwt.strategy';
import type { ValidatedRefreshToken } from './strategies/jwt-refresh.strategy';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';

interface FastifyRequestWithIp {
  ip: string;
  headers: { 'user-agent'?: string };
}

/**
 * Auth Controller
 * Handles authentication-related endpoints via gRPC to Go Worker
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly authGrpcService: AuthGrpcService,
  ) {}

  // =========================================================
  // PUBLIC ENDPOINTS (Login, Register, Refresh)
  // =========================================================

  /**
   * Register new user
   * Forwards request to Go gRPC Worker
   */
  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async register(@Body() registerDto: RegisterDto) {
    const response = await this.authGrpcService.register({
      username: registerDto.username,
      email: registerDto.email,
      password: registerDto.password,
      fullName: registerDto.fullName,
      phone: registerDto.phone,
    });

    if (!response.success) {
      throw new UnauthorizedException(response.message);
    }

    return {
      message: response.message,
      user: response.user,
    };
  }

  /**
   * Login user
   * Forwards request to Go gRPC Worker
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Req() req: FastifyRequestWithIp) {
    const response = await this.authGrpcService.login({
      username: loginDto.emailOrUsername,
      password: loginDto.password,
    });

    if (!response.success) {
      throw new UnauthorizedException(response.message);
    }

    // Store refresh token in Redis for session management
    if (response.user && response.refreshToken) {
      // Extract jti from refresh token (you may need to decode it)
      // For now, using a hash of the token as ID
      const tokenId = this.hashToken(response.refreshToken);

      await this.tokenService.storeRefreshToken(response.user.id, tokenId, {
        ip: req.ip,
        deviceInfo: req.headers['user-agent'],
      });
    }

    return {
      message: response.message,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    };
  }

  /**
   * Refresh access token
   * Validates refresh token and gets new tokens from Go Worker
   */
  @Post('refresh')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body() refreshDto: RefreshTokenDto,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @CurrentUser() _token: ValidatedRefreshToken,
  ) {
    const response = await this.authGrpcService.refreshToken({
      refreshToken: refreshDto.refreshToken,
    });

    if (!response.success) {
      throw new UnauthorizedException(response.message);
    }

    return {
      message: response.message,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    };
  }

  // =========================================================
  // PROTECTED ENDPOINTS (Logout, Me, Sessions)
  // =========================================================

  /**
   * Logout current device
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout current device' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: RequestUser,
    @Body('refreshTokenId') refreshTokenId?: string,
  ) {
    return await this.tokenService.logout(user, refreshTokenId);
  }

  /**
   * Logout from all devices
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutAll(@CurrentUser() user: RequestUser) {
    return await this.tokenService.logoutAll(user);
  }

  /**
   * Get current user info
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'User info retrieved' })
  getMe(@CurrentUser() user: RequestUser) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: {
        id: user.roleId,
        name: user.roleName,
        code: user.roleCode,
      },
      permissions: user.permissions,
    };
  }

  /**
   * Get active sessions
   */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all active sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved' })
  async getSessions(@CurrentUser() user: RequestUser) {
    const sessions = await this.tokenService.getActiveSessions(user.id);
    return {
      count: sessions.length,
      sessions: sessions.map((s) => ({
        deviceInfo: s.deviceInfo,
        ip: s.ip,
        createdAt: new Date(s.createdAt).toISOString(),
        expiresAt: new Date(s.expiresAt).toISOString(),
      })),
    };
  }

  /**
   * Revoke specific session
   */
  @Delete('sessions/:tokenId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  async revokeSession(
    @CurrentUser() user: RequestUser,
    @Param('tokenId') tokenId: string,
  ) {
    await this.tokenService.revokeSession(user.id, tokenId);
    return { message: 'Session revoked successfully' };
  }

  // =========================================================
  // PRIVATE HELPERS
  // =========================================================

  /**
   * Simple hash function for token ID generation
   * In production, extract jti from JWT instead
   */
  private hashToken(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TokenService } from './token.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/auth.decorator';
import type { RequestUser } from './strategies/jwt.strategy';
import type { ValidatedRefreshToken } from './strategies/jwt-refresh.strategy';

/**
 * Auth Controller
 * Handles authentication-related endpoints
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly tokenService: TokenService) {}

  /**
   * Refresh access token
   * Requires valid refresh token in body
   */
  @Post('refresh')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @CurrentUser() token: ValidatedRefreshToken,
  ): Promise<{ message: string; note: string }> {
    // Note: Actual token generation is done by Go worker
    // This endpoint validates the refresh token
    // The Gateway should call Go gRPC to generate new tokens

    return {
      message: 'Refresh token is valid',
      note: 'Call Go gRPC worker to generate new access token',
    };
  }

  /**
   * Logout current device
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
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
  @ApiBearerAuth()
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
  @ApiBearerAuth()
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
  @ApiBearerAuth()
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  async revokeSession(
    @CurrentUser() user: RequestUser,
    @Param('tokenId') tokenId: string,
  ) {
    await this.tokenService.revokeSession(user.id, tokenId);
    return { message: 'Session revoked successfully' };
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../../redis/redis.service';

/**
 * Refresh Token Payload
 */
export interface RefreshTokenPayload {
  jti: string; // Token ID
  sub: string; // User ID
  type: 'refresh';
  iat: number;
  exp: number;
}

/**
 * Validated refresh token data
 */
export interface ValidatedRefreshToken {
  userId: string;
  tokenId: string;
}

/**
 * JWT Refresh Strategy
 * Validates refresh tokens from request body or cookie
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      // Extract from body field 'refreshToken'
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),

      ignoreExpiration: false,

      secretOrKey: configService.getOrThrow<string>('jwt.secret'),

      algorithms: ['HS256'],
    });
  }

  /**
   * Validate refresh token
   */
  async validate(payload: RefreshTokenPayload): Promise<ValidatedRefreshToken> {
    // Validate token type
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Check if refresh token exists in Redis (not revoked)
    const tokenData = await this.redisService.validateRefreshToken(
      payload.sub,
      payload.jti,
    );

    if (!tokenData) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    return {
      userId: payload.sub,
      tokenId: payload.jti,
    };
  }
}

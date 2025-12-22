import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../../redis/redis.service';

/**
 * JWT Payload structure returned by Go gRPC Worker
 */
export interface JwtPayload {
  jti: string; // Token ID (unique identifier)
  sub: string; // User ID
  email: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
  roleCode: string;
  permissions: string[]; // Format: ["resource_code:ACTION", ...]
  iat: number; // Issued at
  exp: number; // Expiration
}

/**
 * Validated user object attached to request
 */
export interface RequestUser {
  id: string;
  tokenId: string;
  email: string;
  username: string;
  fullName: string;
  roleId: string;
  roleName: string;
  roleCode: string;
  permissions: string[];
}

/**
 * JWT Strategy for Passport
 * Extracts and validates JWT from Authorization Bearer header
 * Checks blacklist via Redis for revoked tokens
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      // Extract JWT from Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Do not ignore expiration - let Passport handle it
      ignoreExpiration: false,

      // Secret key for JWT verification (must match Go worker's signing key)
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),

      // Specify allowed algorithms
      algorithms: ['HS256'],
    });
  }

  /**
   * Validate callback - called after JWT is verified
   * Returns the user object that will be attached to request.user
   *
   * @param payload - Decoded JWT payload
   * @returns User object to attach to request
   */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    // Validate required fields
    if (!payload.sub || !payload.jti) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Check if token is blacklisted (user logged out)
    const isBlacklisted = await this.redisService.isAccessTokenBlacklisted(
      payload.jti,
    );

    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Ensure permissions is an array
    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions
      : [];

    // Return user object (will be available as request.user)
    return {
      id: payload.sub,
      tokenId: payload.jti,
      email: payload.email,
      username: payload.username,
      fullName: payload.fullName,
      roleId: payload.roleId,
      roleName: payload.roleName,
      roleCode: payload.roleCode,
      permissions,
    };
  }
}

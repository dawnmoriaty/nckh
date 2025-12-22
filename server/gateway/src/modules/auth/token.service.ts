import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import type { RequestUser } from './strategies/jwt.strategy';

/**
 * Token Service
 * Handles token-related operations via Redis
 */
@Injectable()
export class TokenService {
  constructor(private readonly redisService: RedisService) {}

  // ========================================================
  // REFRESH TOKEN OPERATIONS
  // ========================================================

  /**
   * Store refresh token after login
   * Called by Go worker via gRPC or after receiving tokens
   */
  async storeRefreshToken(
    userId: string,
    tokenId: string,
    metadata?: { deviceInfo?: string; ip?: string },
  ): Promise<void> {
    await this.redisService.storeRefreshToken(userId, tokenId, metadata);
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(
    userId: string,
    tokenId: string,
  ): Promise<boolean> {
    const data = await this.redisService.validateRefreshToken(userId, tokenId);
    return data !== null;
  }

  /**
   * Revoke specific refresh token (single device logout)
   */
  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    await this.redisService.revokeRefreshToken(userId, tokenId);
  }

  // ========================================================
  // ACCESS TOKEN OPERATIONS
  // ========================================================

  /**
   * Blacklist access token (called on logout)
   * @param tokenId - The jti claim from JWT
   * @param expiresIn - Remaining TTL in seconds
   */
  async blacklistAccessToken(
    tokenId: string,
    expiresIn?: number,
  ): Promise<void> {
    await this.redisService.blacklistAccessToken(tokenId, expiresIn);
  }

  /**
   * Check if access token is blacklisted
   */
  async isAccessTokenBlacklisted(tokenId: string): Promise<boolean> {
    return await this.redisService.isAccessTokenBlacklisted(tokenId);
  }

  // ========================================================
  // LOGOUT OPERATIONS
  // ========================================================

  /**
   * Logout current device
   * Blacklists access token and revokes refresh token
   */
  async logout(
    user: RequestUser,
    refreshTokenId?: string,
  ): Promise<{ message: string }> {
    // Blacklist access token
    await this.blacklistAccessToken(user.tokenId);

    // Revoke refresh token if provided
    if (refreshTokenId) {
      await this.revokeRefreshToken(user.id, refreshTokenId);
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices
   * Blacklists current access token and revokes all refresh tokens
   */
  async logoutAll(
    user: RequestUser,
  ): Promise<{ message: string; revokedSessions: number }> {
    // Blacklist current access token
    await this.blacklistAccessToken(user.tokenId);

    // Revoke all refresh tokens
    const revokedCount = await this.redisService.revokeAllUserTokens(user.id);

    return {
      message: 'Logged out from all devices',
      revokedSessions: revokedCount,
    };
  }

  // ========================================================
  // SESSION MANAGEMENT
  // ========================================================

  /**
   * Get all active sessions for user
   */
  async getActiveSessions(userId: string) {
    return await this.redisService.getUserSessions(userId);
  }

  /**
   * Count active sessions
   */
  async countActiveSessions(userId: string): Promise<number> {
    return await this.redisService.countUserSessions(userId);
  }

  /**
   * Revoke specific session by token ID
   */
  async revokeSession(userId: string, tokenId: string): Promise<void> {
    await this.redisService.revokeRefreshToken(userId, tokenId);
  }
}

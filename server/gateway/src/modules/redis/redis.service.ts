import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

/**
 * Redis Key Prefixes for Token Management
 */
export const REDIS_KEYS = {
  // Active refresh tokens: refresh_token:{userId}:{tokenId}
  REFRESH_TOKEN: 'refresh_token',
  // Blacklisted access tokens: blacklist:{tokenId}
  BLACKLIST: 'blacklist',
  // User sessions: sessions:{userId}
  USER_SESSIONS: 'sessions',
  // Rate limiting: rate_limit:{ip}:{endpoint}
  RATE_LIMIT: 'rate_limit',
} as const;

/**
 * Token Metadata stored in Redis
 */
export interface TokenMetadata {
  userId: string;
  deviceInfo?: string;
  ip?: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Redis Service for Token Management
 * Handles refresh tokens, blacklisting, and session management
 */
@Injectable()
export class RedisService {
  private readonly accessTokenTtl: number;
  private readonly refreshTokenTtl: number;
  private readonly blacklistTtl: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenTtl = this.configService.get<number>(
      'redis.accessTokenTtl',
      900,
    );
    this.refreshTokenTtl = this.configService.get<number>(
      'redis.refreshTokenTtl',
      604800,
    );
    this.blacklistTtl = this.configService.get<number>(
      'redis.blacklistTtl',
      86400,
    );
  }

  // ========================================================
  // REFRESH TOKEN MANAGEMENT
  // ========================================================

  /**
   * Store refresh token in Redis
   * Key format: refresh_token:{userId}:{tokenId}
   */
  async storeRefreshToken(
    userId: string,
    tokenId: string,
    metadata: Partial<TokenMetadata> = {},
  ): Promise<void> {
    const key = this.buildKey(REDIS_KEYS.REFRESH_TOKEN, userId, tokenId);
    const data: TokenMetadata = {
      userId,
      deviceInfo: metadata.deviceInfo,
      ip: metadata.ip,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.refreshTokenTtl * 1000,
    };

    await this.redis.setex(key, this.refreshTokenTtl, JSON.stringify(data));

    // Also add to user's session set for tracking
    await this.addUserSession(userId, tokenId);
  }

  /**
   * Validate refresh token exists and is not revoked
   */
  async validateRefreshToken(
    userId: string,
    tokenId: string,
  ): Promise<TokenMetadata | null> {
    const key = this.buildKey(REDIS_KEYS.REFRESH_TOKEN, userId, tokenId);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data) as TokenMetadata;
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    const key = this.buildKey(REDIS_KEYS.REFRESH_TOKEN, userId, tokenId);
    await this.redis.del(key);
    await this.removeUserSession(userId, tokenId);
  }

  /**
   * Revoke all refresh tokens for a user (logout all devices)
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    const sessionKey = this.buildKey(REDIS_KEYS.USER_SESSIONS, userId);
    const tokenIds = await this.redis.smembers(sessionKey);

    if (tokenIds.length === 0) {
      return 0;
    }

    // Delete all refresh tokens
    const tokenKeys = tokenIds.map((tokenId) =>
      this.buildKey(REDIS_KEYS.REFRESH_TOKEN, userId, tokenId),
    );

    const pipeline = this.redis.pipeline();
    tokenKeys.forEach((key) => pipeline.del(key));
    pipeline.del(sessionKey);
    await pipeline.exec();

    return tokenIds.length;
  }

  // ========================================================
  // ACCESS TOKEN BLACKLIST (for logout)
  // ========================================================

  /**
   * Add access token to blacklist (when user logs out)
   * TTL should match the remaining lifetime of the token
   */
  async blacklistAccessToken(
    tokenId: string,
    remainingTtl?: number,
  ): Promise<void> {
    const key = this.buildKey(REDIS_KEYS.BLACKLIST, tokenId);
    const ttl = remainingTtl || this.blacklistTtl;
    await this.redis.setex(key, ttl, '1');
  }

  /**
   * Check if access token is blacklisted
   */
  async isAccessTokenBlacklisted(tokenId: string): Promise<boolean> {
    const key = this.buildKey(REDIS_KEYS.BLACKLIST, tokenId);
    const result = await this.redis.exists(key);
    return result === 1;
  }

  // ========================================================
  // USER SESSIONS TRACKING
  // ========================================================

  /**
   * Add token to user's active sessions
   */
  private async addUserSession(userId: string, tokenId: string): Promise<void> {
    const key = this.buildKey(REDIS_KEYS.USER_SESSIONS, userId);
    await this.redis.sadd(key, tokenId);
    await this.redis.expire(key, this.refreshTokenTtl);
  }

  /**
   * Remove token from user's active sessions
   */
  private async removeUserSession(
    userId: string,
    tokenId: string,
  ): Promise<void> {
    const key = this.buildKey(REDIS_KEYS.USER_SESSIONS, userId);
    await this.redis.srem(key, tokenId);
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<TokenMetadata[]> {
    const sessionKey = this.buildKey(REDIS_KEYS.USER_SESSIONS, userId);
    const tokenIds = await this.redis.smembers(sessionKey);

    if (tokenIds.length === 0) {
      return [];
    }

    const sessions: TokenMetadata[] = [];

    for (const tokenId of tokenIds) {
      const metadata = await this.validateRefreshToken(userId, tokenId);
      if (metadata) {
        sessions.push(metadata);
      }
    }

    return sessions;
  }

  /**
   * Count active sessions for a user
   */
  async countUserSessions(userId: string): Promise<number> {
    const key = this.buildKey(REDIS_KEYS.USER_SESSIONS, userId);
    return await this.redis.scard(key);
  }

  // ========================================================
  // RATE LIMITING HELPERS
  // ========================================================

  /**
   * Increment rate limit counter
   * Returns current count after increment
   */
  async incrementRateLimit(
    identifier: string,
    windowSeconds: number,
  ): Promise<number> {
    const key = this.buildKey(REDIS_KEYS.RATE_LIMIT, identifier);
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    return count;
  }

  /**
   * Get current rate limit count
   */
  async getRateLimitCount(identifier: string): Promise<number> {
    const key = this.buildKey(REDIS_KEYS.RATE_LIMIT, identifier);
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  // ========================================================
  // GENERIC HELPERS
  // ========================================================

  /**
   * Build Redis key with prefix
   */
  private buildKey(...parts: string[]): string {
    return parts.join(':');
  }

  /**
   * Set a value with expiration
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  /**
   * Get a value
   */
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

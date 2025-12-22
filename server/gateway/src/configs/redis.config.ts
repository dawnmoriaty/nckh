import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  accessTokenTtl: parseInt(process.env.REDIS_ACCESS_TOKEN_TTL || '900', 10),
  refreshTokenTtl: parseInt(
    process.env.REDIS_REFRESH_TOKEN_TTL || '604800',
    10,
  ),
  blacklistTtl: parseInt(process.env.REDIS_BLACKLIST_TTL || '86400', 10),
}));

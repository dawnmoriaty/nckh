import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('redis.host');
        const port = configService.get<number>('redis.port');
        const password = configService.get<string>('redis.password');

        const redis = new Redis({
          host,
          port,
          password: password || undefined,
          retryStrategy: (times) => {
            if (times > 3) {
              console.error('❌ Redis connection failed after 3 retries');
              return null;
            }
            return Math.min(times * 200, 2000);
          },
          maxRetriesPerRequest: 3,
        });

        redis.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

        redis.on('error', (err) => {
          console.error('❌ Redis error:', err.message);
        });

        return redis;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}

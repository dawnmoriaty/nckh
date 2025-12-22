import { Module } from '@nestjs/common';
import { AppConfigModule } from './configs/config.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [AppConfigModule, RedisModule, AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

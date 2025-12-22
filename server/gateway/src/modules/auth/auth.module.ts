import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { TokenService } from './token.service';
import { AuthController } from './auth.controller';
import { RedisModule } from '../redis/redis.module';
import { RedisService } from '../redis/redis.service';

/**
 * Auth Module
 * Configures Passport with JWT strategies and token management
 */
@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, JwtRefreshStrategy, TokenService, RedisService],
  exports: [PassportModule, JwtStrategy, TokenService],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { TokenService } from './token.service';
import { AuthController } from './auth.controller';
import { RedisModule } from '../redis/redis.module';
import { RedisService } from '../redis/redis.service';
import { GrpcModule } from '../grpc/grpc.module';

/**
 * Auth Module
 * Configures Passport with JWT strategies, token management, and gRPC client
 */
@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    RedisModule,
    GrpcModule,
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, JwtRefreshStrategy, TokenService, RedisService],
  exports: [PassportModule, JwtStrategy, TokenService],
})
export class AuthModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { jwtConfig } from './jwt.config';
import { redisConfig } from './redis.config';
import { rabbitmqConfig } from './rabbitmq.config';
import { grpcConfig } from './grpc.config';

/**
 * Configuration validation schema using Joi
 */
const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),

  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required().min(32),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_ACCESS_TOKEN_TTL: Joi.number().default(900),
  REDIS_REFRESH_TOKEN_TTL: Joi.number().default(604800),
  REDIS_BLACKLIST_TTL: Joi.number().default(86400),

  // RabbitMQ
  RABBITMQ_URL: Joi.string().default('amqp://guest:guest@localhost:5672'),

  // gRPC
  GRPC_AUTH_URL: Joi.string().default('localhost:9090'),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        rabbitmqConfig,
        grpcConfig,
      ],
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
  ],
})
export class AppConfigModule {}

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  GrpcExceptionFilter,
  AllExceptionsFilter,
} from './common/filters/grpc-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

/**
 * Bootstrap the NestJS Gateway Application
 * Using FastifyAdapter for high performance
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // =========================================================
  // 1. Create Fastify Application
  // =========================================================
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false, // Use NestJS logger instead of Fastify's
    }),
    {
      bufferLogs: true, // Buffer logs until logger is ready
    },
  );

  // =========================================================
  // 2. Get Configuration
  // =========================================================
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');

  // =========================================================
  // 3. Global Prefix
  // =========================================================
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health', 'docs', 'docs-json'], // Exclude health check & swagger from prefix
  });

  // =========================================================
  // 4. Global Exception Filters
  // Order matters: More specific filters first, generic last
  // =========================================================
  app.useGlobalFilters(
    new GrpcExceptionFilter(), // Handle gRPC errors -> HTTP responses
    new AllExceptionsFilter(), // Catch-all for remaining exceptions
  );

  // =========================================================
  // 5. Global Interceptors
  // =========================================================
  app.useGlobalInterceptors(
    new LoggingInterceptor(), // Log all requests/responses
  );

  // =========================================================
  // 6. Validation Pipe (Global)
  // =========================================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      transform: true, // Transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw error for extra properties
      transformOptions: {
        enableImplicitConversion: true, // Auto-convert primitive types
      },
    }),
  );

  // =========================================================
  // 7. CORS Configuration
  // =========================================================
  app.enableCors({
    origin: nodeEnv === 'production' ? false : true, // Disable in production, configure properly
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // =========================================================
  // 8. Graceful Shutdown Hooks
  // =========================================================
  app.enableShutdownHooks();

  // =========================================================
  // 9. Swagger Documentation (Only in Development)
  // =========================================================
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NCKH Gateway API')
      .setDescription(
        'NestJS Gateway with FastifyAdapter + gRPC Worker Architecture',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Authentication & Authorization endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Problems', 'Problem management endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // Keep auth token across page refreshes
        docExpansion: 'none', // Collapse all by default
        filter: true, // Enable search filter
        showRequestDuration: true, // Show request duration
      },
    });

    logger.log(`📚 Swagger docs available at: /docs`);
  }

  // =========================================================
  // 10. Start Server
  // Note: Fastify requires '0.0.0.0' for Docker compatibility
  // =========================================================
  await app.listen(port, '0.0.0.0');

  const appUrl = await app.getUrl();
  logger.log(`🚀 Gateway running on: ${appUrl}`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`📡 API Prefix: /${apiPrefix}`);
}

// =========================================================
// Handle Uncaught Errors
// =========================================================
bootstrap().catch((error: Error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`❌ Failed to start application: ${error.message}`, error.stack);
  process.exit(1);
});

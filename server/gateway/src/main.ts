import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  // 1. Dùng FastifyAdapter thay vì mặc định
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const port = configService.get<number>('app.port', 3000);

  app.setGlobalPrefix(apiPrefix);

  // 2. Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 3. CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 4. Swagger (Vẫn chạy tốt trên Fastify)
  const config = new DocumentBuilder()
    .setTitle('NCKH Gateway')
    .setDescription('Fastify + gRPC Gateway')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // 5. Lắng nghe port
  // Lưu ý: Fastify cần '0.0.0.0' để chạy trong Docker
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Gateway (Fastify) running on: ${await app.getUrl()}`);
  console.log(`📚 Swagger docs: ${await app.getUrl()}/docs`);
}
bootstrap();

import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AuthGrpcService } from './auth-grpc.service';

/**
 * gRPC Client Module
 * Configures gRPC clients for communication with Go Workers
 */
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'AUTH_PACKAGE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            // Path: D:\nckh\server\gateway → ../../ → D:\nckh\shared\proto\auth.proto
            protoPath: join(process.cwd(), '../../shared/proto/auth.proto'),
            url: configService.get<string>('grpc.auth.url', 'localhost:9090'),
            loader: {
              keepCase: false, // Convert snake_case to camelCase
              longs: String,
              enums: String,
              defaults: true,
              oneofs: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [AuthGrpcService],
  exports: [AuthGrpcService],
})
export class GrpcModule {}

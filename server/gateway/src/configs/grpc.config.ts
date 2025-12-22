import { registerAs } from '@nestjs/config';
import { join } from 'path';

export const grpcConfig = registerAs('grpc', () => ({
  auth: {
    package: 'auth',
    protoPath: join(__dirname, '../../../../shared/proto/auth.proto'),
    url: process.env.GRPC_AUTH_URL || 'localhost:9090',
    maxSendMessageLength: 1024 * 1024 * 10, // 10MB
    maxReceiveMessageLength: 1024 * 1024 * 10, // 10MB
  },
}));

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Health Module
 *
 * Provides health check endpoints for:
 * - Load balancer health probes
 * - Kubernetes liveness/readiness probes
 * - Monitoring and observability
 *
 * All endpoints are public and do not require authentication.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}

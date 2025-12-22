import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorator';

/**
 * Health Check Response DTO
 */
interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

/**
 * Detailed Health Check Response
 */
interface DetailedHealthResponse extends HealthResponse {
  services: {
    gateway: ServiceStatus;
    redis?: ServiceStatus;
    grpcWorker?: ServiceStatus;
    database?: ServiceStatus;
  };
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
}

/**
 * Service Status
 */
interface ServiceStatus {
  status: 'up' | 'down' | 'unknown';
  latency?: number;
  message?: string;
}

/**
 * Health Check Controller
 *
 * Provides health check endpoints for:
 * - Load balancer health probes
 * - Kubernetes liveness/readiness probes
 * - Monitoring systems
 *
 * All endpoints are public (no authentication required).
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly startTime: number;
  private readonly version: string;
  private readonly environment: string;

  constructor() {
    this.startTime = Date.now();
    this.version = process.env.npm_package_version || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Basic Health Check
   *
   * Used by load balancers and simple health probes.
   * Returns minimal information for quick checks.
   *
   * @returns Basic health status
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-12-23T00:00:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'development' },
      },
    },
  })
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: this.getUptimeSeconds(),
      version: this.version,
      environment: this.environment,
    };
  }

  /**
   * Liveness Probe
   *
   * Used by Kubernetes to determine if the application is alive.
   * A failing liveness probe will cause the container to restart.
   *
   * @returns Simple status for liveness check
   */
  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
  getLiveness(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * Readiness Probe
   *
   * Used by Kubernetes to determine if the application is ready
   * to receive traffic. A failing readiness probe will remove
   * the pod from service endpoints.
   *
   * @returns Readiness status
   */
  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to receive traffic',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        ready: { type: 'boolean', example: true },
      },
    },
  })
  getReadiness(): { status: string; ready: boolean } {
    // TODO: Add actual readiness checks (Redis connected, gRPC available, etc.)
    return {
      status: 'ok',
      ready: true,
    };
  }

  /**
   * Detailed Health Check
   *
   * Provides comprehensive health information including:
   * - Individual service statuses
   * - Memory usage
   * - Uptime
   *
   * Useful for debugging and monitoring dashboards.
   *
   * @returns Detailed health information
   */
  @Get('details')
  @Public()
  @ApiOperation({ summary: 'Detailed health check with service statuses' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
  })
  async getDetailedHealth(): Promise<DetailedHealthResponse> {
    const memoryUsage = process.memoryUsage();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: this.getUptimeSeconds(),
      version: this.version,
      environment: this.environment,
      services: {
        gateway: {
          status: 'up',
          message: 'NestJS Gateway is running',
        },
        // TODO: Add actual service health checks
        // redis: await this.checkRedisHealth(),
        // grpcWorker: await this.checkGrpcHealth(),
        // database: await this.checkDatabaseHealth(),
      },
      memory: {
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        rss: this.formatBytes(memoryUsage.rss),
      },
    };
  }

  /**
   * Calculate uptime in seconds
   */
  private getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

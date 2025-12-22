import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Request User Interface
 */
interface RequestUser {
  id: string;
  email?: string;
}

/**
 * Logging Interceptor
 *
 * Intercepts all incoming HTTP requests and logs:
 * - Incoming: HTTP Method, URL, User ID (if authenticated)
 * - Outgoing: Status Code, Execution Time (ms)
 *
 * Uses NestJS Logger for consistent logging format.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only handle HTTP context
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    // Extract request information
    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] || 'Unknown';
    const user = request['user'] as RequestUser | undefined;
    const userId = user?.id || 'anonymous';

    // Generate unique request ID for tracing
    const requestId = this.generateRequestId();

    // Record start time
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(
      `[${requestId}] ➡️  ${method} ${url} | User: ${userId} | IP: ${ip}`,
    );

    // Handle response
    return next.handle().pipe(
      tap({
        next: () => {
          // Success response
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logResponse(requestId, method, url, statusCode, duration);
        },
        error: (error: Error) => {
          // Error response
          const duration = Date.now() - startTime;
          const statusCode = this.extractStatusCode(error);

          this.logResponse(
            requestId,
            method,
            url,
            statusCode,
            duration,
            error.message,
          );
        },
      }),
    );
  }

  /**
   * Log outgoing response with color-coded status
   */
  private logResponse(
    requestId: string,
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    errorMessage?: string,
  ): void {
    const statusEmoji = this.getStatusEmoji(statusCode);
    const durationStr = `${duration}ms`;

    if (errorMessage) {
      this.logger.warn(
        `[${requestId}] ${statusEmoji} ${method} ${url} | ${statusCode} | ${durationStr} | Error: ${errorMessage}`,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `[${requestId}] ${statusEmoji} ${method} ${url} | ${statusCode} | ${durationStr}`,
      );
    } else {
      this.logger.log(
        `[${requestId}] ${statusEmoji} ${method} ${url} | ${statusCode} | ${durationStr}`,
      );
    }
  }

  /**
   * Get emoji based on HTTP status code
   */
  private getStatusEmoji(statusCode: number): string {
    if (statusCode >= 500) return '❌'; // Server error
    if (statusCode >= 400) return '⚠️'; // Client error
    if (statusCode >= 300) return '↪️'; // Redirect
    if (statusCode >= 200) return '✅'; // Success
    return '❓'; // Unknown
  }

  /**
   * Extract HTTP status code from error
   */
  private extractStatusCode(error: unknown): number {
    if (error && typeof error === 'object') {
      // HttpException
      if ('getStatus' in error && typeof error.getStatus === 'function') {
        return (error as { getStatus: () => number }).getStatus();
      }
      // RpcException with code
      if ('code' in error && typeof error.code === 'number') {
        return 500; // gRPC errors will be transformed by GrpcExceptionFilter
      }
    }
    return 500;
  }

  /**
   * Generate short unique request ID for tracing
   */
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}

/**
 * Performance Interceptor
 *
 * Logs slow requests that exceed the threshold.
 * Useful for identifying performance bottlenecks.
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');
  private readonly slowThresholdMs: number;

  constructor(slowThresholdMs = 1000) {
    this.slowThresholdMs = slowThresholdMs;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        if (duration > this.slowThresholdMs) {
          this.logger.warn(
            `🐢 Slow Request: ${method} ${url} took ${duration}ms (threshold: ${this.slowThresholdMs}ms)`,
          );
        }
      }),
    );
  }
}

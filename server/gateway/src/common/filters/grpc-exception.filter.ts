import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { FastifyReply } from 'fastify';
import { status as GrpcStatus } from '@grpc/grpc-js';

/**
 * Standard error response format
 */
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path?: string;
}

/**
 * gRPC Error Details structure
 */
interface GrpcErrorDetails {
  code?: number;
  details?: string;
  message?: string;
}

/**
 * Mapping from gRPC Status Codes to HTTP Status Codes
 * @see https://grpc.github.io/grpc/core/md_doc_statuscodes.html
 */
const GRPC_TO_HTTP_STATUS: Record<number, number> = {
  [GrpcStatus.OK]: HttpStatus.OK, // 0 -> 200
  [GrpcStatus.CANCELLED]: HttpStatus.REQUEST_TIMEOUT, // 1 -> 408
  [GrpcStatus.UNKNOWN]: HttpStatus.INTERNAL_SERVER_ERROR, // 2 -> 500
  [GrpcStatus.INVALID_ARGUMENT]: HttpStatus.BAD_REQUEST, // 3 -> 400
  [GrpcStatus.DEADLINE_EXCEEDED]: HttpStatus.GATEWAY_TIMEOUT, // 4 -> 504
  [GrpcStatus.NOT_FOUND]: HttpStatus.NOT_FOUND, // 5 -> 404
  [GrpcStatus.ALREADY_EXISTS]: HttpStatus.CONFLICT, // 6 -> 409
  [GrpcStatus.PERMISSION_DENIED]: HttpStatus.FORBIDDEN, // 7 -> 403
  [GrpcStatus.RESOURCE_EXHAUSTED]: HttpStatus.TOO_MANY_REQUESTS, // 8 -> 429
  [GrpcStatus.FAILED_PRECONDITION]: HttpStatus.PRECONDITION_FAILED, // 9 -> 412
  [GrpcStatus.ABORTED]: HttpStatus.CONFLICT, // 10 -> 409
  [GrpcStatus.OUT_OF_RANGE]: HttpStatus.BAD_REQUEST, // 11 -> 400
  [GrpcStatus.UNIMPLEMENTED]: HttpStatus.NOT_IMPLEMENTED, // 12 -> 501
  [GrpcStatus.INTERNAL]: HttpStatus.INTERNAL_SERVER_ERROR, // 13 -> 500
  [GrpcStatus.UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE, // 14 -> 503
  [GrpcStatus.DATA_LOSS]: HttpStatus.INTERNAL_SERVER_ERROR, // 15 -> 500
  [GrpcStatus.UNAUTHENTICATED]: HttpStatus.UNAUTHORIZED, // 16 -> 401
};

/**
 * Human-readable error names for HTTP status codes
 */
const HTTP_STATUS_NAMES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.REQUEST_TIMEOUT]: 'Request Timeout',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.PRECONDITION_FAILED]: 'Precondition Failed',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  [HttpStatus.NOT_IMPLEMENTED]: 'Not Implemented',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
  [HttpStatus.GATEWAY_TIMEOUT]: 'Gateway Timeout',
};

/**
 * gRPC Exception Filter
 *
 * Catches exceptions from gRPC Client calls and converts them
 * to appropriate HTTP responses for REST clients.
 *
 * Works with Fastify adapter.
 */
@Catch(RpcException)
export class GrpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GrpcExceptionFilter.name);

  catch(exception: RpcException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest();

    // Extract error details from RpcException
    const error = exception.getError() as GrpcErrorDetails | string;

    let grpcCode: number = GrpcStatus.UNKNOWN;
    let message: string = 'An unexpected error occurred';

    if (typeof error === 'object' && error !== null) {
      grpcCode = error.code ?? GrpcStatus.UNKNOWN;
      message = error.details || error.message || message;
    } else if (typeof error === 'string') {
      message = error;
    }

    // Map gRPC status to HTTP status
    const httpStatus =
      GRPC_TO_HTTP_STATUS[grpcCode] ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const errorName = HTTP_STATUS_NAMES[httpStatus] ?? 'Internal Server Error';

    // Build error response
    const errorResponse: ErrorResponse = {
      statusCode: httpStatus,
      message: message,
      error: errorName,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log the error with context
    this.logger.error(
      `gRPC Error [${GrpcStatus[grpcCode] || grpcCode}] -> HTTP ${httpStatus}: ${message}`,
      {
        grpcCode,
        httpStatus,
        path: request.url,
        method: request.method,
      },
    );

    // Send response using Fastify
    response.status(httpStatus).send(errorResponse);
  }
}

/**
 * Generic Exception Filter for all other exceptions
 * Catches any exception not caught by more specific filters
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Handle different exception types
    if (exception instanceof Error) {
      message = exception.message;

      // Check if it has a status property (like HttpException)
      if (
        'getStatus' in exception &&
        typeof exception.getStatus === 'function'
      ) {
        httpStatus = (exception as { getStatus: () => number }).getStatus();
      }

      // Check for response property (HttpException)
      if (
        'getResponse' in exception &&
        typeof exception.getResponse === 'function'
      ) {
        const exceptionResponse = (
          exception as { getResponse: () => unknown }
        ).getResponse();
        if (
          typeof exceptionResponse === 'object' &&
          exceptionResponse !== null
        ) {
          const resp = exceptionResponse as Record<string, unknown>;
          message = (resp.message as string) || message;
        }
      }
    }

    const errorName = HTTP_STATUS_NAMES[httpStatus] ?? 'Internal Server Error';

    const errorResponse: ErrorResponse = {
      statusCode: httpStatus,
      message: Array.isArray(message) ? message.join(', ') : message,
      error: errorName,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log error
    if (httpStatus >= 500) {
      this.logger.error(
        `HTTP ${httpStatus}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`HTTP ${httpStatus}: ${message}`);
    }

    response.status(httpStatus).send(errorResponse);
  }
}

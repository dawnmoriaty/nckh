import {
  Injectable,
  OnModuleInit,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import type {
  AuthServiceClient,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from './interfaces/auth.interface';
import { AUTH_SERVICE_NAME } from './interfaces/auth.interface';

/**
 * Auth gRPC Service
 * Handles communication with Go Worker's AuthService
 */
@Injectable()
export class AuthGrpcService implements OnModuleInit {
  private readonly logger = new Logger(AuthGrpcService.name);
  private authService: AuthServiceClient;

  // Request timeout in milliseconds
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  constructor(@Inject('AUTH_PACKAGE') private readonly client: ClientGrpc) {}

  /**
   * Initialize gRPC service client on module init
   */
  onModuleInit(): void {
    this.authService =
      this.client.getService<AuthServiceClient>(AUTH_SERVICE_NAME);
    this.logger.log('✅ Auth gRPC client initialized');
  }

  /**
   * Register new user via gRPC
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    this.logger.debug(`Registering user: ${request.email}`);

    try {
      const response = await firstValueFrom(
        this.authService.register(request).pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((error) => {
            this.handleGrpcError(error, 'Register');
            throw error;
          }),
        ),
      );

      this.logger.debug(`Register response: ${JSON.stringify(response)}`);
      return response;
    } catch (error) {
      this.handleGrpcError(error, 'Register');
      throw error;
    }
  }

  /**
   * Login user via gRPC
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    this.logger.debug(`Login attempt for: ${request.username}`);

    try {
      const response = await firstValueFrom(
        this.authService.login(request).pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((error) => {
            this.handleGrpcError(error, 'Login');
            throw error;
          }),
        ),
      );

      this.logger.debug(`Login successful for: ${request.username}`);
      return response;
    } catch (error) {
      this.handleGrpcError(error, 'Login');
      throw error;
    }
  }

  /**
   * Refresh token via gRPC
   */
  async refreshToken(
    request: RefreshTokenRequest,
  ): Promise<RefreshTokenResponse> {
    this.logger.debug('Refreshing token');

    try {
      const response = await firstValueFrom(
        this.authService.refreshToken(request).pipe(
          timeout(this.REQUEST_TIMEOUT),
          catchError((error) => {
            this.handleGrpcError(error, 'RefreshToken');
            throw error;
          }),
        ),
      );

      return response;
    } catch (error) {
      this.handleGrpcError(error, 'RefreshToken');
      throw error;
    }
  }

  /**
   * Handle gRPC errors and convert to HTTP exceptions
   */
  private handleGrpcError(error: unknown, method: string): never {
    const grpcError = error as {
      code?: number;
      details?: string;
      message?: string;
    };

    this.logger.error(
      `gRPC ${method} error: ${grpcError.message || grpcError.details}`,
    );

    // Map gRPC status codes to HTTP status codes
    const statusMap: Record<number, HttpStatus> = {
      0: HttpStatus.OK, // OK
      1: HttpStatus.INTERNAL_SERVER_ERROR, // CANCELLED
      2: HttpStatus.INTERNAL_SERVER_ERROR, // UNKNOWN
      3: HttpStatus.BAD_REQUEST, // INVALID_ARGUMENT
      4: HttpStatus.GATEWAY_TIMEOUT, // DEADLINE_EXCEEDED
      5: HttpStatus.NOT_FOUND, // NOT_FOUND
      6: HttpStatus.CONFLICT, // ALREADY_EXISTS
      7: HttpStatus.FORBIDDEN, // PERMISSION_DENIED
      8: HttpStatus.TOO_MANY_REQUESTS, // RESOURCE_EXHAUSTED
      9: HttpStatus.BAD_REQUEST, // FAILED_PRECONDITION
      10: HttpStatus.CONFLICT, // ABORTED
      11: HttpStatus.BAD_REQUEST, // OUT_OF_RANGE
      12: HttpStatus.NOT_IMPLEMENTED, // UNIMPLEMENTED
      13: HttpStatus.INTERNAL_SERVER_ERROR, // INTERNAL
      14: HttpStatus.SERVICE_UNAVAILABLE, // UNAVAILABLE
      15: HttpStatus.INTERNAL_SERVER_ERROR, // DATA_LOSS
      16: HttpStatus.UNAUTHORIZED, // UNAUTHENTICATED
    };

    const httpStatus =
      statusMap[grpcError.code ?? 13] || HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      grpcError.details || grpcError.message || 'gRPC call failed';

    throw new HttpException(
      {
        statusCode: httpStatus,
        message,
        error: `gRPC ${method} failed`,
      },
      httpStatus,
    );
  }
}

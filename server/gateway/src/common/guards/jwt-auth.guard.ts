import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../constants/permissions.constant';

interface JwtErrorInfo {
  name?: string;
  message?: string;
}

/**
 * JWT Authentication Guard
 * Extends Passport's AuthGuard to handle JWT validation
 * Supports @Public() decorator to bypass authentication
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determines if the route can be activated
   * Checks for @Public() decorator first, then validates JWT
   */
  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Proceed with JWT validation
    return super.canActivate(context);
  }

  /**
   * Handle request after Passport validation
   * Throws UnauthorizedException if JWT is invalid or missing
   */
  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser,
    info: JwtErrorInfo,
  ): TUser {
    if (err || !user) {
      const message = this.getErrorMessage(info);
      throw new UnauthorizedException(message);
    }
    return user;
  }

  /**
   * Extract meaningful error message from Passport info
   */
  private getErrorMessage(info: JwtErrorInfo): string {
    if (info?.name === 'TokenExpiredError') {
      return 'Token has expired';
    }
    if (info?.name === 'JsonWebTokenError') {
      return 'Invalid token';
    }
    if (info?.message) {
      return info.message;
    }
    return 'Unauthorized access';
  }
}

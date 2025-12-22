import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestUser } from '../../modules/auth/strategies/jwt.strategy';

/**
 * Request interface for type-safe access
 */
interface AuthenticatedRequest {
  user?: RequestUser;
}

/**
 * @CurrentUser Decorator
 * Extracts the user object from the request (set by JwtStrategy)
 *
 * Usage:
 * @Get('profile')
 * getProfile(@CurrentUser() user: RequestUser) {
 *   return user;
 * }
 *
 * @Get('profile')
 * getProfile(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // If specific property requested, return only that
    if (data && user) {
      return user[data];
    }

    // Return full user object
    return user;
  },
);

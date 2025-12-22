import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import {
  Action,
  Resource,
  RESOURCE_KEY,
  ACTION_KEY,
  IS_PUBLIC_KEY,
} from '../constants/permissions.constant';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';

// ========================================================
// @SetResource Decorator
// Attach to Controller class to define the resource being protected
// ========================================================
export const SetResource = (resource: Resource) =>
  SetMetadata(RESOURCE_KEY, resource);

// ========================================================
// @SetAction Decorator
// Attach to route handlers to define required action
// If not set, the guard will infer from HTTP method
// ========================================================
export const SetAction = (action: Action) => SetMetadata(ACTION_KEY, action);

// ========================================================
// @Public Decorator
// Mark routes as public (bypass auth & permission checks)
// ========================================================
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ========================================================
// @Auth Decorator (Combined)
// Combines JwtAuthGuard + PermissionGuard for convenience
// Usage: @Auth(Resource.USERS, Action.CREATE)
// ========================================================
export const Auth = (resource?: Resource, action?: Action) => {
  const decorators: Array<
    ClassDecorator | MethodDecorator | PropertyDecorator
  > = [UseGuards(JwtAuthGuard, PermissionGuard)];

  if (resource) {
    decorators.push(SetMetadata(RESOURCE_KEY, resource));
  }

  if (action) {
    decorators.push(SetMetadata(ACTION_KEY, action));
  }

  return applyDecorators(...decorators);
};

// ========================================================
// @RequirePermissions Decorator
// Explicit permission requirement for specific route
// Usage: @RequirePermissions('students:READ', 'students:EXPORT')
// ========================================================
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  Action,
  Resource,
  RESOURCE_KEY,
  ACTION_KEY,
  IS_PUBLIC_KEY,
  HTTP_METHOD_ACTION_MAP,
} from '../constants/permissions.constant';

/**
 * User payload structure from JWT
 */
interface JwtUserPayload {
  sub: string; // User ID
  email: string;
  username: string;
  roleId: string;
  permissions: string[]; // Format: ["resource_code:ACTION", ...]
}

/**
 * Request interface for Fastify with user payload
 */
interface AuthenticatedRequest {
  user?: JwtUserPayload;
  method: string;
}

/**
 * Permission Guard for RBAC
 * Validates user permissions against required resource:action pairs
 * Works with Fastify adapter
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Main guard logic
   * Returns true if user has required permissions
   */
  canActivate(context: ExecutionContext): boolean {
    // 1. Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 2. Get the request (Fastify compatible)
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // 3. No user = unauthorized (should be caught by JwtAuthGuard first)
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // 4. Get resource metadata (from controller class)
    const resource = this.reflector.getAllAndOverride<Resource>(RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 5. If no resource defined, allow access (no RBAC required)
    if (!resource) {
      return true;
    }

    // 6. Get action metadata (from route handler) or infer from HTTP method
    const action = this.getRequiredAction(context);

    // 7. Construct required permission string
    const requiredPermission = this.buildPermissionString(resource, action);

    // 8. Check if user has the required permission
    const hasPermission = this.checkPermission(
      user.permissions,
      requiredPermission,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permission: ${requiredPermission}`,
      );
    }

    return true;
  }

  /**
   * Get the required action from decorator or infer from HTTP method
   */
  private getRequiredAction(context: ExecutionContext): Action {
    // First, check for explicit @Action decorator
    const explicitAction = this.reflector.getAllAndOverride<Action>(
      ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (explicitAction) {
      return explicitAction;
    }

    // Infer from HTTP method
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = request.method.toUpperCase();

    const inferredAction = HTTP_METHOD_ACTION_MAP[method];

    if (!inferredAction) {
      // Default to READ if method is not mapped
      return Action.READ;
    }

    return inferredAction;
  }

  /**
   * Build permission string in format "resource_code:ACTION"
   */
  private buildPermissionString(resource: Resource, action: Action): string {
    return `${resource}:${action}`;
  }

  /**
   * Check if user has the required permission
   * Supports wildcard permissions (e.g., "students:*" or "*:READ")
   */
  private checkPermission(
    userPermissions: string[] | undefined,
    requiredPermission: string,
  ): boolean {
    if (!userPermissions || userPermissions.length === 0) {
      return false;
    }

    const [requiredResource, requiredAction] = requiredPermission.split(':');

    return userPermissions.some((permission) => {
      const [permResource, permAction] = permission.split(':');

      // Exact match
      if (permission === requiredPermission) {
        return true;
      }

      // Wildcard resource (super admin): *:ACTION or *:*
      if (permResource === '*') {
        return permAction === '*' || permAction === requiredAction;
      }

      // Wildcard action: resource:*
      if (permResource === requiredResource && permAction === '*') {
        return true;
      }

      return false;
    });
  }
}

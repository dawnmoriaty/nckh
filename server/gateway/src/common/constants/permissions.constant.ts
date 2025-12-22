/**
 * Permission Constants for RBAC System
 * These enums define the available actions and resources for permission control.
 */

// ========================================================
// Action Enum: Defines all possible actions on resources
// ========================================================
export enum Action {
  READ = 'READ',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
}

// ========================================================
// Resource Enum: Defines all protected resources in the system
// Must match the `code` column in the `resources` table
// ========================================================
export enum Resource {
  // Auth & RBAC
  USERS = 'users',
  ROLES = 'roles',
  PERMISSIONS = 'permissions',
  RESOURCES = 'resources',

  // Training Domain
  TOPICS = 'topics',
  CLASSES = 'classes',
  ENROLLMENTS = 'enrollments',

  // Grading Domain
  PROBLEMS = 'problems',
  ASSIGNMENTS = 'assignments',
  SUBMISSIONS = 'submissions',
}

// ========================================================
// HTTP Method to Action Mapping
// Used when @Action decorator is not explicitly set
// ========================================================
export const HTTP_METHOD_ACTION_MAP: Record<string, Action> = {
  GET: Action.READ,
  POST: Action.CREATE,
  PUT: Action.UPDATE,
  PATCH: Action.UPDATE,
  DELETE: Action.DELETE,
};

// ========================================================
// Metadata Keys for Reflector
// ========================================================
export const RESOURCE_KEY = 'resource';
export const ACTION_KEY = 'action';
export const IS_PUBLIC_KEY = 'isPublic';

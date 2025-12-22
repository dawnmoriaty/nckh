/**
 * TypeScript interfaces generated from auth.proto
 * These interfaces match the Protobuf definitions for type safety
 */

// =========================================================
// Service Interface
// =========================================================

import { Observable } from 'rxjs';

export interface AuthServiceClient {
  register(request: RegisterRequest): Observable<RegisterResponse>;
  login(request: LoginRequest): Observable<LoginResponse>;
  refreshToken(request: RefreshTokenRequest): Observable<RefreshTokenResponse>;
  validateToken(
    request: ValidateTokenRequest,
  ): Observable<ValidateTokenResponse>;
}

// =========================================================
// Request Interfaces
// =========================================================

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ValidateTokenRequest {
  accessToken: string;
}

// =========================================================
// Response Interfaces
// =========================================================

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  message: string;
  user?: User;
}

// =========================================================
// Shared Interfaces
// =========================================================

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  roleId?: string;
  roleName?: string;
  roleCode?: string;
  permissions?: string[];
}

// =========================================================
// gRPC Package Constants
// =========================================================

export const AUTH_PACKAGE_NAME = 'auth';
export const AUTH_SERVICE_NAME = 'AuthService';

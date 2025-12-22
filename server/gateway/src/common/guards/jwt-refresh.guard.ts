import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard for Refresh Token validation
 * Use with routes that accept refresh tokens
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guards every platform-admin route. Uses the scoped platform JWT, which
 * player tokens can never satisfy (and vice versa — JwtStrategy rejects
 * any token carrying a scope).
 */
@Injectable()
export class PlatformGuard extends AuthGuard('platform-jwt') {}

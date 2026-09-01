import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Player JWT auth that never rejects. `req.user` is `{ userId }` when a valid
 * bearer is present and `undefined` otherwise — used by the club-setup
 * completion route, which is public for a brand-new account but needs the
 * caller's identity when an account already exists for the request email.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      /* no / invalid token — proceed unauthenticated */
    }
    return true;
  }

  handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
    return user ?? (undefined as TUser);
  }
}

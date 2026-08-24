import { SetMetadata } from '@nestjs/common';
import { ClubRole } from '@prisma/client';

export const CLUB_ROLES_KEY = 'clubRoles';

/**
 * Only OWNER/ADMIN get real permission differentiation this phase (see
 * PROGRESS.md) — every guarded route accepts one or both, never a narrower
 * role, even though `ClubRole` has all 6 values so Roles & Permissions can
 * assign the rest for real.
 */
export const RequireClubRole = (...roles: ClubRole[]) =>
  SetMetadata(CLUB_ROLES_KEY, roles);

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { CLUB_ROLES_KEY } from '../decorators/require-club-role.decorator';
import { ClubMembershipStatus } from '@prisma/client';

/**
 * For routes with a literal `:clubId` route param only (clubs, members,
 * court/announcement/report creation under a club). Resource-nested routes
 * (a league/fixture/result id, not a club id) resolve their owning
 * club first and then call `ClubAuthService.assertRole` directly from the
 * service method instead — see `club-auth.service.ts`.
 */
@Injectable()
export class ClubMembershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>(
      CLUB_ROLES_KEY,
      context.getHandler(),
    );
    const req = context.switchToHttp().getRequest<Request>();
    const userId = (req.user as { userId: string }).userId;
    const clubId: string | undefined = Array.isArray(req.params.clubId)
      ? req.params.clubId[0]
      : req.params.clubId;

    if (!clubId) {
      throw new ForbiddenException('No club context for this request.');
    }

    const membership = await this.prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });

    if (
      !membership ||
      membership.status !== ClubMembershipStatus.ACTIVE ||
      (roles?.length && !roles.includes(membership.role))
    ) {
      throw new ForbiddenException(
        "You don't have permission to manage this club.",
      );
    }

    // Attach it — the guard already paid for this query, and announcement
    // listing needs the role to decide whether drafts are visible.
    (req as Request & { clubMembership?: typeof membership }).clubMembership =
      membership;

    return true;
  }
}

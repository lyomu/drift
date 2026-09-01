import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClubMembershipStatus, ClubRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Shared by every club-admin write path. Routes with a literal `:clubId`
 * param use `ClubMembershipGuard` instead; this is for resource-nested
 * routes (a league/fixture/result id) that must first resolve their
 * owning club before there's a club to check membership against.
 */
@Injectable()
export class ClubAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async assertRole(
    userId: string,
    clubId: string,
    allowedRoles: ClubRole[],
  ): Promise<void> {
    const membership = await this.prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });
    if (
      !membership ||
      membership.status !== ClubMembershipStatus.ACTIVE ||
      !allowedRoles.includes(membership.role)
    ) {
      throw new ForbiddenException(
        "You don't have permission to manage this club.",
      );
    }
  }
}

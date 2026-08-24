import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClubMembershipStatus,
  ClubRole,
  ListingVerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { clubInclude, toClubProfile } from '../clubs/club.mapper';
import { CreateClubDto, UpdateClubDto } from './dto/club.dto';
import { InviteMemberDto, UpdateMembershipDto } from './dto/membership.dto';

@Injectable()
export class ClubsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Self-service creation (Doc 3 §10's ENTRY step) — the caller becomes
   * OWNER immediately, no invitation/approval step exists to gate this. */
  async createClub(userId: string, dto: CreateClubDto) {
    const club = await this.prisma.$transaction(async (tx) => {
      const created = await tx.club.create({
        data: {
          name: dto.name,
          description: dto.description,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });
      await tx.clubMembership.create({
        data: {
          clubId: created.id,
          userId,
          role: ClubRole.OWNER,
          status: ClubMembershipStatus.ACTIVE,
        },
      });
      return created;
    });

    return this.prisma.club.findUniqueOrThrow({
      where: { id: club.id },
      include: clubInclude,
    });
  }

  /** Every club the caller administers, with their role — what the
   * Next.js app uses post-login to route to Organization Setup vs
   * Dashboard, and (for now) assumes exactly one. */
  async myMemberships(userId: string) {
    const memberships = await this.prisma.clubMembership.findMany({
      where: { userId, status: ClubMembershipStatus.ACTIVE },
      include: { club: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      memberships: memberships.map((m) => ({
        clubId: m.clubId,
        clubName: m.club.name,
        role: m.role,
      })),
    };
  }

  async updateClub(clubId: string, dto: UpdateClubDto) {
    await this.prisma.club.update({
      where: { id: clubId },
      data: {
        name: dto.name,
        description: dto.description,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        phone: dto.phone,
        website: dto.website,
        amenities: dto.amenities,
        openingHoursNote: dto.openingHoursNote,
        photoUrls: dto.photoUrls,
      },
    });
    const club = await this.prisma.club.findUniqueOrThrow({
      where: { id: clubId },
      include: clubInclude,
    });
    return toClubProfile(club, null);
  }

  /** UNVERIFIED -> PENDING. Nothing consumes PENDING yet — Platform Admin
   * approval doesn't exist (documented open dependency, same shape as
   * every other unconsumed moderation queue this project has carried). */
  async submitVerificationRequest(clubId: string) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club not found.');
    }
    if (club.verificationStatus !== ListingVerificationStatus.UNVERIFIED) {
      throw new BadRequestException(
        'A verification request has already been submitted.',
      );
    }
    await this.prisma.club.update({
      where: { id: clubId },
      data: { verificationStatus: ListingVerificationStatus.PENDING },
    });
    return { verificationStatus: ListingVerificationStatus.PENDING };
  }

  // ------------------------------------------------------------- members

  async listMembers(clubId: string) {
    const members = await this.prisma.clubMembership.findMany({
      where: { clubId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return {
      members: members.map((m) => ({
        membershipId: m.id,
        userId: m.userId,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        email: m.user.email,
        role: m.role,
        status: m.status,
        joinedAt: m.createdAt,
      })),
    };
  }

  /** No email-delivery invite system exists (same dev-only gap as M3's
   * OTP) — this adds an already-registered Drift user straight into
   * ACTIVE membership rather than a pending invite a stranger accepts. */
  async inviteMember(clubId: string, dto: InviteMemberDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new NotFoundException(
        'No Drift account found for that email — they need to sign up first.',
      );
    }

    const existing = await this.prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId: user.id } },
    });
    if (existing) {
      throw new BadRequestException('This person is already a member.');
    }

    const membership = await this.prisma.clubMembership.create({
      data: {
        clubId,
        userId: user.id,
        role: dto.role,
        status: ClubMembershipStatus.ACTIVE,
      },
    });
    return { membershipId: membership.id, role: membership.role };
  }

  async updateMembership(
    clubId: string,
    membershipId: string,
    dto: UpdateMembershipDto,
  ) {
    const membership = await this.requireMembership(clubId, membershipId);
    if (
      membership.role === ClubRole.OWNER &&
      dto.role &&
      dto.role !== ClubRole.OWNER
    ) {
      const otherOwners = await this.prisma.clubMembership.count({
        where: { clubId, role: ClubRole.OWNER, id: { not: membershipId } },
      });
      if (otherOwners === 0) {
        throw new BadRequestException(
          'A club must always have at least one Owner.',
        );
      }
    }

    const updated = await this.prisma.clubMembership.update({
      where: { id: membershipId },
      data: { role: dto.role, status: dto.status },
    });

    // Approving a join request is just a status flip through this same
    // endpoint, so the "you're in" notification belongs here rather than in
    // a dedicated approve route.
    if (
      membership.status === ClubMembershipStatus.PENDING &&
      updated.status === ClubMembershipStatus.ACTIVE
    ) {
      const club = await this.prisma.club.findUnique({
        where: { id: clubId },
        select: { name: true },
      });
      await this.notifications.create(
        updated.userId,
        'CLUBS',
        `You've joined ${club?.name ?? 'the club'}`,
        'Announcements and the club feed are now open to you.',
        'CLUB',
        clubId,
      );
    }

    return {
      membershipId: updated.id,
      role: updated.role,
      status: updated.status,
    };
  }

  /**
   * Player-initiated join (Doc 2 §67 "Club Profile → Join / Follow"), the
   * mirror of `inviteMember`'s admin-initiated path. Lands as PENDING with
   * no elevated role; an admin approves it through the existing
   * `updateMembership` endpoint by setting status to ACTIVE.
   */
  async requestToJoin(clubId: string, userId: string) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club not found.');
    }

    const existing = await this.prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });
    if (existing) {
      throw new BadRequestException(
        existing.status === ClubMembershipStatus.PENDING
          ? 'Your request to join is already pending.'
          : 'You are already a member of this club.',
      );
    }

    const membership = await this.prisma.clubMembership.create({
      data: {
        clubId,
        userId,
        role: ClubRole.READ_ONLY,
        status: ClubMembershipStatus.PENDING,
      },
    });

    await this.notifyAdmins(clubId, userId, club.name);

    return { membershipId: membership.id, status: membership.status };
  }

  /** Withdraws a pending request, or leaves a club outright. */
  async leave(clubId: string, userId: string) {
    const membership = await this.prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('You are not a member of this club.');
    }
    // Same last-owner guard removeMember() enforces — a club must never be
    // left without an Owner, however the membership is being torn down.
    if (membership.role === ClubRole.OWNER) {
      const otherOwners = await this.prisma.clubMembership.count({
        where: { clubId, role: ClubRole.OWNER, id: { not: membership.id } },
      });
      if (otherOwners === 0) {
        throw new BadRequestException(
          'A club must always have at least one Owner.',
        );
      }
    }
    await this.prisma.clubMembership.delete({ where: { id: membership.id } });
    return { left: true };
  }

  private async notifyAdmins(
    clubId: string,
    requesterId: string,
    clubName: string,
  ) {
    const [requester, admins] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { firstName: true, lastName: true },
      }),
      this.prisma.clubMembership.findMany({
        where: {
          clubId,
          status: ClubMembershipStatus.ACTIVE,
          role: { in: [ClubRole.OWNER, ClubRole.ADMIN] },
        },
        select: { userId: true },
      }),
    ]);

    const name =
      [requester?.firstName, requester?.lastName].filter(Boolean).join(' ') ||
      'A player';

    await Promise.all(
      admins.map((a) =>
        this.notifications.create(
          a.userId,
          'CLUBS',
          `${name} asked to join ${clubName}`,
          'Review the request in Members.',
          'CLUB',
          clubId,
        ),
      ),
    );
  }

  async removeMember(clubId: string, membershipId: string) {
    const membership = await this.requireMembership(clubId, membershipId);
    if (membership.role === ClubRole.OWNER) {
      const otherOwners = await this.prisma.clubMembership.count({
        where: { clubId, role: ClubRole.OWNER, id: { not: membershipId } },
      });
      if (otherOwners === 0) {
        throw new BadRequestException(
          'A club must always have at least one Owner.',
        );
      }
    }
    await this.prisma.clubMembership.delete({ where: { id: membershipId } });
    return { removed: true };
  }

  private async requireMembership(clubId: string, membershipId: string) {
    const membership = await this.prisma.clubMembership.findUnique({
      where: { id: membershipId },
    });
    if (!membership || membership.clubId !== clubId) {
      throw new NotFoundException('Member not found.');
    }
    return membership;
  }
}

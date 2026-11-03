import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityMemberStatus,
  CommunityRole,
  CommunityStatus,
  CommunityType,
  ConversationType,
  Prisma,
  ReportStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingService } from '../messaging/messaging.service';
import { CompetitionsService } from '../competitions/competitions.service';
import { LaddersService } from '../competitions/ladders.service';
import { ResultsService } from '../matches/results.service';
import { demoScope } from '../common/demo-scope';
import { displayName } from '../common/display-name.util';
import {
  boundingBox,
  Coordinates,
  haversineKm,
} from '../common/distance.util';
import { msg, type LocalizedText } from '../common/i18n';
import {
  COMMUNITY_PHOTO_PATH,
  communityInclude,
  CommunityRecord,
  memberUserSelect,
  toCommunityDto,
  toMemberDto,
  ViewerMembership,
} from './community.mapper';
import {
  CreateClubCommunityDto,
  CreateCommunityDto,
  CreateCommunityLadderDto,
  CreateCommunityLeagueDto,
  ReportCommunityDto,
  SearchCommunitiesDto,
  UpdateCommunityDto,
} from './dto/community.dto';

const MANAGERS: CommunityRole[] = [CommunityRole.OWNER, CommunityRole.ADMIN];
const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_TAKE = 20;

/**
 * Communities (2026-11): player-created standing groups with their own
 * members, chat and competitions, managed WhatsApp-style by an owner and
 * admins, and reviewed by a platform admin before anyone else can find them.
 *
 * Membership is the source of truth for the group chat: every path that
 * makes someone ACTIVE adds them to the COMMUNITY conversation, and every
 * path that ends a membership removes them. The conversation itself only
 * exists once the community is approved.
 *
 * Methods named `*As` take an already-authorised actor. They back both the
 * player API (after `requireManager`) and the club-admin console (after the
 * club guard), so the rules live in one place.
 */
@Injectable()
export class CommunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly messaging: MessagingService,
    private readonly competitionsService: CompetitionsService,
    private readonly ladders: LaddersService,
    private readonly results: ResultsService,
  ) {}

  // ------------------------------------------------------------------ reads

  /** Approved communities, filtered by city / distance / type / name. */
  async search(viewerId: string, dto: SearchCommunitiesDto) {
    const scope = await demoScope(this.prisma, viewerId);
    const origin: Coordinates | null =
      dto.latitude !== undefined && dto.longitude !== undefined
        ? { latitude: dto.latitude, longitude: dto.longitude }
        : null;

    const where: Prisma.CommunityWhereInput = {
      status: CommunityStatus.APPROVED,
      ...scope.community,
      ...(dto.type ? { type: dto.type } : {}),
      ...(dto.city
        ? { city: { equals: dto.city.trim(), mode: 'insensitive' } }
        : {}),
      ...(dto.q ? { name: { contains: dto.q.trim(), mode: 'insensitive' } } : {}),
    };
    if (origin && dto.maxDistanceKm !== undefined) {
      const box = boundingBox(origin, dto.maxDistanceKm);
      where.latitude = { gte: box.minLatitude, lte: box.maxLatitude };
      where.longitude = { gte: box.minLongitude, lte: box.maxLongitude };
    }

    const candidates = await this.prisma.community.findMany({
      where,
      include: communityInclude,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const rows = candidates
      .map((community) => ({
        community,
        distanceKm: this.distanceTo(origin, community),
      }))
      .filter(
        (row) =>
          dto.maxDistanceKm === undefined ||
          !origin ||
          (row.distanceKm !== null && row.distanceKm <= dto.maxDistanceKm),
      );
    if (origin) {
      rows.sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    const skip = dto.skip ?? 0;
    const page = rows.slice(skip, skip + (dto.take ?? DEFAULT_TAKE));
    const memberships = await this.membershipsFor(
      viewerId,
      page.map((r) => r.community.id),
    );
    return {
      communities: page.map((r) =>
        toCommunityDto(
          r.community,
          memberships.get(r.community.id) ?? null,
          r.distanceKm,
        ),
      ),
      total: rows.length,
    };
  }

  /** Everything the viewer belongs to or has asked to join — including
   * their own communities still under review or rejected. */
  async mine(viewerId: string) {
    const rows = await this.prisma.communityMember.findMany({
      where: {
        userId: viewerId,
        community: {
          OR: [
            { status: { in: [CommunityStatus.APPROVED, CommunityStatus.SUSPENDED] } },
            // Under review / rejected: only the creator's own row exists.
            { createdById: viewerId },
          ],
        },
      },
      include: { community: { include: communityInclude } },
      orderBy: { updatedAt: 'desc' },
    });
    return {
      communities: rows.map((r) => toCommunityDto(r.community, r)),
    };
  }

  async detail(viewerId: string, communityId: string) {
    const { community, membership } = await this.loadVisible(
      viewerId,
      communityId,
    );
    return toCommunityDto(community, membership);
  }

  /** ACTIVE members for everyone who can see the community; owner/admins
   * also get pending requests. */
  async members(viewerId: string, communityId: string) {
    const { community, membership } = await this.loadVisible(
      viewerId,
      communityId,
    );
    const isManager =
      membership?.status === CommunityMemberStatus.ACTIVE &&
      MANAGERS.includes(membership.role);
    return this.memberLists(community.id, isManager);
  }

  async competitions(viewerId: string, communityId: string) {
    const { community } = await this.loadVisible(viewerId, communityId);
    const [leagues, ladders] = await Promise.all([
      this.competitionsService.listLeaguesForCommunity(community.id, viewerId),
      this.ladders.listForCommunity(community.id, viewerId),
    ]);
    return { leagues, ladders };
  }

  // ----------------------------------------------------------------- create

  async create(viewerId: string, dto: CreateCommunityDto) {
    const creator = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: {
        isDemo: true,
        tennisProfile: { select: { latitude: true, longitude: true } },
      },
    });
    if (!creator) throw new NotFoundException('User not found.');

    const hasCoords = dto.latitude !== undefined && dto.longitude !== undefined;
    const community = await this.prisma.community.create({
      data: {
        type: dto.type,
        name: dto.name.trim(),
        city: dto.city.trim(),
        latitude: hasCoords
          ? dto.latitude
          : (creator.tennisProfile?.latitude ?? null),
        longitude: hasCoords
          ? dto.longitude
          : (creator.tennisProfile?.longitude ?? null),
        frequency: dto.frequency,
        about: dto.about?.trim() || null,
        joinPolicy: dto.joinPolicy,
        createdById: viewerId,
        isDemo: creator.isDemo,
        members: {
          create: {
            userId: viewerId,
            role: CommunityRole.OWNER,
            status: CommunityMemberStatus.ACTIVE,
          },
        },
      },
      include: communityInclude,
    });
    return this.detailFor(viewerId, community);
  }

  /** The club's own community, created from club-admin by one of its
   * admins, who becomes the owner. Goes through platform review like any
   * other. */
  async createForClub(
    actorId: string,
    clubId: string,
    dto: CreateClubCommunityDto,
  ) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: {
        latitude: true,
        longitude: true,
        isDemo: true,
        community: { select: { id: true } },
      },
    });
    if (!club) throw new NotFoundException('Club not found.');
    if (club.community) {
      throw new BadRequestException('This club already has a community.');
    }
    const community = await this.prisma.community.create({
      data: {
        type: CommunityType.CLUB,
        name: dto.name.trim(),
        city: dto.city.trim(),
        latitude: club.latitude,
        longitude: club.longitude,
        frequency: dto.frequency,
        about: dto.about?.trim() || null,
        joinPolicy: dto.joinPolicy,
        clubId,
        createdById: actorId,
        isDemo: club.isDemo,
        members: {
          create: {
            userId: actorId,
            role: CommunityRole.OWNER,
            status: CommunityMemberStatus.ACTIVE,
          },
        },
      },
      include: communityInclude,
    });
    return this.detailFor(actorId, community);
  }

  /** The club's community for the club-admin page, or null. */
  async forClub(clubId: string) {
    const community = await this.prisma.community.findUnique({
      where: { clubId },
      include: communityInclude,
    });
    if (!community) return { community: null };
    const [lists, ownerRow] = await Promise.all([
      this.memberLists(community.id, true),
      this.prisma.communityMember.findFirst({
        where: { communityId: community.id, role: CommunityRole.OWNER },
        include: { user: memberUserSelect },
      }),
    ]);
    return {
      community: {
        ...toCommunityDto(community, null),
        // Club admins manage the community, so they see the review note.
        decisionNote: community.decisionNote,
        owner: ownerRow ? toMemberDto(ownerRow) : null,
      },
      ...lists,
    };
  }

  async clubCommunityId(clubId: string): Promise<string> {
    const community = await this.prisma.community.findUnique({
      where: { clubId },
      select: { id: true },
    });
    if (!community) {
      throw new NotFoundException('This club has no community yet.');
    }
    return community.id;
  }

  // ------------------------------------------------------------ settings

  async update(viewerId: string, communityId: string, dto: UpdateCommunityDto) {
    await this.requireManager(viewerId, communityId);
    return this.updateAs(viewerId, communityId, dto);
  }

  async updateAs(actorId: string, communityId: string, dto: UpdateCommunityDto) {
    const community = await this.prisma.community.update({
      where: { id: communityId },
      data: {
        name: dto.name?.trim(),
        city: dto.city?.trim(),
        frequency: dto.frequency,
        about: dto.about === undefined ? undefined : dto.about.trim() || null,
        joinPolicy: dto.joinPolicy,
      },
      include: communityInclude,
    });
    await this.audit(communityId, actorId, 'SETTINGS_UPDATED', null, { ...dto });
    return this.detailFor(actorId, community);
  }

  async uploadPhoto(
    viewerId: string,
    communityId: string,
    file: Express.Multer.File,
  ) {
    await this.requireManager(viewerId, communityId);
    return this.uploadPhotoAs(viewerId, communityId, file);
  }

  async uploadPhotoAs(
    actorId: string,
    communityId: string,
    file: Express.Multer.File,
  ) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported.');
    }
    const data = {
      filename: file.originalname,
      mimeType: file.mimetype,
      bytes: new Uint8Array(file.buffer),
    };
    await this.prisma.$transaction(async (tx) => {
      const asset = await tx.communityPhotoAsset.upsert({
        where: { communityId },
        create: { communityId, ...data },
        update: data,
        select: { id: true, updatedAt: true },
      });
      // Same cache-busting as profile photos: re-uploads keep the asset id.
      await tx.community.update({
        where: { id: communityId },
        data: {
          photoUrl: `${COMMUNITY_PHOTO_PATH}/${asset.id}?v=${asset.updatedAt.getTime()}`,
        },
      });
    });
    return this.detailFor(actorId, await this.loadCommunity(communityId));
  }

  async deletePhoto(viewerId: string, communityId: string) {
    await this.requireManager(viewerId, communityId);
    await this.prisma.$transaction(async (tx) => {
      await tx.communityPhotoAsset.deleteMany({ where: { communityId } });
      await tx.community.update({
        where: { id: communityId },
        data: { photoUrl: null },
      });
    });
    return this.detailFor(viewerId, await this.loadCommunity(communityId));
  }

  /** Bytes for the public media route; the asset id is an unguessable UUID. */
  async photoContent(assetId: string) {
    const asset = await this.prisma.communityPhotoAsset.findUnique({
      where: { id: assetId },
      select: { bytes: true, mimeType: true, filename: true },
    });
    if (!asset) throw new NotFoundException('Photo not found.');
    return asset;
  }

  // ---------------------------------------------------------- membership

  /** OPEN: in immediately. BY_REQUEST: a request the owner/admins review. */
  async join(viewerId: string, communityId: string) {
    const community = await this.loadCommunity(communityId);
    if (community.status !== CommunityStatus.APPROVED) {
      throw new BadRequestException('This community is not open to join.');
    }
    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { isDemo: true, firstName: true, lastName: true },
    });
    if (!viewer || (community.isDemo && !viewer.isDemo)) {
      throw new NotFoundException('Community not found.');
    }

    const existing = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: viewerId } },
    });
    if (existing) {
      throw new BadRequestException(
        existing.status === CommunityMemberStatus.ACTIVE
          ? "You're already a member."
          : 'Your request is already waiting for approval.',
      );
    }

    if (community.joinPolicy === 'OPEN') {
      await this.prisma.$transaction(async (tx) => {
        await tx.communityMember.create({
          data: {
            communityId,
            userId: viewerId,
            status: CommunityMemberStatus.ACTIVE,
          },
        });
        await this.addToChat(community, viewerId, tx);
      });
      await this.audit(communityId, viewerId, 'MEMBER_JOINED', viewerId);
    } else {
      await this.prisma.communityMember.create({
        data: {
          communityId,
          userId: viewerId,
          status: CommunityMemberStatus.REQUESTED,
        },
      });
      await this.notifyManagers(
        communityId,
        msg('community.joinRequest.title', {
          name: displayName(viewer),
          community: community.name,
        }),
        msg('community.joinRequest.body'),
      );
    }
    return this.detail(viewerId, communityId);
  }

  async cancelRequest(viewerId: string, communityId: string) {
    await this.prisma.communityMember.deleteMany({
      where: {
        communityId,
        userId: viewerId,
        status: CommunityMemberStatus.REQUESTED,
      },
    });
    return { cancelled: true };
  }

  /**
   * Leave. The owner must hand ownership over first, unless they're the
   * last member — then leaving closes the community, as in a group chat
   * whose last person walks out.
   */
  async leave(viewerId: string, communityId: string) {
    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: viewerId } },
    });
    if (!membership || membership.status !== CommunityMemberStatus.ACTIVE) {
      throw new BadRequestException("You're not a member of this community.");
    }
    if (membership.role === CommunityRole.OWNER) {
      const others = await this.prisma.communityMember.count({
        where: {
          communityId,
          status: CommunityMemberStatus.ACTIVE,
          userId: { not: viewerId },
        },
      });
      if (others > 0) {
        throw new BadRequestException(
          'Make someone else the owner before you leave.',
        );
      }
      await this.prisma.community.delete({ where: { id: communityId } });
      return { left: true, deleted: true };
    }
    await this.endMembership(communityId, viewerId);
    await this.audit(communityId, viewerId, 'MEMBER_LEFT', viewerId);
    return { left: true, deleted: false };
  }

  async approveRequest(viewerId: string, communityId: string, userId: string) {
    await this.requireManager(viewerId, communityId);
    return this.approveRequestAs(viewerId, communityId, userId);
  }

  async approveRequestAs(actorId: string, communityId: string, userId: string) {
    const community = await this.loadCommunity(communityId);
    const request = await this.requireRow(communityId, userId);
    if (request.status !== CommunityMemberStatus.REQUESTED) {
      throw new BadRequestException('There is no pending request to approve.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.communityMember.update({
        where: { id: request.id },
        data: { status: CommunityMemberStatus.ACTIVE },
      });
      await this.addToChat(community, userId, tx);
    });
    await this.audit(communityId, actorId, 'REQUEST_APPROVED', userId);
    await this.notify(
      userId,
      msg('community.requestApproved.title', { community: community.name }),
      msg('community.requestApproved.body'),
      communityId,
    );
    return { approved: true };
  }

  async declineRequest(viewerId: string, communityId: string, userId: string) {
    await this.requireManager(viewerId, communityId);
    return this.declineRequestAs(viewerId, communityId, userId);
  }

  async declineRequestAs(actorId: string, communityId: string, userId: string) {
    const community = await this.loadCommunity(communityId);
    const request = await this.requireRow(communityId, userId);
    if (request.status !== CommunityMemberStatus.REQUESTED) {
      throw new BadRequestException('There is no pending request to decline.');
    }
    await this.prisma.communityMember.delete({ where: { id: request.id } });
    await this.audit(communityId, actorId, 'REQUEST_DECLINED', userId);
    await this.notify(
      userId,
      msg('community.requestDeclined.title'),
      msg('community.requestDeclined.body', { community: community.name }),
      communityId,
    );
    return { declined: true };
  }

  /** Admins can remove members; only the owner can remove an admin; nobody
   * removes the owner. */
  async removeMember(viewerId: string, communityId: string, userId: string) {
    const actor = await this.requireManager(viewerId, communityId);
    const target = await this.requireRow(communityId, userId);
    if (target.role === CommunityRole.OWNER) {
      throw new ForbiddenException('The owner cannot be removed.');
    }
    if (
      target.role === CommunityRole.ADMIN &&
      actor.role !== CommunityRole.OWNER
    ) {
      throw new ForbiddenException('Only the owner can remove an admin.');
    }
    return this.removeMemberAs(viewerId, communityId, userId);
  }

  async removeMemberAs(actorId: string, communityId: string, userId: string) {
    const community = await this.loadCommunity(communityId);
    const target = await this.requireRow(communityId, userId);
    if (target.role === CommunityRole.OWNER) {
      throw new ForbiddenException('The owner cannot be removed.');
    }
    await this.endMembership(communityId, userId);
    await this.audit(communityId, actorId, 'MEMBER_REMOVED', userId);
    await this.notify(
      userId,
      msg('community.removed.title', { community: community.name }),
      msg('community.removed.body'),
      communityId,
    );
    return { removed: true };
  }

  async updateRole(
    viewerId: string,
    communityId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER',
  ) {
    const actor = await this.requireManager(viewerId, communityId);
    if (actor.role !== CommunityRole.OWNER) {
      throw new ForbiddenException('Only the owner can change roles.');
    }
    return this.updateRoleAs(viewerId, communityId, userId, role);
  }

  async updateRoleAs(
    actorId: string,
    communityId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER',
  ) {
    const community = await this.loadCommunity(communityId);
    const target = await this.requireRow(communityId, userId);
    if (target.status !== CommunityMemberStatus.ACTIVE) {
      throw new BadRequestException('Only members can be given a role.');
    }
    if (target.role === CommunityRole.OWNER) {
      throw new BadRequestException(
        "The owner's role changes by handing over ownership.",
      );
    }
    if (target.role === role) return { role };
    await this.prisma.communityMember.update({
      where: { id: target.id },
      data: { role },
    });
    await this.audit(communityId, actorId, 'ROLE_CHANGED', userId, { role });
    if (role === CommunityRole.ADMIN) {
      await this.notify(
        userId,
        msg('community.madeAdmin.title', { community: community.name }),
        msg('community.madeAdmin.body'),
        communityId,
      );
    }
    return { role };
  }

  /** The new owner must be an ACTIVE member; the old owner stays on as an
   * admin. */
  async transferOwnership(viewerId: string, communityId: string, userId: string) {
    const actor = await this.requireManager(viewerId, communityId);
    if (actor.role !== CommunityRole.OWNER) {
      throw new ForbiddenException('Only the owner can hand over ownership.');
    }
    if (userId === viewerId) {
      throw new BadRequestException('You already own this community.');
    }
    const community = await this.loadCommunity(communityId);
    const target = await this.requireRow(communityId, userId);
    if (target.status !== CommunityMemberStatus.ACTIVE) {
      throw new BadRequestException('Ownership can only go to a member.');
    }
    await this.prisma.$transaction([
      this.prisma.communityMember.update({
        where: { id: actor.id },
        data: { role: CommunityRole.ADMIN },
      }),
      this.prisma.communityMember.update({
        where: { id: target.id },
        data: { role: CommunityRole.OWNER },
      }),
    ]);
    await this.audit(communityId, viewerId, 'OWNERSHIP_TRANSFERRED', userId);
    await this.notify(
      userId,
      msg('community.ownershipTransferred.title', { community: community.name }),
      msg('community.ownershipTransferred.body'),
      communityId,
    );
    return { transferred: true };
  }

  async remove(viewerId: string, communityId: string) {
    const actor = await this.requireManager(viewerId, communityId);
    if (actor.role !== CommunityRole.OWNER) {
      throw new ForbiddenException('Only the owner can delete the community.');
    }
    await this.deleteWithNotice(communityId, viewerId);
    return { deleted: true };
  }

  /** Deletes and tells every other active member. Shared with the platform
   * admin's delete. */
  async deleteWithNotice(communityId: string, exceptUserId?: string) {
    const community = await this.loadCommunity(communityId);
    const members = await this.prisma.communityMember.findMany({
      where: {
        communityId,
        status: CommunityMemberStatus.ACTIVE,
        ...(exceptUserId ? { userId: { not: exceptUserId } } : {}),
      },
      select: { userId: true },
    });
    await this.prisma.community.delete({ where: { id: communityId } });
    // No related entity: the community is gone, so the tap has nowhere to go.
    await Promise.all(
      members.map((m) =>
        this.notifications.create(
          m.userId,
          'COMMUNITIES',
          msg('community.deleted.title', { community: community.name }),
          msg('community.deleted.body'),
        ),
      ),
    );
  }

  async setMuted(viewerId: string, communityId: string, muted: boolean) {
    const row = await this.requireRow(communityId, viewerId);
    if (row.status !== CommunityMemberStatus.ACTIVE) {
      throw new BadRequestException("You're not a member of this community.");
    }
    await this.prisma.communityMember.update({
      where: { id: row.id },
      data: { mutedAt: muted ? new Date() : null },
    });
    return { muted };
  }

  /** "Report community", optionally leaving it in the same step. */
  async report(viewerId: string, communityId: string, dto: ReportCommunityDto) {
    await this.loadVisible(viewerId, communityId);
    const existing = await this.prisma.communityReport.findFirst({
      where: {
        communityId,
        reporterId: viewerId,
        status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] },
      },
    });
    if (!existing) {
      await this.prisma.communityReport.create({
        data: {
          communityId,
          reporterId: viewerId,
          reason: dto.reason,
          notes: dto.notes?.trim() || null,
        },
      });
    }
    let left = false;
    if (dto.leave) {
      const row = await this.prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId: viewerId } },
      });
      if (row && row.role !== CommunityRole.OWNER) {
        await this.endMembership(communityId, viewerId);
        await this.audit(communityId, viewerId, 'MEMBER_LEFT', viewerId);
        left = true;
      }
    }
    return { reported: true, left };
  }

  // -------------------------------------------------------- competitions

  async createLadder(
    viewerId: string,
    communityId: string,
    dto: CreateCommunityLadderDto,
  ) {
    await this.requireManager(viewerId, communityId);
    const community = await this.requireApproved(communityId);
    const ladder = await this.ladders.createForCommunity(communityId, {
      name: dto.name.trim(),
      challengeRange: dto.challengeRange,
    });
    await this.audit(communityId, viewerId, 'COMPETITION_CREATED', null, {
      kind: 'LADDER',
      id: ladder.id,
    });
    await this.notifyMembers(
      communityId,
      viewerId,
      msg('community.newLadder.title', { community: community.name }),
      msg('community.newCompetition.body', { competition: ladder.name }),
    );
    return ladder;
  }

  async createLeague(
    viewerId: string,
    communityId: string,
    dto: CreateCommunityLeagueDto,
  ) {
    await this.requireManager(viewerId, communityId);
    const community = await this.requireApproved(communityId);
    const league = await this.competitionsService.createLeagueForCommunity(
      communityId,
      {
        name: dto.name.trim(),
        description: dto.description?.trim() || undefined,
        levelBand: dto.levelBand,
        registrationOpensAt: dto.registrationOpensAt,
        registrationClosesAt: dto.registrationClosesAt,
        startsAt: dto.startsAt,
        roundCount: dto.roundCount,
        roundIntervalMinutes: dto.roundIntervalDays * MINUTES_PER_DAY,
        capacity: dto.capacity,
      },
    );
    await this.audit(communityId, viewerId, 'COMPETITION_CREATED', null, {
      kind: 'LEAGUE',
      id: league.id,
    });
    await this.notifyMembers(
      communityId,
      viewerId,
      msg('community.newLeague.title', { community: community.name }),
      msg('community.newCompetition.body', { competition: league.name }),
    );
    return league;
  }

  async disputes(viewerId: string, communityId: string) {
    await this.requireManager(viewerId, communityId);
    return this.competitionsService.listDisputesForCommunity(communityId);
  }

  async resolveDispute(
    viewerId: string,
    communityId: string,
    fixtureId: string,
    ruling: 'SUBMITTED' | 'DISPUTANT',
  ) {
    await this.requireManager(viewerId, communityId);
    const owner = await this.competitionsService.fixtureCommunityId(fixtureId);
    if (owner !== communityId) {
      throw new NotFoundException('Fixture not found.');
    }
    const matchId = await this.competitionsService.fixtureMatchId(fixtureId);
    if (!matchId) {
      throw new NotFoundException('This fixture has no match to resolve.');
    }
    return this.results.adminResolveDispute(matchId, viewerId, ruling);
  }

  // --------------------------------------------------- platform review

  /**
   * Platform-admin decisions. The caller (platform-admin module) records the
   * admin audit entry; this applies the state change and its side effects.
   */
  async approve(adminId: string, communityId: string, note?: string) {
    const community = await this.loadCommunity(communityId);
    if (community.status !== CommunityStatus.PENDING) {
      throw new BadRequestException('Only a community under review can be approved.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.community.update({
        where: { id: communityId },
        data: {
          status: CommunityStatus.APPROVED,
          decisionNote: note?.trim() || null,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
      // The chat opens with approval, seeded with everyone already active
      // (the owner).
      const members = await tx.communityMember.findMany({
        where: { communityId, status: CommunityMemberStatus.ACTIVE },
        select: { userId: true },
      });
      await tx.conversation.create({
        data: {
          type: ConversationType.COMMUNITY,
          communityId,
          participants: {
            create: members.map((m) => ({ userId: m.userId })),
          },
        },
      });
    });
    await this.notify(
      community.createdById,
      msg('community.approved.title'),
      msg('community.approved.body', { community: community.name }),
      communityId,
    );
    return { status: CommunityStatus.APPROVED };
  }

  async reject(adminId: string, communityId: string, note?: string) {
    const community = await this.loadCommunity(communityId);
    if (community.status !== CommunityStatus.PENDING) {
      throw new BadRequestException('Only a community under review can be rejected.');
    }
    const trimmed = note?.trim() || null;
    await this.prisma.community.update({
      where: { id: communityId },
      data: {
        status: CommunityStatus.REJECTED,
        decisionNote: trimmed,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    await this.notify(
      community.createdById,
      msg('community.rejected.title'),
      trimmed
        ? msg('community.rejected.body', {
            community: community.name,
            note: trimmed,
          })
        : msg('community.rejectedNoNote.body', { community: community.name }),
      communityId,
    );
    return { status: CommunityStatus.REJECTED };
  }

  async suspend(adminId: string, communityId: string, note?: string) {
    const community = await this.loadCommunity(communityId);
    if (community.status !== CommunityStatus.APPROVED) {
      throw new BadRequestException('Only a live community can be suspended.');
    }
    await this.prisma.community.update({
      where: { id: communityId },
      data: {
        status: CommunityStatus.SUSPENDED,
        decisionNote: note?.trim() || null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    await this.notifyMembers(
      communityId,
      null,
      msg('community.suspended.title', { community: community.name }),
      msg('community.suspended.body'),
    );
    return { status: CommunityStatus.SUSPENDED };
  }

  async restore(adminId: string, communityId: string) {
    const community = await this.loadCommunity(communityId);
    if (community.status !== CommunityStatus.SUSPENDED) {
      throw new BadRequestException('Only a suspended community can be restored.');
    }
    await this.prisma.community.update({
      where: { id: communityId },
      data: {
        status: CommunityStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    await this.notifyMembers(
      communityId,
      null,
      msg('community.restored.title', { community: community.name }),
      msg('community.restored.body'),
    );
    return { status: CommunityStatus.APPROVED };
  }

  /** Platform-admin list/detail. Not demo-scoped: staff see everything. */
  async adminList(status?: CommunityStatus, q?: string) {
    const rows = await this.prisma.community.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q ? { name: { contains: q.trim(), mode: 'insensitive' } } : {}),
      },
      include: {
        ...communityInclude,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: {
          select: {
            members: { where: { status: CommunityMemberStatus.ACTIVE } },
            reports: { where: { status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return {
      communities: rows.map((c) => ({
        ...toCommunityDto(c, null),
        decisionNote: c.decisionNote,
        isDemo: c.isDemo,
        reviewedAt: c.reviewedAt,
        openReportCount: c._count.reports,
        createdBy: {
          id: c.createdBy.id,
          displayName: displayName(c.createdBy),
          email: c.createdBy.email,
        },
      })),
    };
  }

  async adminDetail(communityId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: {
        ...communityInclude,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            reporter: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            actor: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!community) throw new NotFoundException('Community not found.');
    const lists = await this.memberLists(communityId, true);
    return {
      community: {
        ...toCommunityDto(community, null),
        decisionNote: community.decisionNote,
        isDemo: community.isDemo,
        reviewedAt: community.reviewedAt,
        createdBy: {
          id: community.createdBy.id,
          displayName: displayName(community.createdBy),
          email: community.createdBy.email,
        },
      },
      ...lists,
      reports: community.reports.map((r) => ({
        id: r.id,
        reason: r.reason,
        notes: r.notes,
        status: r.status,
        priority: r.priority,
        createdAt: r.createdAt,
        reporter: { id: r.reporter.id, displayName: displayName(r.reporter) },
      })),
      auditLog: community.auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        targetUserId: a.targetUserId,
        details: a.details,
        createdAt: a.createdAt,
        actor: a.actor
          ? { id: a.actor.id, displayName: displayName(a.actor) }
          : null,
      })),
    };
  }

  // ------------------------------------------------------------- helpers

  /**
   * Loads a community the viewer may see: APPROVED for anyone (demo rules
   * apply), SUSPENDED for its members, PENDING/REJECTED for the creator
   * only. Everything else reads as not found.
   */
  private async loadVisible(viewerId: string, communityId: string) {
    const community = await this.loadCommunity(communityId);
    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: viewerId } },
      select: { role: true, status: true, mutedAt: true },
    });
    const visible = await (async () => {
      switch (community.status) {
        case CommunityStatus.APPROVED: {
          if (!community.isDemo) return true;
          const scope = await demoScope(this.prisma, viewerId);
          return scope.viewerIsDemo;
        }
        case CommunityStatus.SUSPENDED:
          return membership?.status === CommunityMemberStatus.ACTIVE;
        default:
          return community.createdById === viewerId;
      }
    })();
    if (!visible) throw new NotFoundException('Community not found.');
    return { community, membership };
  }

  private async loadCommunity(communityId: string): Promise<CommunityRecord> {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      include: communityInclude,
    });
    if (!community) throw new NotFoundException('Community not found.');
    return community;
  }

  private async requireApproved(communityId: string) {
    const community = await this.loadCommunity(communityId);
    if (community.status !== CommunityStatus.APPROVED) {
      throw new BadRequestException(
        'This community needs to be approved first.',
      );
    }
    return community;
  }

  /** The viewer's row, which must be an ACTIVE owner or admin. */
  private async requireManager(viewerId: string, communityId: string) {
    const row = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: viewerId } },
    });
    if (
      !row ||
      row.status !== CommunityMemberStatus.ACTIVE ||
      !MANAGERS.includes(row.role)
    ) {
      throw new ForbiddenException(
        'Only the owner or an admin can do that.',
      );
    }
    return row;
  }

  private async requireRow(communityId: string, userId: string) {
    const row = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (!row) throw new NotFoundException('Member not found.');
    return row;
  }

  private async detailFor(viewerId: string, community: CommunityRecord) {
    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId: viewerId } },
      select: { role: true, status: true, mutedAt: true },
    });
    return toCommunityDto(community, membership);
  }

  private async membershipsFor(
    viewerId: string,
    communityIds: string[],
  ): Promise<Map<string, ViewerMembership>> {
    if (communityIds.length === 0) return new Map();
    const rows = await this.prisma.communityMember.findMany({
      where: { userId: viewerId, communityId: { in: communityIds } },
      select: { communityId: true, role: true, status: true, mutedAt: true },
    });
    return new Map(rows.map((r) => [r.communityId, r]));
  }

  private async memberLists(communityId: string, includeRequests: boolean) {
    const rows = await this.prisma.communityMember.findMany({
      where: {
        communityId,
        ...(includeRequests
          ? {}
          : { status: CommunityMemberStatus.ACTIVE }),
      },
      include: { user: memberUserSelect },
      orderBy: { createdAt: 'asc' },
    });
    const roleOrder = { OWNER: 0, ADMIN: 1, MEMBER: 2 } as const;
    const members = rows
      .filter((r) => r.status === CommunityMemberStatus.ACTIVE)
      .sort((a, b) => roleOrder[a.role] - roleOrder[b.role])
      .map(toMemberDto);
    const requests = includeRequests
      ? rows
          .filter((r) => r.status === CommunityMemberStatus.REQUESTED)
          .map(toMemberDto)
      : [];
    return { members, requests };
  }

  private distanceTo(
    origin: Coordinates | null,
    community: { latitude: number | null; longitude: number | null },
  ): number | null {
    if (!origin || community.latitude === null || community.longitude === null) {
      return null;
    }
    return haversineKm(origin, {
      latitude: community.latitude,
      longitude: community.longitude,
    });
  }

  private async addToChat(
    community: { conversation: { id: string } | null },
    userId: string,
    tx: Prisma.TransactionClient,
  ) {
    if (!community.conversation) return;
    await this.messaging.addParticipants(community.conversation.id, [userId], tx);
  }

  /** Ends a membership (leave / remove / report-and-exit) and takes the
   * person out of the chat in the same transaction. */
  private async endMembership(communityId: string, userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.communityMember.deleteMany({ where: { communityId, userId } });
      const conversation = await tx.conversation.findUnique({
        where: { communityId },
        select: { id: true },
      });
      if (conversation) {
        await tx.conversationParticipant.deleteMany({
          where: { conversationId: conversation.id, userId },
        });
      }
    });
  }

  private async notify(
    userId: string,
    title: LocalizedText,
    body: LocalizedText,
    communityId: string,
  ) {
    await this.notifications.create(
      userId,
      'COMMUNITIES',
      title,
      body,
      'COMMUNITY',
      communityId,
    );
  }

  private async notifyManagers(
    communityId: string,
    title: LocalizedText,
    body: LocalizedText,
  ) {
    const managers = await this.prisma.communityMember.findMany({
      where: {
        communityId,
        status: CommunityMemberStatus.ACTIVE,
        role: { in: MANAGERS },
      },
      select: { userId: true },
    });
    await Promise.all(
      managers.map((m) => this.notify(m.userId, title, body, communityId)),
    );
  }

  private async notifyMembers(
    communityId: string,
    exceptUserId: string | null,
    title: LocalizedText,
    body: LocalizedText,
  ) {
    const members = await this.prisma.communityMember.findMany({
      where: {
        communityId,
        status: CommunityMemberStatus.ACTIVE,
        ...(exceptUserId ? { userId: { not: exceptUserId } } : {}),
      },
      select: { userId: true },
    });
    await Promise.all(
      members.map((m) => this.notify(m.userId, title, body, communityId)),
    );
  }

  private async audit(
    communityId: string,
    actorId: string | null,
    action: string,
    targetUserId: string | null,
    details?: Record<string, unknown>,
  ) {
    await this.prisma.communityAuditLog.create({
      data: {
        communityId,
        actorId,
        action,
        targetUserId,
        details: details as Prisma.InputJsonValue | undefined,
      },
    });
  }
}

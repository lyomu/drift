import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingAudience,
  BillingInterval,
  BillingSubscriptionStatus,
  ClubMembershipStatus,
  ClubPlatformStatus,
  ClubPostModerationStatus,
  ClubRole,
  ListingVerificationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import {
  OverrideClubSubscriptionDto,
  ReviewAdminApprovalDto,
  ReviewEscalatedModerationDto,
  UpdateOrganizationProfileDto,
  UpdateOrganizationStatusDto,
} from './dto/organization-admin.dto';
import { toInvoiceDto, toSubscriptionDto } from '../payments/payments.mapper';

const BILLING_INCLUDE = {
  subscription: { include: { plan: true } },
  invoices: {
    include: {
      plan: true,
      transaction: { include: { paymentMethod: true } },
    },
    orderBy: { createdAt: 'desc' as const },
    take: 25,
  },
  transactions: {
    include: {
      invoice: { include: { plan: true } },
      paymentMethod: true,
    },
    orderBy: { createdAt: 'desc' as const },
    take: 25,
  },
} satisfies Prisma.BillingAccountInclude;

@Injectable()
export class OrganizationAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: {
    search?: string;
    platformStatus?: string;
    verification?: string;
    subscriptionStatus?: string;
    take?: number;
    skip?: number;
  }) {
    const where = this.clubWhere(query);
    const [clubs, total] = await this.prisma.$transaction([
      this.prisma.club.findMany({
        where,
        include: {
          _count: {
            select: {
              courts: true,
              memberships: true,
              coachAffiliations: true,
              moderationReports: true,
            },
          },
          memberships: {
            where: {
              status: ClubMembershipStatus.PENDING,
              role: { in: [ClubRole.OWNER, ClubRole.ADMIN] },
            },
            select: { id: true },
          },
          billingAccount: {
            select: {
              subscription: { include: { plan: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: Math.min(query.take ?? 100, 250),
        skip: query.skip ?? 0,
      }),
      this.prisma.club.count({ where }),
    ]);

    return {
      total,
      clubs: clubs.map((club) => ({
        id: club.id,
        name: club.name,
        address: club.address,
        verificationStatus: club.verificationStatus,
        platformStatus: club.platformStatus,
        platformStatusReason: club.platformStatusReason,
        platformSuspendedAt: club.platformSuspendedAt,
        updatedAt: club.updatedAt,
        counts: {
          courts: club._count.courts,
          members: club._count.memberships,
          coaches: club._count.coachAffiliations,
          moderationReports: club._count.moderationReports,
          pendingAdminApprovals: club.memberships.length,
        },
        subscription: club.billingAccount?.subscription
          ? toSubscriptionDto(club.billingAccount.subscription)
          : null,
      })),
    };
  }

  async detail(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        _count: {
          select: {
            courts: true,
            memberships: true,
            coachAffiliations: true,
            leagues: true,
            tournaments: true,
            ladders: true,
            events: true,
            posts: true,
            moderationReports: true,
          },
        },
        courts: {
          select: {
            id: true,
            name: true,
            address: true,
            verificationStatus: true,
          },
          orderBy: { name: 'asc' },
          take: 12,
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
          take: 50,
        },
        billingAccount: { include: BILLING_INCLUDE },
      },
    });
    if (!club) throw new NotFoundException('Club not found.');

    const moderationByStatus =
      await this.prisma.clubPostModerationReport.groupBy({
        by: ['status'],
        where: { clubId },
        _count: { _all: true },
      });

    return {
      club: {
        id: club.id,
        name: club.name,
        description: club.description,
        address: club.address,
        latitude: club.latitude,
        longitude: club.longitude,
        phone: club.phone,
        website: club.website,
        amenities: club.amenities,
        openingHoursNote: club.openingHoursNote,
        photoUrls: club.photoUrls,
        verificationStatus: club.verificationStatus,
        platformStatus: club.platformStatus,
        platformStatusReason: club.platformStatusReason,
        platformSuspendedAt: club.platformSuspendedAt,
        createdAt: club.createdAt,
        updatedAt: club.updatedAt,
        counts: {
          courts: club._count.courts,
          members: club._count.memberships,
          coaches: club._count.coachAffiliations,
          leagues: club._count.leagues,
          tournaments: club._count.tournaments,
          ladders: club._count.ladders,
          events: club._count.events,
          posts: club._count.posts,
          moderationReports: club._count.moderationReports,
        },
        moderationByStatus: Object.fromEntries(
          moderationByStatus.map((row) => [row.status, row._count._all]),
        ),
        courts: club.courts,
        memberships: club.memberships.map((membership) => ({
          membershipId: membership.id,
          userId: membership.userId,
          firstName: membership.user.firstName,
          lastName: membership.user.lastName,
          email: membership.user.email,
          role: membership.role,
          status: membership.status,
          createdAt: membership.createdAt,
        })),
        billing: this.mapBilling(club.billingAccount),
      },
    };
  }

  async updateProfile(
    actorId: string,
    clubId: string,
    dto: UpdateOrganizationProfileDto,
  ) {
    const existing = await this.prisma.club.findUnique({
      where: { id: clubId },
    });
    if (!existing) throw new NotFoundException('Club not found.');

    const club = await this.prisma.club.update({
      where: { id: clubId },
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        address: dto.address?.trim() || null,
        phone: dto.phone?.trim() || null,
        website: dto.website?.trim() || null,
        verificationStatus: dto.verificationStatus,
      },
    });
    await this.audit.record(
      actorId,
      'organization.profile.update',
      'Club',
      clubId,
      {
        previousName: existing.name,
        verificationStatus: club.verificationStatus,
      },
    );
    return { club };
  }

  async updateStatus(
    actorId: string,
    clubId: string,
    dto: UpdateOrganizationStatusDto,
  ) {
    const existing = await this.prisma.club.findUnique({
      where: { id: clubId },
    });
    if (!existing) throw new NotFoundException('Club not found.');
    if (dto.status === ClubPlatformStatus.SUSPENDED && !dto.reason?.trim()) {
      throw new BadRequestException('A suspension reason is required.');
    }

    const club = await this.prisma.club.update({
      where: { id: clubId },
      data: {
        platformStatus: dto.status,
        platformStatusReason:
          dto.status === ClubPlatformStatus.SUSPENDED
            ? dto.reason!.trim()
            : null,
        platformSuspendedAt:
          dto.status === ClubPlatformStatus.SUSPENDED ? new Date() : null,
      },
    });
    const action =
      dto.status === ClubPlatformStatus.SUSPENDED
        ? 'organization.suspend'
        : existing.platformStatus === ClubPlatformStatus.PENDING_REVIEW
          ? 'organization.approve'
          : 'organization.restore';
    await this.audit.record(actorId, action, 'Club', clubId, {
      previousStatus: existing.platformStatus,
      reason: dto.reason?.trim() || null,
    });
    return { club };
  }

  async approvals(status?: string, clubId?: string) {
    const approvalStatus =
      status && status !== 'ALL'
        ? (status as ClubMembershipStatus)
        : status === 'ALL'
          ? undefined
          : ClubMembershipStatus.PENDING;
    const memberships = await this.prisma.clubMembership.findMany({
      where: {
        ...(approvalStatus ? { status: approvalStatus } : {}),
        role: { in: [ClubRole.OWNER, ClubRole.ADMIN] },
        ...(clubId ? { clubId } : {}),
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            platformStatus: true,
            verificationStatus: true,
          },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return {
      approvals: memberships.map((membership) => ({
        membershipId: membership.id,
        role: membership.role,
        status: membership.status,
        createdAt: membership.createdAt,
        club: membership.club,
        user: membership.user,
      })),
    };
  }

  async reviewApproval(
    actorId: string,
    membershipId: string,
    dto: ReviewAdminApprovalDto,
  ) {
    const membership = await this.prisma.clubMembership.findUnique({
      where: { id: membershipId },
      include: { club: { select: { id: true, name: true } } },
    });
    if (!membership) throw new NotFoundException('Approval request not found.');
    if (membership.status !== ClubMembershipStatus.PENDING) {
      throw new BadRequestException('Only pending approvals can be reviewed.');
    }
    if (
      membership.role !== ClubRole.OWNER &&
      membership.role !== ClubRole.ADMIN
    ) {
      throw new BadRequestException(
        'Only Owner and Admin approvals are handled here.',
      );
    }
    if (dto.action === 'REJECT' && !dto.reason?.trim()) {
      throw new BadRequestException('A rejection reason is required.');
    }

    const nextStatus =
      dto.action === 'APPROVE'
        ? ClubMembershipStatus.ACTIVE
        : ClubMembershipStatus.SUSPENDED;
    const updated = await this.prisma.clubMembership.update({
      where: { id: membershipId },
      data: { status: nextStatus },
    });
    await this.audit.record(
      actorId,
      dto.action === 'APPROVE'
        ? 'organization_admin.approve'
        : 'organization_admin.reject',
      'ClubMembership',
      membershipId,
      {
        clubId: membership.clubId,
        userId: membership.userId,
        role: membership.role,
        reason: dto.reason?.trim() || null,
      },
    );
    return { membershipId: updated.id, status: updated.status };
  }

  async subscriptions(status?: string, clubId?: string) {
    const clubs = await this.prisma.club.findMany({
      where: {
        ...(clubId ? { id: clubId } : {}),
        ...(status
          ? {
              billingAccount: {
                subscription: {
                  status: status as BillingSubscriptionStatus,
                },
              },
            }
          : {}),
      },
      include: {
        billingAccount: { include: BILLING_INCLUDE },
        _count: { select: { memberships: true } },
      },
      orderBy: { name: 'asc' },
      take: 200,
    });
    return {
      clubs: clubs.map((club) => ({
        id: club.id,
        name: club.name,
        platformStatus: club.platformStatus,
        memberCount: club._count.memberships,
        billing: this.mapBilling(club.billingAccount),
      })),
    };
  }

  async subscriptionDetail(clubId: string) {
    const [club, plans] = await Promise.all([
      this.prisma.club.findUnique({
        where: { id: clubId },
        select: {
          id: true,
          name: true,
          platformStatus: true,
          billingAccount: { include: BILLING_INCLUDE },
        },
      }),
      this.prisma.paymentPlan.findMany({
        where: { audience: BillingAudience.CLUB, isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { priceMinor: 'asc' }],
      }),
    ]);
    if (!club) throw new NotFoundException('Club not found.');
    return {
      club: {
        id: club.id,
        name: club.name,
        platformStatus: club.platformStatus,
        billing: this.mapBilling(club.billingAccount),
      },
      plans,
    };
  }

  async overrideSubscription(
    actorId: string,
    clubId: string,
    dto: OverrideClubSubscriptionDto,
  ) {
    if (!dto.reason?.trim()) {
      throw new BadRequestException('A support override reason is required.');
    }
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      include: {
        billingAccount: {
          include: { subscription: { include: { plan: true } } },
        },
      },
    });
    if (!club) throw new NotFoundException('Club not found.');

    const planId = dto.planId ?? club.billingAccount?.subscription?.planId;
    if (!planId) {
      throw new BadRequestException(
        'Choose a plan before creating a subscription override.',
      );
    }
    const plan = await this.prisma.paymentPlan.findFirst({
      where: { id: planId, audience: BillingAudience.CLUB, isActive: true },
    });
    if (!plan) throw new NotFoundException('Plan not found.');

    const now = new Date();
    const periodEnd = dto.currentPeriodEnd
      ? new Date(dto.currentPeriodEnd)
      : this.periodEnd(now, plan.interval);
    const account = await this.prisma.billingAccount.upsert({
      where: { clubId },
      create: { clubId },
      update: {},
    });
    const subscription = await this.prisma.billingSubscription.upsert({
      where: { billingAccountId: account.id },
      create: {
        billingAccountId: account.id,
        planId: plan.id,
        status: dto.status ?? BillingSubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planId: plan.id,
        status:
          dto.status ??
          club.billingAccount?.subscription?.status ??
          BillingSubscriptionStatus.ACTIVE,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });

    await this.audit.record(
      actorId,
      'organization_subscription.override',
      'Club',
      clubId,
      {
        previousPlanId: club.billingAccount?.subscription?.planId ?? null,
        previousStatus: club.billingAccount?.subscription?.status ?? null,
        nextPlanId: subscription.planId,
        nextStatus: subscription.status,
        reason: dto.reason.trim(),
      },
    );
    return { subscription: toSubscriptionDto(subscription) };
  }

  async moderation(status?: string, clubId?: string) {
    const moderationStatus =
      (status as ClubPostModerationStatus | undefined) ??
      ClubPostModerationStatus.ESCALATED;
    const reports = await this.prisma.clubPostModerationReport.findMany({
      where: {
        status: moderationStatus,
        ...(clubId ? { clubId } : {}),
      },
      include: {
        club: { select: { id: true, name: true, platformStatus: true } },
        post: {
          select: {
            id: true,
            body: true,
            deletedAt: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { reports };
  }

  async reviewModeration(
    actorId: string,
    reportId: string,
    dto: ReviewEscalatedModerationDto,
  ) {
    const report = await this.prisma.clubPostModerationReport.findUnique({
      where: { id: reportId },
      include: { post: true },
    });
    if (!report) throw new NotFoundException('Moderation report not found.');
    if (report.status !== ClubPostModerationStatus.ESCALATED) {
      throw new BadRequestException(
        'Only escalated reports can be reviewed here.',
      );
    }
    if (!dto.reason?.trim()) {
      throw new BadRequestException(
        'A moderation decision reason is required.',
      );
    }

    const nextStatus =
      dto.action === 'REMOVE'
        ? ClubPostModerationStatus.REMOVED
        : ClubPostModerationStatus.APPROVED;
    await this.prisma.$transaction(async (tx) => {
      if (dto.action === 'REMOVE' && !report.post.deletedAt) {
        await tx.clubPost.update({
          where: { id: report.postId },
          data: { deletedAt: new Date() },
        });
      }
      await tx.clubPostModerationReport.update({
        where: { id: reportId },
        data: { status: nextStatus, resolvedAt: new Date() },
      });
    });
    await this.audit.record(
      actorId,
      dto.action === 'REMOVE'
        ? 'organization_moderation.remove'
        : 'organization_moderation.approve',
      'ClubPostModerationReport',
      reportId,
      {
        clubId: report.clubId,
        postId: report.postId,
        reason: dto.reason.trim(),
      },
    );
    return { reportId, status: nextStatus };
  }

  private clubWhere(query: {
    search?: string;
    platformStatus?: string;
    verification?: string;
    subscriptionStatus?: string;
  }): Prisma.ClubWhereInput {
    return {
      AND: [
        query.search?.trim()
          ? {
              OR: [
                {
                  name: { contains: query.search.trim(), mode: 'insensitive' },
                },
                {
                  address: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  website: {
                    contains: query.search.trim(),
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {},
        query.platformStatus
          ? { platformStatus: query.platformStatus as ClubPlatformStatus }
          : {},
        query.verification
          ? {
              verificationStatus:
                query.verification as ListingVerificationStatus,
            }
          : {},
        query.subscriptionStatus
          ? {
              billingAccount: {
                subscription: {
                  status: query.subscriptionStatus as BillingSubscriptionStatus,
                },
              },
            }
          : {},
      ],
    };
  }

  private mapBilling(
    account: Prisma.BillingAccountGetPayload<{
      include: typeof BILLING_INCLUDE;
    }> | null,
  ) {
    if (!account) {
      return {
        subscription: null,
        invoices: [],
        transactions: [],
        totalsByCurrency: [],
      };
    }
    const totals = new Map<
      string,
      { paidMinor: number; failedMinor: number; invoiceCount: number }
    >();
    for (const invoice of account.invoices) {
      const row = totals.get(invoice.currency) ?? {
        paidMinor: 0,
        failedMinor: 0,
        invoiceCount: 0,
      };
      row.invoiceCount += 1;
      if (invoice.status === 'PAID') row.paidMinor += invoice.amountMinor;
      if (invoice.status === 'FAILED') row.failedMinor += invoice.amountMinor;
      totals.set(invoice.currency, row);
    }
    return {
      subscription: account.subscription
        ? toSubscriptionDto(account.subscription)
        : null,
      invoices: account.invoices.map(toInvoiceDto),
      transactions: account.transactions.map((transaction) => ({
        id: transaction.id,
        amountMinor: transaction.amountMinor,
        currency: transaction.currency,
        status: transaction.status,
        provider: transaction.provider,
        providerReference: transaction.providerReference,
        failureReason: transaction.failureReason,
        createdAt: transaction.createdAt,
        plan: transaction.invoice.plan.name,
        paymentMethodLabel:
          transaction.paymentMethod?.label ?? 'Removed method',
      })),
      totalsByCurrency: [...totals.entries()].map(([currency, value]) => ({
        currency,
        ...value,
      })),
    };
  }

  private periodEnd(start: Date, interval: BillingInterval) {
    const end = new Date(start);
    const day = end.getUTCDate();
    end.setUTCDate(1);
    if (interval === BillingInterval.YEARLY) {
      end.setUTCFullYear(end.getUTCFullYear() + 1);
    } else {
      end.setUTCMonth(end.getUTCMonth() + 1);
    }
    const lastDay = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
    ).getUTCDate();
    end.setUTCDate(Math.min(day, lastDay));
    return end;
  }
}

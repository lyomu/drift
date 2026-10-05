import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  CoachApplicationStatus,
  ListingVerificationStatus,
  OnboardingStep,
  NotificationCategory,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CoachApplicationDecision,
  ListCoachApplicationsDto,
  ReviewCoachApplicationDto,
  SaveCoachApplicationDto,
} from './dto/coach-application.dto';
import {
  applicationInclude,
  toApplicationAdminDetail,
  toApplicationAdminSummary,
  toApplicationDetail,
} from './coach-application.mapper';

const DEFAULT_TAKE = 20;

/**
 * The statuses a coach may edit from. APPROVED is excluded on purpose: an
 * approved coach edits their live profile through the coach profile routes,
 * and re-opening the application would mean an approved listing silently
 * reverting to a draft.
 */
const EDITABLE: CoachApplicationStatus[] = [
  CoachApplicationStatus.DRAFT,
  CoachApplicationStatus.CHANGES_REQUESTED,
  CoachApplicationStatus.REJECTED,
];

@Injectable()
export class CoachApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications?: NotificationsService,
  ) {}

  private cleanText(value: string | null | undefined) {
    if (value === undefined) return undefined;
    const cleaned = value?.trim() ?? '';
    return cleaned.length > 0 ? cleaned : null;
  }

  private cleanList(value: string[] | undefined) {
    if (value === undefined) return undefined;
    return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
  }

  /** Shared by the draft save and the approval copy into CoachProfile. */
  private fields(dto: SaveCoachApplicationDto) {
    return {
      ...(dto.bio !== undefined ? { bio: this.cleanText(dto.bio) } : {}),
      ...(dto.qualifications !== undefined
        ? { qualifications: this.cleanList(dto.qualifications) }
        : {}),
      ...(dto.yearsExperience !== undefined
        ? { yearsExperience: dto.yearsExperience }
        : {}),
      ...(dto.specialisations !== undefined
        ? { specialisations: this.cleanList(dto.specialisations) }
        : {}),
      ...(dto.levels !== undefined ? { levels: dto.levels } : {}),
      ...(dto.availabilityNote !== undefined
        ? { availabilityNote: this.cleanText(dto.availabilityNote) }
        : {}),
      ...(dto.publicEmail !== undefined
        ? { publicEmail: this.cleanText(dto.publicEmail) }
        : {}),
      ...(dto.publicPhone !== undefined
        ? { publicPhone: this.cleanText(dto.publicPhone) }
        : {}),
      ...(dto.bookingUrl !== undefined
        ? { bookingUrl: this.cleanText(dto.bookingUrl) }
        : {}),
    };
  }

  // ------------------------------------------------------------ coach side

  async findMine(userId: string) {
    const application = await this.prisma.coachApplication.findUnique({
      where: { userId },
      include: applicationInclude,
    });
    if (!application) return { application: null };
    return { application: toApplicationDetail(application) };
  }

  /**
   * Upsert by design: the coach portal has no "create application" button.
   * Opening the form and saving is the creation, which keeps the client from
   * having to distinguish a first save from a later one.
   */
  async saveMine(userId: string, dto: SaveCoachApplicationDto) {
    const existing = await this.prisma.coachApplication.findUnique({
      where: { userId },
    });

    if (existing && !EDITABLE.includes(existing.status)) {
      throw new BadRequestException(
        existing.status === CoachApplicationStatus.PENDING_REVIEW
          ? 'Your application is being reviewed and cannot be edited right now.'
          : 'Your application is already approved. Edit your coach profile instead.',
      );
    }

    const data = this.fields(dto);
    const application = await this.prisma.coachApplication.upsert({
      where: { userId },
      create: {
        userId,
        status: CoachApplicationStatus.DRAFT,
        bio: data.bio ?? null,
        qualifications: data.qualifications ?? [],
        yearsExperience: data.yearsExperience ?? null,
        specialisations: data.specialisations ?? [],
        levels: data.levels ?? [],
        availabilityNote: data.availabilityNote ?? null,
        publicEmail: data.publicEmail ?? null,
        publicPhone: data.publicPhone ?? null,
        bookingUrl: data.bookingUrl ?? null,
      },
      update: data,
      include: applicationInclude,
    });
    return { application: toApplicationDetail(application) };
  }

  /**
   * The completeness gate. Everything here is what a reviewer needs in order
   * to make a decision at all: a submission missing these would only be
   * bounced straight back as CHANGES_REQUESTED.
   */
  private assertSubmittable(application: {
    bio: string | null;
    qualifications: string[];
    yearsExperience: number | null;
    specialisations: string[];
    levels: unknown[];
    publicEmail: string | null;
    publicPhone: string | null;
    bookingUrl: string | null;
  }) {
    const missing: string[] = [];
    if (!application.bio) missing.push('a short bio');
    if (application.qualifications.length === 0) {
      missing.push('at least one qualification');
    }
    if (application.yearsExperience === null) {
      missing.push('years of experience');
    }
    if (application.specialisations.length === 0) {
      missing.push('at least one specialisation');
    }
    if (application.levels.length === 0) {
      missing.push('the player levels you coach');
    }
    if (
      !application.publicEmail &&
      !application.publicPhone &&
      !application.bookingUrl
    ) {
      missing.push('a public email, phone number, or booking link');
    }
    if (missing.length > 0) {
      throw new BadRequestException(
        'Add ' + missing.join(', ') + ' before submitting.',
      );
    }
  }

  async submitMine(userId: string) {
    const application = await this.prisma.coachApplication.findUnique({
      where: { userId },
    });
    if (!application) {
      throw new NotFoundException('Start your application before submitting.');
    }
    if (!EDITABLE.includes(application.status)) {
      throw new BadRequestException(
        application.status === CoachApplicationStatus.PENDING_REVIEW
          ? 'Your application is already with our review team.'
          : 'Your application is already approved.',
      );
    }
    this.assertSubmittable(application);

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.coachApplication.update({
        where: { id: application.id },
        data: {
          status: CoachApplicationStatus.PENDING_REVIEW,
          submittedAt: new Date(),
          // A resubmission starts a clean review: the previous decision stays
          // in the event history, not on the row a reviewer is looking at.
          reviewedAt: null,
          reviewedById: null,
          decisionReason: null,
        },
        include: applicationInclude,
      });
      await tx.coachApplicationEvent.create({
        data: {
          applicationId: row.id,
          actorUserId: userId,
          previousStatus: application.status,
          nextStatus: CoachApplicationStatus.PENDING_REVIEW,
        },
      });
      return row;
    });
    return { application: toApplicationDetail(updated) };
  }

  // ------------------------------------------------------------ admin side

  async list(dto: ListCoachApplicationsDto) {
    const search = dto.search?.trim();
    const where: Prisma.CoachApplicationWhereInput = {
      // A draft is the coach's private workspace: it has never been sent to
      // anyone, so it does not belong in a reviewer's queue unless asked for
      // by name.
      ...(dto.status
        ? { status: dto.status }
        : { status: { not: CoachApplicationStatus.DRAFT } }),
      ...(search
        ? {
            user: {
              is: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          }
        : {}),
    };
    const skip = dto.skip ?? 0;
    const take = dto.take ?? DEFAULT_TAKE;
    const [total, rows] = await Promise.all([
      this.prisma.coachApplication.count({ where }),
      this.prisma.coachApplication.findMany({
        where,
        include: applicationInclude,
        // Oldest first: a review queue is worked front to back, and the coach
        // waiting longest should not be buried by newer arrivals.
        orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
        skip,
        take,
      }),
    ]);
    return { total, applications: rows.map(toApplicationAdminSummary) };
  }

  async findOne(id: string) {
    const application = await this.prisma.coachApplication.findUnique({
      where: { id },
      include: applicationInclude,
    });
    if (!application) throw new NotFoundException('Application not found.');
    const events = await this.prisma.coachApplicationEvent.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'asc' },
    });
    return { application: toApplicationAdminDetail(application, events) };
  }

  private nextStatus(decision: CoachApplicationDecision) {
    switch (decision) {
      case CoachApplicationDecision.APPROVE:
        return CoachApplicationStatus.APPROVED;
      case CoachApplicationDecision.REJECT:
        return CoachApplicationStatus.REJECTED;
      case CoachApplicationDecision.REQUEST_CHANGES:
        return CoachApplicationStatus.CHANGES_REQUESTED;
    }
  }

  /**
   * The only path that makes a coach publicly visible. Approval copies the
   * application onto a VERIFIED CoachProfile and, because GET /coaches also
   * requires a completed onboarding, marks the account COMPLETE: a coach who
   * signed up on the web never walked the player onboarding, and without this
   * an approved coach would stay invisible in Discover. Same treatment club
   * owners already get in ClubOnboardingService.complete.
   */
  async review(adminId: string, id: string, dto: ReviewCoachApplicationDto) {
    const application = await this.prisma.coachApplication.findUnique({
      where: { id },
      include: applicationInclude,
    });
    if (!application) throw new NotFoundException('Application not found.');
    if (application.status !== CoachApplicationStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Only an application awaiting review can be decided.',
      );
    }
    const reason = dto.reason?.trim();
    if (dto.decision !== CoachApplicationDecision.APPROVE && !reason) {
      throw new BadRequestException(
        'Give the coach a reason for this decision.',
      );
    }
    if (
      dto.decision === CoachApplicationDecision.APPROVE &&
      application.user.accountStatus !== AccountStatus.ACTIVE
    ) {
      throw new ForbiddenException(
        'This account is not active and cannot be listed publicly.',
      );
    }

    const next = this.nextStatus(dto.decision);
    const decidedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.coachApplication.update({
        where: { id },
        data: {
          status: next,
          reviewedAt: decidedAt,
          reviewedById: adminId,
          decisionReason: reason ?? null,
        },
      });
      await tx.coachApplicationEvent.create({
        data: {
          applicationId: id,
          actorAdminId: adminId,
          previousStatus: application.status,
          nextStatus: next,
          note: reason ?? null,
        },
      });

      if (next !== CoachApplicationStatus.APPROVED) return;

      const profileFields = {
        bio: application.bio,
        qualifications: application.qualifications,
        yearsExperience: application.yearsExperience,
        specialisations: application.specialisations,
        levels: application.levels,
        availabilityNote: application.availabilityNote,
        publicEmail: application.publicEmail,
        publicPhone: application.publicPhone,
        bookingUrl: application.bookingUrl,
        verificationStatus: ListingVerificationStatus.VERIFIED,
      };
      await tx.coachProfile.upsert({
        where: { userId: application.userId },
        create: { userId: application.userId, ...profileFields },
        update: profileFields,
      });

      if (application.user.onboardingStep !== OnboardingStep.COMPLETE) {
        await tx.user.update({
          where: { id: application.userId },
          data: {
            onboardingStep: OnboardingStep.COMPLETE,
            onboardingCompletedAt: decidedAt,
          },
        });
        // Player-facing surfaces read TennisProfile for every listed account.
        // A web-only coach has never been through onboarding, so create the
        // empty row rather than leave a dangling relation.
        await tx.tennisProfile.upsert({
          where: { userId: application.userId },
          create: { userId: application.userId },
          update: {},
        });
      }
    });

    const decisionCopy: Record<CoachApplicationDecision, [string, string]> = {
      APPROVE: [
        'Coach application approved',
        'Your coach profile is now live on Drift Tennis.',
      ],
      REJECT: [
        'Coach application update',
        'Your coach application was not approved. Open your application to see the review note.',
      ],
      REQUEST_CHANGES: [
        'Coach application needs changes',
        'Your coach application needs a few updates before it can be approved.',
      ],
    };
    const [title, body] = decisionCopy[dto.decision];
    await this.notifications?.create(
      application.userId,
      NotificationCategory.CLUBS,
      title,
      body,
      'SETTINGS',
    );

    return this.findOne(id);
  }
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClubMembershipStatus,
  ClubRole,
  CourtBookingCanceller,
  CourtBookingStatus,
  CourtBookingType,
  Prisma,
} from '@prisma/client';
import { demoScope } from '../common/demo-scope';
import { msg } from '../common/i18n';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BookingWindowError,
  Slot,
  OpeningInterval,
  generateSlots,
  isValidTimeZone,
  localYmd,
  openMinutesInRange,
  remainingCapacity,
  validateBookingWindow,
  validateOpeningHours,
  addDaysYmd,
} from './booking-logic';
import {
  BookingSettingsDto,
  CreateBookingDto,
  CreateClubBookingDto,
  DecideBookingDto,
} from './dto/booking.dto';

/** Open (PENDING) requests a single player may hold at once. */
export const MAX_OPEN_REQUESTS = 5;

const WINDOW_MESSAGES: Record<BookingWindowError, string> = {
  BAD_RANGE: 'The end time must be after the start time.',
  IN_PAST: 'That time has already passed.',
  TOO_FAR_AHEAD: 'That date is too far ahead to book.',
  OUTSIDE_HOURS: 'That time is outside the court’s opening hours.',
  OFF_GRID: 'Bookings must start and end on the court’s slot times.',
  TOO_LONG: 'That is longer than the maximum booking length.',
};

const MANAGER_ROLES: ClubRole[] = [ClubRole.OWNER, ClubRole.ADMIN];
const ACTIVE_STATES: CourtBookingStatus[] = [
  CourtBookingStatus.PENDING,
  CourtBookingStatus.APPROVED,
];

const BOOKING_INCLUDE = {
  court: { select: { id: true, name: true, timezone: true, clubId: true } },
  courtGroup: {
    select: {
      id: true,
      surface: true,
      indoor: true,
      lighting: true,
      count: true,
    },
  },
  user: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.CourtBookingInclude;

type BookingRow = Prisma.CourtBookingGetPayload<{
  include: typeof BOOKING_INCLUDE;
}>;

type Tx = Prisma.TransactionClient;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ------------------------------------------------------------ helpers

  private toDto(b: BookingRow, now = new Date()) {
    return {
      id: b.id,
      status: b.status,
      // Derived, never stored: an approved booking that has finished.
      completed:
        b.status === CourtBookingStatus.APPROVED &&
        b.endsAt.getTime() <= now.getTime(),
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      note: b.note,
      decisionNote: b.decisionNote,
      decidedAt: b.decidedAt,
      cancelledAt: b.cancelledAt,
      cancelledBy: b.cancelledBy,
      guestName: b.guestName,
      createdAt: b.createdAt,
      court: {
        id: b.court.id,
        name: b.court.name,
        timezone: b.court.timezone,
      },
      courtGroup: b.courtGroup,
      user: b.user,
    };
  }

  private whenText(date: Date, timeZone: string) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private fullName(
    u: { firstName: string | null; lastName: string | null } | null,
  ) {
    return u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '';
  }

  /** A bookable, viewer-visible court. Demo accounts only see demo clubs. */
  private async bookableCourt(courtId: string, viewerId: string) {
    const scope = await demoScope(this.prisma, viewerId);
    const court = await this.prisma.court.findFirst({
      where: {
        id: courtId,
        clubId: { not: null },
        bookingType: CourtBookingType.NATIVE_PARTNER,
        AND: [scope.clubOptional],
      },
      include: {
        courtGroups: { orderBy: { id: 'asc' } },
        openingHours: true,
      },
    });
    if (!court || !court.bookingSlotMinutes) {
      throw new NotFoundException('This court does not take bookings.');
    }
    return { ...court, bookingSlotMinutes: court.bookingSlotMinutes };
  }

  private hoursOf(
    rows: { dayOfWeek: number; opensMinute: number; closesMinute: number }[],
  ): OpeningInterval[] {
    return rows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      opensMinute: r.opensMinute,
      closesMinute: r.closesMinute,
    }));
  }

  private assertWindow(
    court: {
      timezone: string;
      bookingSlotMinutes: number;
      bookingMaxSlots: number;
      bookingAdvanceDays: number;
      openingHours: {
        dayOfWeek: number;
        opensMinute: number;
        closesMinute: number;
      }[];
    },
    startsAt: Date,
    endsAt: Date,
    now: Date,
  ) {
    const error = validateBookingWindow({
      range: { startsAt, endsAt },
      now,
      timeZone: court.timezone,
      slotMinutes: court.bookingSlotMinutes,
      maxSlots: court.bookingMaxSlots,
      advanceDays: court.bookingAdvanceDays,
      hours: this.hoursOf(court.openingHours),
    });
    if (error) throw new BadRequestException(WINDOW_MESSAGES[error]);
  }

  private parseRange(startsAt: string, endsAt: string) {
    const s = new Date(startsAt);
    const e = new Date(endsAt);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      throw new BadRequestException('Invalid start or end time.');
    }
    return { startsAt: s, endsAt: e };
  }

  /** Locks the surface row so concurrent approvals serialise. */
  private async lockGroup(tx: Tx, groupId: string) {
    await tx.$queryRaw`SELECT id FROM "court_groups" WHERE id = ${groupId} FOR UPDATE`;
  }

  /** Free courts on a surface for a window, counting APPROVED bookings only. */
  private async freeCapacity(
    tx: Tx,
    group: { id: string; count: number },
    range: { startsAt: Date; endsAt: Date },
    excludeBookingId?: string,
  ) {
    const approved = await tx.courtBooking.findMany({
      where: {
        courtGroupId: group.id,
        status: CourtBookingStatus.APPROVED,
        startsAt: { lt: range.endsAt },
        endsAt: { gt: range.startsAt },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { startsAt: true, endsAt: true },
    });
    return remainingCapacity(group.count, approved, range);
  }

  private async managerIds(clubId: string) {
    const rows = await this.prisma.clubMembership.findMany({
      where: {
        clubId,
        role: { in: MANAGER_ROLES },
        status: ClubMembershipStatus.ACTIVE,
      },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  // ------------------------------------------------------------- player

  async availability(
    viewerId: string,
    courtId: string,
    date: string,
    groupId?: string,
  ) {
    const court = await this.bookableCourt(courtId, viewerId);
    const group = groupId
      ? court.courtGroups.find((g) => g.id === groupId)
      : court.courtGroups[0];
    if (!group) throw new NotFoundException('Court surface not found.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD.');
    }

    const hours = this.hoursOf(court.openingHours);
    let slots: Slot[];
    try {
      slots = generateSlots({
        date,
        timeZone: court.timezone,
        slotMinutes: court.bookingSlotMinutes,
        hours,
      });
    } catch {
      throw new BadRequestException('Invalid date.');
    }

    const now = new Date();
    const today = localYmd(now, court.timezone);
    const inWindow =
      date >= today && date <= addDaysYmd(today, court.bookingAdvanceDays);

    const approved = slots.length
      ? await this.prisma.courtBooking.findMany({
          where: {
            courtGroupId: group.id,
            status: CourtBookingStatus.APPROVED,
            startsAt: { lt: slots[slots.length - 1].endsAt },
            endsAt: { gt: slots[0].startsAt },
          },
          select: { startsAt: true, endsAt: true },
        })
      : [];

    return {
      court: {
        id: court.id,
        name: court.name,
        timezone: court.timezone,
        slotMinutes: court.bookingSlotMinutes,
        maxSlots: court.bookingMaxSlots,
        advanceDays: court.bookingAdvanceDays,
      },
      groups: court.courtGroups.map((g) => ({
        id: g.id,
        surface: g.surface,
        indoor: g.indoor,
        lighting: g.lighting,
        count: g.count,
      })),
      groupId: group.id,
      date,
      slots: slots.map((s) => {
        const remaining = remainingCapacity(group.count, approved, s);
        return {
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          remaining,
          available:
            inWindow && s.startsAt.getTime() > now.getTime() && remaining > 0,
        };
      }),
    };
  }

  async request(viewerId: string, courtId: string, dto: CreateBookingDto) {
    const court = await this.bookableCourt(courtId, viewerId);
    const group = dto.courtGroupId
      ? court.courtGroups.find((g) => g.id === dto.courtGroupId)
      : court.courtGroups.length === 1
        ? court.courtGroups[0]
        : undefined;
    if (!group) {
      throw new BadRequestException('Choose which surface to book.');
    }
    const range = this.parseRange(dto.startsAt, dto.endsAt);
    const now = new Date();
    this.assertWindow(court, range.startsAt, range.endsAt, now);

    const open = await this.prisma.courtBooking.count({
      where: {
        userId: viewerId,
        status: CourtBookingStatus.PENDING,
        endsAt: { gt: now },
      },
    });
    if (open >= MAX_OPEN_REQUESTS) {
      throw new ConflictException(
        `You can have at most ${MAX_OPEN_REQUESTS} open booking requests.`,
      );
    }

    const clash = await this.prisma.courtBooking.findFirst({
      where: {
        userId: viewerId,
        courtId,
        status: { in: ACTIVE_STATES },
        startsAt: { lt: range.endsAt },
        endsAt: { gt: range.startsAt },
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        'You already have a booking or request for that time.',
      );
    }

    // Pending requests never block a slot; only approved ones consume
    // capacity. Re-checked (under a lock) when the club approves.
    const left = await this.freeCapacity(this.prisma, group, range);
    if (left < 1) {
      throw new ConflictException('That time is fully booked.');
    }

    const booking = await this.prisma.courtBooking.create({
      data: {
        courtId,
        courtGroupId: group.id,
        userId: viewerId,
        startsAt: range.startsAt,
        endsAt: range.endsAt,
        note: dto.note?.trim() || null,
      },
      include: BOOKING_INCLUDE,
    });

    const requester = booking.user;
    const when = this.whenText(range.startsAt, court.timezone);
    const managers = await this.managerIds(court.clubId!);
    await Promise.all(
      managers
        .filter((id) => id !== viewerId)
        .map((id) =>
          this.notifications.create(
            id,
            'CLUBS',
            msg('booking.request.title', {
              name: this.fullName(requester) || { key: 'common.aPlayer' },
            }),
            msg('booking.request.body', { court: court.name, when }),
            'COURT_BOOKING',
            booking.id,
          ),
        ),
    );
    return { booking: this.toDto(booking, now) };
  }

  async mine(viewerId: string) {
    const now = new Date();
    const rows = await this.prisma.courtBooking.findMany({
      where: { userId: viewerId },
      include: BOOKING_INCLUDE,
      orderBy: { startsAt: 'desc' },
      take: 100,
    });
    return { bookings: rows.map((b) => this.toDto(b, now)) };
  }

  async cancelMine(viewerId: string, bookingId: string) {
    const booking = await this.prisma.courtBooking.findFirst({
      where: { id: bookingId, userId: viewerId },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (!ACTIVE_STATES.includes(booking.status)) {
      throw new BadRequestException('This booking is already closed.');
    }
    if (booking.endsAt.getTime() <= Date.now()) {
      throw new BadRequestException('This booking has already finished.');
    }
    const updated = await this.prisma.courtBooking.update({
      where: { id: bookingId },
      data: {
        status: CourtBookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: CourtBookingCanceller.PLAYER,
      },
      include: BOOKING_INCLUDE,
    });
    return { booking: this.toDto(updated) };
  }

  // -------------------------------------------------------------- club

  private async clubBooking(clubId: string, bookingId: string) {
    const booking = await this.prisma.courtBooking.findFirst({
      where: { id: bookingId, court: { clubId } },
      include: BOOKING_INCLUDE,
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    return booking;
  }

  async listForClub(
    clubId: string,
    q: { status?: string; courtId?: string; from?: string; to?: string },
  ) {
    const status = q.status as CourtBookingStatus | undefined;
    if (status && !(status in CourtBookingStatus)) {
      throw new BadRequestException('Unknown status.');
    }
    const from = q.from ? new Date(q.from) : undefined;
    const to = q.to ? new Date(q.to) : undefined;
    if ((from && isNaN(from.getTime())) || (to && isNaN(to.getTime()))) {
      throw new BadRequestException('Invalid date range.');
    }
    const now = new Date();
    const rows = await this.prisma.courtBooking.findMany({
      where: {
        court: { clubId },
        ...(q.courtId ? { courtId: q.courtId } : {}),
        ...(status ? { status } : {}),
        ...(from || to
          ? {
              startsAt: {
                ...(to ? { lt: to } : {}),
              },
              endsAt: { ...(from ? { gt: from } : {}) },
            }
          : {}),
      },
      include: BOOKING_INCLUDE,
      orderBy: { startsAt: 'asc' },
      take: 500,
    });
    return { bookings: rows.map((b) => this.toDto(b, now)) };
  }

  async decide(
    clubId: string,
    bookingId: string,
    actorId: string,
    dto: DecideBookingDto,
  ) {
    const existing = await this.clubBooking(clubId, bookingId);
    const note = dto.note?.trim() || null;

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.lockGroup(tx, existing.courtGroupId);
      const fresh = await tx.courtBooking.findUniqueOrThrow({
        where: { id: bookingId },
      });
      if (fresh.status !== CourtBookingStatus.PENDING) {
        throw new ConflictException('This request has already been handled.');
      }
      if (dto.decision === 'APPROVE') {
        if (fresh.endsAt.getTime() <= Date.now()) {
          throw new BadRequestException('That time has already passed.');
        }
        const left = await this.freeCapacity(
          tx,
          existing.courtGroup,
          fresh,
          bookingId,
        );
        if (left < 1) {
          throw new ConflictException(
            'That time is already fully booked. Decline the request instead.',
          );
        }
      }
      return tx.courtBooking.update({
        where: { id: bookingId },
        data: {
          status:
            dto.decision === 'APPROVE'
              ? CourtBookingStatus.APPROVED
              : CourtBookingStatus.DECLINED,
          decisionNote: note,
          decidedById: actorId,
          decidedAt: new Date(),
        },
        include: BOOKING_INCLUDE,
      });
    });

    await this.audit(
      clubId,
      actorId,
      dto.decision === 'APPROVE' ? 'booking.approve' : 'booking.decline',
      bookingId,
    );
    await this.notifyPlayer(
      updated,
      dto.decision === 'APPROVE' ? 'approved' : 'declined',
      note,
    );
    return { booking: this.toDto(updated) };
  }

  async createForClub(
    clubId: string,
    actorId: string,
    dto: CreateClubBookingDto,
  ) {
    if (!dto.userId === !dto.guestName?.trim()) {
      throw new BadRequestException('Provide either a member or a guest name.');
    }
    const court = await this.prisma.court.findFirst({
      where: {
        id: dto.courtId,
        clubId,
        bookingType: CourtBookingType.NATIVE_PARTNER,
      },
      include: { courtGroups: true, openingHours: true },
    });
    if (!court || !court.bookingSlotMinutes) {
      throw new NotFoundException(
        'Online booking is not set up for that court.',
      );
    }
    const group = court.courtGroups.find((g) => g.id === dto.courtGroupId);
    if (!group) throw new NotFoundException('Court surface not found.');
    if (dto.userId) {
      const member = await this.prisma.clubMembership.findUnique({
        where: { clubId_userId: { clubId, userId: dto.userId } },
        select: { status: true },
      });
      if (member?.status !== ClubMembershipStatus.ACTIVE) {
        throw new BadRequestException('That person is not a club member.');
      }
    }
    const range = this.parseRange(dto.startsAt, dto.endsAt);
    // Staff may record a walk-in that already started: skip the past check
    // by never letting "now" be later than the start.
    const now = new Date(Math.min(Date.now(), range.startsAt.getTime()));
    this.assertWindow(
      { ...court, bookingSlotMinutes: court.bookingSlotMinutes },
      range.startsAt,
      range.endsAt,
      now,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      await this.lockGroup(tx, group.id);
      const left = await this.freeCapacity(tx, group, range);
      if (left < 1) throw new ConflictException('That time is fully booked.');
      return tx.courtBooking.create({
        data: {
          courtId: court.id,
          courtGroupId: group.id,
          userId: dto.userId ?? null,
          guestName: dto.userId ? null : dto.guestName!.trim(),
          startsAt: range.startsAt,
          endsAt: range.endsAt,
          status: CourtBookingStatus.APPROVED,
          note: dto.note?.trim() || null,
          decidedById: actorId,
          decidedAt: new Date(),
        },
        include: BOOKING_INCLUDE,
      });
    });

    await this.audit(clubId, actorId, 'booking.create', created.id);
    if (dto.userId && dto.userId !== actorId) {
      await this.notifyPlayer(created, 'approved', null);
    }
    return { booking: this.toDto(created) };
  }

  async cancelForClub(
    clubId: string,
    bookingId: string,
    actorId: string,
    note?: string,
  ) {
    const existing = await this.clubBooking(clubId, bookingId);
    if (!ACTIVE_STATES.includes(existing.status)) {
      throw new BadRequestException('This booking is already closed.');
    }
    const cleanNote = note?.trim() || null;
    const updated = await this.prisma.courtBooking.update({
      where: { id: bookingId },
      data: {
        status: CourtBookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: CourtBookingCanceller.CLUB,
        decisionNote: cleanNote,
      },
      include: BOOKING_INCLUDE,
    });
    await this.audit(clubId, actorId, 'booking.cancel', bookingId);
    await this.notifyPlayer(updated, 'cancelledByClub', cleanNote);
    return { booking: this.toDto(updated) };
  }

  private async notifyPlayer(
    b: BookingRow,
    kind: 'approved' | 'declined' | 'cancelledByClub' | 'expired',
    note: string | null,
  ) {
    if (!b.userId) return;
    const params = {
      court: b.court.name,
      when: this.whenText(b.startsAt, b.court.timezone),
      note: note ? `. ${note}` : '',
    };
    await this.notifications.create(
      b.userId,
      'CLUBS',
      msg(`booking.${kind}.title` as const),
      msg(`booking.${kind}.body` as const, params),
      'COURT_BOOKING',
      b.id,
    );
  }

  private async audit(
    clubId: string,
    actorId: string,
    action: string,
    entityId: string,
  ) {
    await this.prisma.clubAuditLog.create({
      data: { clubId, actorId, action, entityType: 'CourtBooking', entityId },
    });
  }

  // ---------------------------------------------------------- settings

  private async clubCourt(clubId: string, courtId: string) {
    const court = await this.prisma.court.findFirst({
      where: { id: courtId, clubId },
      include: { openingHours: true },
    });
    if (!court) throw new NotFoundException('Court not found.');
    return court;
  }

  private settingsDto(
    court: Awaited<ReturnType<BookingsService['clubCourt']>>,
  ) {
    return {
      enabled: court.bookingType === CourtBookingType.NATIVE_PARTNER,
      timezone: court.timezone,
      slotMinutes: court.bookingSlotMinutes,
      maxSlots: court.bookingMaxSlots,
      advanceDays: court.bookingAdvanceDays,
      hours: court.openingHours
        .map((h) => ({
          dayOfWeek: h.dayOfWeek,
          opensMinute: h.opensMinute,
          closesMinute: h.closesMinute,
        }))
        .sort(
          (a, b) => a.dayOfWeek - b.dayOfWeek || a.opensMinute - b.opensMinute,
        ),
    };
  }

  async getSettings(clubId: string, courtId: string) {
    return this.settingsDto(await this.clubCourt(clubId, courtId));
  }

  async putSettings(
    clubId: string,
    courtId: string,
    actorId: string,
    dto: BookingSettingsDto,
  ) {
    const court = await this.clubCourt(clubId, courtId);
    if (!isValidTimeZone(dto.timezone)) {
      throw new BadRequestException('Unknown time zone.');
    }
    const problem = validateOpeningHours(dto.hours);
    if (problem === 'OVERLAP') {
      throw new BadRequestException(
        'Opening hours on the same day must not overlap.',
      );
    }
    if (problem) {
      throw new BadRequestException(
        'Each interval must close after it opens (00:00–24:00).',
      );
    }
    if (dto.enabled) {
      if (!dto.slotMinutes) {
        throw new BadRequestException('Choose a slot length.');
      }
      if (dto.hours.length === 0) {
        throw new BadRequestException(
          'Add opening hours before turning on bookings.',
        );
      }
    }

    // Turning off falls back to the external link when there is one.
    const offType = court.bookingUrl
      ? CourtBookingType.EXTERNAL_LINK
      : CourtBookingType.UNKNOWN;
    await this.prisma.$transaction([
      this.prisma.court.update({
        where: { id: courtId },
        data: {
          timezone: dto.timezone,
          bookingSlotMinutes: dto.slotMinutes ?? null,
          bookingMaxSlots: dto.maxSlots,
          bookingAdvanceDays: dto.advanceDays,
          bookingType: dto.enabled
            ? CourtBookingType.NATIVE_PARTNER
            : court.bookingType === CourtBookingType.NATIVE_PARTNER
              ? offType
              : court.bookingType,
        },
      }),
      this.prisma.courtOpeningHours.deleteMany({ where: { courtId } }),
      this.prisma.courtOpeningHours.createMany({
        data: dto.hours.map((h) => ({ courtId, ...h })),
      }),
    ]);
    await this.audit(clubId, actorId, 'booking-settings.update', courtId);
    return this.getSettings(clubId, courtId);
  }

  /**
   * Closes requests the club never answered once their slot has ended. They
   * were already invisible in the pending counts; this gives them a final
   * state (DECLINED, no decider) and tells the player instead of leaving the
   * request "pending" forever. The status guard on the update means a request
   * approved a moment ago is never overwritten.
   */
  async expireStalePending(now = new Date()): Promise<number> {
    const stale = await this.prisma.courtBooking.findMany({
      where: { status: CourtBookingStatus.PENDING, endsAt: { lte: now } },
      include: BOOKING_INCLUDE,
      take: 500,
    });
    let expired = 0;
    for (const booking of stale) {
      const { count } = await this.prisma.courtBooking.updateMany({
        where: { id: booking.id, status: CourtBookingStatus.PENDING },
        data: { status: CourtBookingStatus.DECLINED, decidedAt: now },
      });
      if (count === 0) continue;
      expired += 1;
      await this.notifyPlayer(booking, 'expired', null).catch(() => undefined);
    }
    return expired;
  }

  // ------------------------------------------------------------- stats

  /** Number of requests waiting for the club to decide. */
  pendingCount(clubId: string) {
    return this.prisma.courtBooking.count({
      where: {
        court: { clubId },
        status: CourtBookingStatus.PENDING,
        endsAt: { gt: new Date() },
      },
    });
  }

  /**
   * Per-court booking numbers for the analytics period. Utilisation is
   * approved court-hours over the court-hours the venue was open (opening
   * hours x number of courts), up to now; null when no hours are configured.
   */
  async courtStats(clubId: string, range: { from?: Date; to?: Date }) {
    const now = new Date();
    const to = range.to && range.to < now ? range.to : now;
    const from = range.from ?? new Date(to.getTime() - 30 * 86_400_000);
    const courts = await this.prisma.court.findMany({
      where: { clubId },
      select: {
        id: true,
        timezone: true,
        courtGroups: { select: { count: true } },
        openingHours: true,
        bookings: {
          where: { startsAt: { gte: from, lte: to } },
          select: { status: true, startsAt: true, endsAt: true },
        },
      },
    });
    const out = new Map<
      string,
      {
        requested: number;
        approved: number;
        hoursBooked: number;
        utilisationPct: number | null;
      }
    >();
    for (const c of courts) {
      const requested = c.bookings.filter(
        (b) => b.status !== CourtBookingStatus.CANCELLED,
      ).length;
      const approvedRows = c.bookings.filter(
        (b) => b.status === CourtBookingStatus.APPROVED,
      );
      const bookedMin = approvedRows.reduce(
        (s, b) => s + (b.endsAt.getTime() - b.startsAt.getTime()) / 60_000,
        0,
      );
      const courtCount = c.courtGroups.reduce((s, g) => s + g.count, 0);
      const openMin =
        openMinutesInRange(
          this.hoursOf(c.openingHours),
          localYmd(from, c.timezone),
          localYmd(to, c.timezone),
        ) * courtCount;
      out.set(c.id, {
        requested,
        approved: approvedRows.length,
        hoursBooked: Math.round((bookedMin / 60) * 10) / 10,
        utilisationPct:
          openMin > 0
            ? Math.min(100, Math.round((bookedMin / openMin) * 1000) / 10)
            : null,
      });
    }
    return out;
  }

  /** Club-wide utilisation for the overview: pooled across all courts. */
  async clubUtilisation(clubId: string, range: { from?: Date; to?: Date }) {
    const stats = await this.courtStats(clubId, range);
    const rows = [...stats.values()];
    const withHours = rows.filter((r) => r.utilisationPct !== null);
    return {
      requested: rows.reduce((s, r) => s + r.requested, 0),
      approved: rows.reduce((s, r) => s + r.approved, 0),
      hoursBooked:
        Math.round(rows.reduce((s, r) => s + r.hoursBooked, 0) * 10) / 10,
      utilisationPct: withHours.length
        ? Math.round(
            (withHours.reduce((s, r) => s + (r.utilisationPct ?? 0), 0) /
              withHours.length) *
              10,
          ) / 10
        : null,
    };
  }

  /** Guard used by controllers that take the caller's club role directly. */
  assertManager(role: ClubRole) {
    if (!MANAGER_ROLES.includes(role)) throw new ForbiddenException();
  }
}

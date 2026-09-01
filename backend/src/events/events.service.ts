import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClubEventRegistrationStatus, ClubEventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type EventInput = {
  name: string;
  description?: string;
  imageUrl?: string | null;
  startsAt: Date;
  endsAt?: Date;
  capacity?: number;
  status: ClubEventStatus;
};

/** Trim an image reference and fold a blank value to null so "clear the image"
 * works from the admin form. `undefined` is left untouched (field omitted). */
function normaliseImageUrl<T extends { imageUrl?: string | null }>(input: T): T {
  if (input.imageUrl === undefined) return input;
  const trimmed = (input.imageUrl ?? '').trim();
  return { ...input, imageUrl: trimmed === '' ? null : trimmed };
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clubId: string, from?: Date, to?: Date) {
    const events = await this.prisma.clubEvent.findMany({
      where: {
        clubId,
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { _count: { select: { registrations: true } } },
      orderBy: { startsAt: 'asc' },
    });
    return { events };
  }

  async detail(clubId: string, id: string) {
    const event = await this.prisma.clubEvent.findFirst({
      where: { id, clubId },
      include: {
        registrations: {
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
          orderBy: { registeredAt: 'asc' },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found.');
    return { event };
  }

  async create(clubId: string, actorId: string, input: EventInput) {
    this.validateDates(input);
    const event = await this.prisma.clubEvent.create({
      data: { clubId, createdById: actorId, ...normaliseImageUrl(input) },
    });
    await this.audit(clubId, actorId, 'event.create', 'ClubEvent', event.id, {
      status: event.status,
    });
    return { event };
  }

  async update(
    clubId: string,
    id: string,
    actorId: string,
    input: Partial<EventInput>,
  ) {
    await this.requireEvent(clubId, id);
    if (input.startsAt)
      this.validateDates({
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      });
    const event = await this.prisma.clubEvent.update({
      where: { id },
      data: normaliseImageUrl(input),
    });
    await this.audit(clubId, actorId, 'event.update', 'ClubEvent', id, {
      status: event.status,
    });
    return { event };
  }

  async addRegistration(
    clubId: string,
    eventId: string,
    actorId: string,
    email: string,
  ) {
    const event = await this.requireEvent(clubId, eventId);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user)
      throw new NotFoundException('No Drift account found for that email.');
    const activeCount = await this.prisma.clubEventRegistration.count({
      where: {
        eventId,
        status: { not: ClubEventRegistrationStatus.CANCELLED },
      },
    });
    if (event.capacity && activeCount >= event.capacity) {
      throw new BadRequestException('This event is at capacity.');
    }
    const registration = await this.prisma.clubEventRegistration.upsert({
      where: { eventId_userId: { eventId, userId: user.id } },
      create: { eventId, userId: user.id },
      update: {
        status: ClubEventRegistrationStatus.REGISTERED,
        attendedAt: null,
      },
    });
    await this.audit(
      clubId,
      actorId,
      'event.registration.add',
      'ClubEventRegistration',
      registration.id,
    );
    return { registration };
  }

  async markAttendance(
    clubId: string,
    eventId: string,
    registrationId: string,
    actorId: string,
    status: ClubEventRegistrationStatus,
  ) {
    await this.requireEvent(clubId, eventId);
    const existing = await this.prisma.clubEventRegistration.findFirst({
      where: { id: registrationId, eventId },
    });
    if (!existing) throw new NotFoundException('Registration not found.');
    const registration = await this.prisma.clubEventRegistration.update({
      where: { id: registrationId },
      data: {
        status,
        attendedAt:
          status === ClubEventRegistrationStatus.ATTENDED ? new Date() : null,
      },
    });
    await this.audit(
      clubId,
      actorId,
      'event.attendance.update',
      'ClubEventRegistration',
      registrationId,
      { status },
    );
    return { registration };
  }

  async registrationCsv(clubId: string, eventId: string) {
    const { event } = await this.detail(clubId, eventId);
    const escape = (value: string | Date | null) =>
      `"${(value instanceof Date ? value.toISOString() : (value ?? '')).replaceAll('"', '""')}"`;
    const rows = event.registrations.map((r) =>
      [
        r.user.firstName,
        r.user.lastName,
        r.user.email,
        r.status,
        r.registeredAt.toISOString(),
      ]
        .map(escape)
        .join(','),
    );
    return ['First name,Last name,Email,Status,Registered at', ...rows].join(
      '\n',
    );
  }

  private validateDates(input: { startsAt: Date; endsAt?: Date }) {
    if (input.endsAt && input.endsAt <= input.startsAt) {
      throw new BadRequestException(
        'Event end time must be after its start time.',
      );
    }
  }

  private async requireEvent(clubId: string, id: string) {
    const event = await this.prisma.clubEvent.findFirst({
      where: { id, clubId },
    });
    if (!event) throw new NotFoundException('Event not found.');
    return event;
  }

  private async audit(
    clubId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: object,
  ) {
    await this.prisma.clubAuditLog.create({
      data: {
        clubId,
        actorId,
        action,
        entityType,
        entityId,
        metadata: metadata,
      },
    });
  }
}

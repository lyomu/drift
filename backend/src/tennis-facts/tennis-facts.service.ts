import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationCategory, Prisma, type TennisFact } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { localeOf, type LocaleCode } from '../common/i18n';

export const TENNIS_FACT_ENTITY = 'TENNIS_FACT';

/** Public, relative image path — clients resolve it against the API origin. */
export function tennisFactImagePath(imageId: string, version: Date): string {
  return `/media/tennis-fact-images/${imageId}?v=${version.getTime()}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Midnight UTC of [now]'s calendar day — the key for "today". */
export function utcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Which fact is "today's" out of [count] active facts: days since the epoch
 * modulo the count. Everyone sees the same fact on the same day, and no fact
 * repeats until the whole list has been shown.
 */
export function factIndexForDay(day: Date, count: number): number {
  if (count <= 0) return -1;
  const days = Math.floor(utcDay(day).getTime() / MS_PER_DAY);
  return ((days % count) + count) % count;
}

const factInclude = {
  image: { select: { id: true, createdAt: true } },
} satisfies Prisma.TennisFactInclude;

type FactRow = Prisma.TennisFactGetPayload<{ include: typeof factInclude }>;

export interface TennisFactDto {
  id: string;
  title: string;
  body: string;
  source: string | null;
  imageUrl: string | null;
  opened: boolean;
}

function localized(fact: TennisFact, locale: LocaleCode) {
  switch (locale) {
    case 'fr':
      return { title: fact.titleFr, body: fact.bodyFr, source: fact.sourceFr };
    case 'es':
      return { title: fact.titleEs, body: fact.bodyEs, source: fact.sourceEs };
    default:
      return { title: fact.titleEn, body: fact.bodyEn, source: fact.sourceEn };
  }
}

export function toTennisFactDto(
  fact: FactRow,
  locale: LocaleCode,
  opened: boolean,
): TennisFactDto {
  const text = localized(fact, locale);
  return {
    id: fact.id,
    title: text.title,
    body: text.body,
    source: text.source || null,
    imageUrl: fact.image
      ? tennisFactImagePath(fact.image.id, fact.image.createdAt)
      : null,
    opened,
  };
}

@Injectable()
export class TennisFactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** The fact scheduled for [now]'s UTC day, or null when none are active. */
  async factForDay(now: Date): Promise<FactRow | null> {
    const count = await this.prisma.tennisFact.count({
      where: { active: true },
    });
    const index = factIndexForDay(now, count);
    if (index < 0) return null;
    return this.prisma.tennisFact.findFirst({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      skip: index,
      include: factInclude,
    });
  }

  /**
   * Today's fact for [userId]. The first call of the user's day records a
   * view row and files the fact in their Notification Centre (no push);
   * later calls are read-only. Concurrent first calls race on the unique
   * (userId, day) index, and only the winner creates the notification.
   */
  async today(
    userId: string,
    locale: LocaleCode,
    now = new Date(),
  ): Promise<TennisFactDto | null> {
    const fact = await this.factForDay(now);
    if (!fact) return null;
    const day = utcDay(now);

    const existing = await this.prisma.tennisFactView.findUnique({
      where: { userId_day: { userId, day } },
    });
    if (existing) {
      return toTennisFactDto(fact, locale, existing.openedAt != null);
    }

    try {
      await this.prisma.tennisFactView.create({
        data: { userId, factId: fact.id, day },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Another request from this user won the race and filed the
        // notification already.
        return toTennisFactDto(fact, locale, false);
      }
      throw error;
    }

    await this.fileNotification(userId, fact);
    return toTennisFactDto(fact, locale, false);
  }

  private async fileNotification(userId: string, fact: FactRow) {
    // The body is the fact's title in the recipient's stored language — the
    // same language `NotificationsService` renders the title key in.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredLocale: true },
    });
    const { title } = localized(fact, localeOf(user?.preferredLocale));
    await this.notifications.create(
      userId,
      NotificationCategory.ANNOUNCEMENTS,
      { key: 'tennisFact.notificationTitle' },
      title,
      TENNIS_FACT_ENTITY,
      fact.id,
      fact.image
        ? tennisFactImagePath(fact.image.id, fact.image.createdAt)
        : undefined,
      { push: false },
    );
  }

  /** A single fact, opened from its notification. Inactive facts stay
   * readable so an older notification never dead-ends. */
  async byId(
    userId: string,
    id: string,
    locale: LocaleCode,
  ): Promise<TennisFactDto> {
    const fact = await this.prisma.tennisFact.findUnique({
      where: { id },
      include: factInclude,
    });
    if (!fact) throw new NotFoundException('Fact not found.');
    const view = await this.prisma.tennisFactView.findFirst({
      where: { userId, factId: id, openedAt: { not: null } },
      select: { id: true },
    });
    return toTennisFactDto(fact, locale, view != null);
  }

  /** Marks the fact opened for the caller and reads its notification. */
  async markOpened(userId: string, id: string, now = new Date()) {
    const fact = await this.prisma.tennisFact.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!fact) throw new NotFoundException('Fact not found.');

    await Promise.all([
      this.prisma.tennisFactView.updateMany({
        where: { userId, factId: id, openedAt: null },
        data: { openedAt: now },
      }),
      this.prisma.notification.updateMany({
        where: {
          userId,
          relatedEntityType: TENNIS_FACT_ENTITY,
          relatedEntityId: id,
          readAt: null,
        },
        data: { readAt: now },
      }),
    ]);
    return { opened: true };
  }

  async imageContent(imageId: string) {
    const image = await this.prisma.tennisFactImageAsset.findUnique({
      where: { id: imageId },
      select: { filename: true, mimeType: true, bytes: true },
    });
    if (!image) throw new NotFoundException('Image not found.');
    return image;
  }
}

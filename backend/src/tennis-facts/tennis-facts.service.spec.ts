import { NotificationCategory, Prisma } from '@prisma/client';
import {
  TENNIS_FACT_ENTITY,
  TennisFactsService,
  factIndexForDay,
  utcDay,
} from './tennis-facts.service';

function fact(overrides: Record<string, unknown> = {}) {
  return {
    id: '7e5f7ac7-0000-4000-8000-000000000001',
    titleEn: 'The oldest tournament',
    titleFr: 'Le plus vieux tournoi',
    titleEs: 'El torneo más antiguo',
    bodyEn: 'Wimbledon was first played in 1877.',
    bodyFr: 'Wimbledon s’est joué pour la première fois en 1877.',
    bodyEs: 'Wimbledon se disputó por primera vez en 1877.',
    sourceEn: null,
    sourceFr: null,
    sourceEs: null,
    active: true,
    sortOrder: 0,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMocks() {
  const prisma = {
    tennisFact: {
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue(fact()),
      findUnique: jest.fn().mockResolvedValue(fact()),
    },
    tennisFactView: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    notification: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ preferredLocale: 'fr' }),
    },
  };
  const notifications = { create: jest.fn().mockResolvedValue(true) };
  const service = new TennisFactsService(
    prisma as never,
    notifications as never,
  );
  return { prisma, notifications, service };
}

describe('factIndexForDay', () => {
  it('is the same all day and advances by one each UTC day', () => {
    const morning = new Date('2026-11-04T00:05:00Z');
    const night = new Date('2026-11-04T23:55:00Z');
    const nextDay = new Date('2026-11-05T00:05:00Z');
    expect(factIndexForDay(morning, 30)).toBe(factIndexForDay(night, 30));
    expect(factIndexForDay(nextDay, 30)).toBe(
      (factIndexForDay(morning, 30) + 1) % 30,
    );
  });

  it('cycles through every fact before repeating', () => {
    const start = Date.UTC(2026, 0, 1);
    const seen = new Set<number>();
    for (let d = 0; d < 7; d++) {
      seen.add(factIndexForDay(new Date(start + d * 86_400_000), 7));
    }
    expect(seen.size).toBe(7);
  });

  it('returns -1 when there are no facts', () => {
    expect(factIndexForDay(new Date(), 0)).toBe(-1);
  });
});

describe('TennisFactsService.today', () => {
  const now = new Date('2026-11-04T10:00:00Z');

  it('returns null when no facts are active', async () => {
    const { prisma, service, notifications } = createMocks();
    prisma.tennisFact.count.mockResolvedValue(0);
    await expect(service.today('user-1', 'en', now)).resolves.toBeNull();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('files an in-app notification (no push) on the first call of the day', async () => {
    const { prisma, service, notifications } = createMocks();
    const result = await service.today('user-1', 'en', now);

    expect(result).toMatchObject({
      title: 'The oldest tournament',
      opened: false,
      imageUrl: null,
    });
    expect(prisma.tennisFactView.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', factId: fact().id, day: utcDay(now) },
    });
    expect(notifications.create).toHaveBeenCalledWith(
      'user-1',
      NotificationCategory.ANNOUNCEMENTS,
      { key: 'tennisFact.notificationTitle' },
      // Body in the recipient's stored language, not the request's.
      'Le plus vieux tournoi',
      TENNIS_FACT_ENTITY,
      fact().id,
      undefined,
      { push: false },
    );
  });

  it('does not notify again later the same day', async () => {
    const { prisma, service, notifications } = createMocks();
    prisma.tennisFactView.findUnique.mockResolvedValue({ openedAt: null });
    const result = await service.today('user-1', 'es', now);
    expect(result?.title).toBe('El torneo más antiguo');
    expect(prisma.tennisFactView.create).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('reports opened once the user has opened it', async () => {
    const { prisma, service } = createMocks();
    prisma.tennisFactView.findUnique.mockResolvedValue({ openedAt: now });
    await expect(service.today('user-1', 'en', now)).resolves.toMatchObject({
      opened: true,
    });
  });

  it('loses a concurrent first-call race without a second notification', async () => {
    const { prisma, service, notifications } = createMocks();
    prisma.tennisFactView.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await expect(service.today('user-1', 'en', now)).resolves.toMatchObject({
      opened: false,
    });
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('exposes an uploaded image as a versioned relative path', async () => {
    const { prisma, service } = createMocks();
    const createdAt = new Date('2026-11-01T00:00:00Z');
    prisma.tennisFact.findFirst.mockResolvedValue(
      fact({ image: { id: 'img-1', createdAt } }),
    );
    const result = await service.today('user-1', 'en', now);
    expect(result?.imageUrl).toBe(
      `/media/tennis-fact-images/img-1?v=${createdAt.getTime()}`,
    );
  });
});

describe('TennisFactsService.markOpened', () => {
  it('marks the view opened and reads the fact notification', async () => {
    const { prisma, service } = createMocks();
    const now = new Date('2026-11-04T10:00:00Z');
    await service.markOpened('user-1', fact().id, now);
    expect(prisma.tennisFactView.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', factId: fact().id, openedAt: null },
      data: { openedAt: now },
    });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        relatedEntityType: TENNIS_FACT_ENTITY,
        relatedEntityId: fact().id,
        readAt: null,
      },
      data: { readAt: now },
    });
  });

  it('404s for an unknown fact', async () => {
    const { prisma, service } = createMocks();
    prisma.tennisFact.findUnique.mockResolvedValue(null);
    await expect(service.markOpened('user-1', 'nope')).rejects.toThrow(
      'Fact not found.',
    );
  });
});

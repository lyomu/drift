import { NotFoundException } from '@nestjs/common';
import { NewsService } from './news.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  newsStory: Record<string, jest.Mock>;
  savedStory: Record<string, jest.Mock>;
};

function createMockPrisma(): MockPrisma {
  return {
    newsStory: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
    },
    savedStory: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

function storyRecord(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    sourceId: 'source-1',
    source: { id: 'source-1', name: 'Drift Tennis Digest' },
    headline: `Headline ${id}`,
    imageUrl: null,
    highlight: 'A short highlight.',
    publicationDate: new Date('2026-01-01T00:00:00Z'),
    categories: ['LATEST'],
    topics: [],
    originalUrl: 'https://example.com/story',
    moderationStatus: 'APPROVED',
    ...overrides,
  };
}

describe('NewsService', () => {
  let service: NewsService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new NewsService(prisma as unknown as PrismaService);
  });

  describe('browse', () => {
    it('marks a story as saved when the viewer has saved it', async () => {
      prisma.newsStory.count.mockResolvedValue(1);
      prisma.newsStory.findMany.mockResolvedValue([storyRecord('a')]);
      prisma.savedStory.findMany.mockResolvedValue([{ storyId: 'a' }]);

      const result = await service.browse('user-1', {});
      expect(result.stories[0].savedByViewer).toBe(true);
    });

    it('marks a story as not saved when the viewer has not saved it', async () => {
      prisma.newsStory.findMany.mockResolvedValue([storyRecord('a')]);
      prisma.savedStory.findMany.mockResolvedValue([]);

      const result = await service.browse('user-1', {});
      expect(result.stories[0].savedByViewer).toBe(false);
    });

    it('never exposes an article body field — only headline/highlight/originalUrl', async () => {
      prisma.newsStory.findMany.mockResolvedValue([storyRecord('a')]);
      const result = await service.browse('user-1', {});
      expect(result.stories[0]).not.toHaveProperty('body');
      expect(result.stories[0]).not.toHaveProperty('fullText');
    });
  });

  describe('getStory', () => {
    it('throws when the story does not exist or is not approved', async () => {
      prisma.newsStory.findFirst.mockResolvedValue(null);
      await expect(
        service.getStory('user-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('includes the original attribution link in the detail view', async () => {
      prisma.newsStory.findFirst.mockResolvedValue(storyRecord('a'));
      const result = await service.getStory('user-1', 'a');
      expect(result.originalUrl).toBe('https://example.com/story');
    });
  });

  describe('save / unsave', () => {
    it('throws when saving a story that does not exist', async () => {
      prisma.newsStory.findFirst.mockResolvedValue(null);
      await expect(service.save('user-1', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('upserts on save so re-saving is idempotent', async () => {
      prisma.newsStory.findFirst.mockResolvedValue(storyRecord('a'));
      await service.save('user-1', 'a');
      expect(prisma.savedStory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_storyId: { userId: 'user-1', storyId: 'a' } },
        }),
      );
    });

    it('deletes the saved-story row on unsave', async () => {
      await service.unsave('user-1', 'a');
      expect(prisma.savedStory.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', storyId: 'a' },
      });
    });
  });
});

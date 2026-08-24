import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClubFeedService } from './club-feed.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  clubPost: Record<string, jest.Mock>;
  clubPostReaction: Record<string, jest.Mock>;
};

function createMockPrisma(): MockPrisma {
  return {
    clubPost: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'p1', createdAt: new Date() }),
      update: jest.fn().mockResolvedValue({}),
    },
    clubPostReaction: {
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  };
}

const post = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  clubId: 'club-1',
  authorId: 'author-1',
  deletedAt: null,
  ...overrides,
});

describe('ClubFeedService', () => {
  let service: ClubFeedService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new ClubFeedService(prisma as unknown as PrismaService);
  });

  describe('list', () => {
    it('excludes soft-deleted posts', async () => {
      await service.list('club-1', 'me');

      expect(prisma.clubPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId: 'club-1', deletedAt: null },
        }),
      );
    });

    it('collapses reactions to a count per emoji and flags the viewer’s own', async () => {
      prisma.clubPost.findMany.mockResolvedValue([
        {
          ...post(),
          body: 'Hello',
          createdAt: new Date(),
          author: {
            id: 'author-1',
            firstName: 'Ana',
            lastName: 'Diaz',
            photoUrl: null,
          },
          reactions: [
            { emoji: '👍', userId: 'me' },
            { emoji: '👍', userId: 'other' },
            { emoji: '🎾', userId: 'other' },
          ],
        },
      ]);

      const { posts } = await service.list('club-1', 'me');

      expect(posts[0].reactions).toEqual([
        { emoji: '👍', count: 2, mine: true },
        { emoji: '🎾', count: 1, mine: false },
      ]);
      expect(posts[0].author?.name).toBe('Ana Diaz');
    });

    it('keeps a post readable after its author is deleted', async () => {
      prisma.clubPost.findMany.mockResolvedValue([
        {
          ...post({ authorId: null }),
          body: 'Still here',
          createdAt: new Date(),
          author: null,
          reactions: [],
        },
      ]);

      const { posts } = await service.list('club-1', 'me');

      expect(posts[0].author).toBeNull();
      expect(posts[0].body).toBe('Still here');
    });
  });

  describe('remove', () => {
    it('lets an author soft-delete their own post', async () => {
      prisma.clubPost.findUnique.mockResolvedValue(post());

      await service.remove('club-1', 'p1', 'author-1');

      expect(prisma.clubPost.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { deletedAt: expect.any(Date), deletedById: 'author-1' },
      });
    });

    it('lets an ADMIN moderate someone else’s post', async () => {
      prisma.clubPost.findUnique.mockResolvedValue(post());

      await service.remove('club-1', 'p1', 'admin-1', 'ADMIN');

      expect(prisma.clubPost.update).toHaveBeenCalled();
    });

    it('refuses a non-author with no moderator role', async () => {
      prisma.clubPost.findUnique.mockResolvedValue(post());

      await expect(
        service.remove('club-1', 'p1', 'someone-else', 'READ_ONLY'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.clubPost.update).not.toHaveBeenCalled();
    });

    it('hides a post belonging to another club behind not-found', async () => {
      prisma.clubPost.findUnique.mockResolvedValue(
        post({ clubId: 'other-club' }),
      );

      await expect(
        service.remove('club-1', 'p1', 'author-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('treats an already-deleted post as gone', async () => {
      prisma.clubPost.findUnique.mockResolvedValue(
        post({ deletedAt: new Date() }),
      );

      await expect(
        service.remove('club-1', 'p1', 'author-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reactions', () => {
    it('upserts so reacting twice with the same emoji is idempotent', async () => {
      prisma.clubPost.findUnique.mockResolvedValue(post());

      await service.react('club-1', 'p1', 'me', { emoji: '👍' });

      expect(prisma.clubPostReaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            postId_userId_emoji: { postId: 'p1', userId: 'me', emoji: '👍' },
          },
        }),
      );
    });

    it('removes only the caller’s own reaction', async () => {
      prisma.clubPost.findUnique.mockResolvedValue(post());

      await service.unreact('club-1', 'p1', 'me', { emoji: '👍' });

      expect(prisma.clubPostReaction.deleteMany).toHaveBeenCalledWith({
        where: { postId: 'p1', userId: 'me', emoji: '👍' },
      });
    });
  });
});

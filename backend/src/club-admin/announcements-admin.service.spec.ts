import { NotFoundException } from '@nestjs/common';
import { AnnouncementsAdminService } from './announcements-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type MockPrisma = {
  announcement: Record<string, jest.Mock>;
  club: Record<string, jest.Mock>;
  clubMembership: Record<string, jest.Mock>;
};

function createMockPrisma(): MockPrisma {
  return {
    announcement: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockResolvedValue({ id: 'ann-1', authorId: 'author-1' }),
      update: jest.fn().mockResolvedValue({
        id: 'ann-1',
        authorId: 'author-1',
        title: 'Court closed',
      }),
      findUnique: jest.fn(),
    },
    // Only reached on the publish path, where notifyMembers fans out.
    club: { findUnique: jest.fn().mockResolvedValue({ name: 'Test Club' }) },
    clubMembership: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('AnnouncementsAdminService', () => {
  let service: AnnouncementsAdminService;
  let prisma: MockPrisma;
  let notifications: { [K in keyof NotificationsService]?: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrisma();
    notifications = { create: jest.fn().mockResolvedValue(undefined) };
    service = new AnnouncementsAdminService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  describe('create', () => {
    it('defaults to DRAFT with no publishedAt', async () => {
      await service.create('club-1', 'author-1', {
        title: 'Court closed',
        body: 'Court 3 closed for maintenance.',
      });

      expect(prisma.announcement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'DRAFT',
          publishedAt: null,
        }),
      });
    });

    it('stamps publishedAt when created directly as PUBLISHED', async () => {
      await service.create('club-1', 'author-1', {
        title: 'Court closed',
        body: 'Court 3 closed for maintenance.',
        status: 'PUBLISHED',
      });

      expect(prisma.announcement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('update', () => {
    it('throws when the announcement belongs to a different club', async () => {
      prisma.announcement.findUnique.mockResolvedValue({
        id: 'a1',
        clubId: 'other-club',
        status: 'DRAFT',
      });
      await expect(
        service.update('club-1', 'a1', { title: 'Renamed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('stamps publishedAt only on the DRAFT -> PUBLISHED transition, not every update', async () => {
      prisma.announcement.findUnique.mockResolvedValue({
        id: 'a1',
        clubId: 'club-1',
        status: 'PUBLISHED',
      });

      await service.update('club-1', 'a1', { pinned: true });

      expect(prisma.announcement.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: expect.objectContaining({ publishedAt: undefined }),
      });
    });
  });
  describe('list — draft visibility', () => {
    it('hides drafts from an ordinary member', async () => {
      await service.list('club-1', 'READ_ONLY');

      expect(prisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId: 'club-1', status: 'PUBLISHED' },
        }),
      );
    });

    it('hides drafts when there is no role at all', async () => {
      await service.list('club-1');

      expect(prisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId: 'club-1', status: 'PUBLISHED' },
        }),
      );
    });

    it('shows drafts to an authoring role', async () => {
      await service.list('club-1', 'CONTENT_MANAGER');

      expect(prisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: 'club-1' } }),
      );
    });
  });

  describe('publish fan-out', () => {
    beforeEach(() => {
      prisma.clubMembership.findMany.mockResolvedValue([
        { userId: 'member-1' },
        { userId: 'member-2' },
      ]);
    });

    it('notifies members when created straight to PUBLISHED', async () => {
      await service.create('club-1', 'author-1', {
        title: 'Court closed',
        body: 'Court 3 is shut.',
        status: 'PUBLISHED',
      });

      expect(notifications.create).toHaveBeenCalledTimes(2);
      expect(notifications.create).toHaveBeenCalledWith(
        'member-1',
        'CLUBS',
        'Court closed',
        expect.any(String),
        'CLUB_ANNOUNCEMENT',
        'club-1',
      );
    });

    it('never notifies for a draft', async () => {
      await service.create('club-1', 'author-1', {
        title: 'Draft',
        body: 'Not ready.',
        status: 'DRAFT',
      });

      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('excludes the author from the fan-out', async () => {
      await service.create('club-1', 'author-1', {
        title: 'Court closed',
        body: 'Court 3 is shut.',
        status: 'PUBLISHED',
      });

      expect(prisma.clubMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            userId: { not: 'author-1' },
          }),
        }),
      );
    });

    it('notifies on the draft -> published edge', async () => {
      prisma.announcement.findUnique.mockResolvedValue({
        id: 'ann-1',
        clubId: 'club-1',
        status: 'DRAFT',
      });

      await service.update('club-1', 'ann-1', { status: 'PUBLISHED' });

      expect(notifications.create).toHaveBeenCalled();
    });

    it('stays quiet when editing something already published', async () => {
      prisma.announcement.findUnique.mockResolvedValue({
        id: 'ann-1',
        clubId: 'club-1',
        status: 'PUBLISHED',
      });

      await service.update('club-1', 'ann-1', {
        status: 'PUBLISHED',
        title: 'Court closed (typo fixed)',
      });

      expect(notifications.create).not.toHaveBeenCalled();
    });
  });
});

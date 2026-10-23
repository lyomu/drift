import { BadRequestException, ConflictException } from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { PlatformAdminController } from './platform-admin.controller';
import { PLATFORM_PERMISSIONS_KEY } from './decorators/require-platform-permission.decorator';

const draft = {
  id: 'story',
  editorialVersion: 2,
  moderationStatus: 'PENDING',
  source: {
    rights: { status: 'APPROVED', headlineAllowed: true, excerptAllowed: true },
  },
};
const edit = {
  headline: 'A verified tennis update',
  highlight: 'A short factual summary of the verified update.',
  categories: ['PLAYERS'],
  editorialVersion: 2,
  reason: 'Corrected the preview',
};

function setup() {
  const tx = {
    newsStory: {
      findUnique: jest.fn().mockResolvedValue(draft),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ ...draft, editorialVersion: 3 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    newsCategoryConfig: { count: jest.fn().mockResolvedValue(1) },
    adminAuditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    newsSettings: {
      upsert: jest.fn().mockResolvedValue({ ingestionPaused: true }),
    },
    newsCategoryConfig: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const audit = { record: jest.fn() };
  const service = new PlatformAdminService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
  );
  return { service, prisma, tx, audit };
}

describe('news management', () => {
  it('separates editorial actions from source and settings configuration', () => {
    const requirements = (method: keyof PlatformAdminController) =>
      Reflect.getMetadata(
        PLATFORM_PERMISSIONS_KEY,
        PlatformAdminController.prototype[method],
      );
    expect(requirements('moderateStory')).toEqual(['CONTENT_MANAGE']);
    expect(requirements('updateNewsStory')).toEqual(['CONTENT_MANAGE']);
    expect(requirements('updateNewsSourceRights')).toEqual([
      'CONTENT_MANAGE',
      'PLATFORM_CONFIG_MANAGE',
    ]);
    expect(requirements('updateNewsSettings')).toEqual([
      'CONTENT_MANAGE',
      'PLATFORM_CONFIG_MANAGE',
    ]);
    expect(requirements('syncNewsSource')).toEqual([
      'CONTENT_MANAGE',
      'PLATFORM_CONFIG_MANAGE',
    ]);
    expect(requirements('listNewsAudit')).toEqual(['AUDIT_READ']);
  });
  it('edits a pending preview with an atomic version check and audit record', async () => {
    const { service, tx } = setup();
    await service.updateNewsStory('admin', 'story', edit);
    expect(tx.newsStory.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'story',
          editorialVersion: 2,
          moderationStatus: 'PENDING',
        },
      }),
    );
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'story.edit',
          actorId: 'admin',
        }),
      }),
    );
  });

  it('rejects a stale editor and a published story', async () => {
    const { service, tx } = setup();
    tx.newsStory.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.updateNewsStory('admin', 'story', edit),
    ).rejects.toBeInstanceOf(ConflictException);
    tx.newsStory.findUnique.mockResolvedValue({
      ...draft,
      moderationStatus: 'APPROVED',
    });
    await expect(
      service.updateNewsStory('admin', 'story', edit),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents disabled categories being assigned to a story', async () => {
    const { service, tx } = setup();
    tx.newsCategoryConfig.count.mockResolvedValue(0);
    await expect(
      service.updateNewsStory('admin', 'story', edit),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('audits a global ingestion pause', async () => {
    const { service, prisma, audit } = setup();
    const settings = {
      ingestionPaused: true,
      aiEnabled: false,
      automaticPublishingEnabled: false,
      aiDailyRequestLimit: 100,
      aiSummaryMaxCharacters: 240,
    };
    await service.updateNewsSettings('admin', settings);
    expect(prisma.newsSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: settings }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      'admin',
      'news_settings.update',
      'NewsSettings',
      'default',
      settings,
    );
  });
});

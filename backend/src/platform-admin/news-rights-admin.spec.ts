import { BadRequestException } from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import type { UpdateNewsSourceRightsDto } from './dto/platform-admin.dto';

const rights: UpdateNewsSourceRightsDto = {
  status: 'APPROVED',
  permissionReference: 'Publisher agreement 2026-10-22',
  commercialUseAllowed: true,
  headlineAllowed: true,
  excerptAllowed: true,
  imageAllowed: false,
  aiProcessingAllowed: false,
  automaticPublishingAllowed: false,
  cacheAllowed: true,
  attributionText: 'Test Publisher',
};

function setup() {
  const tx = {
    newsSourceRights: {
      upsert: jest.fn().mockResolvedValue({ status: 'APPROVED' }),
      updateMany: jest.fn(),
    },
    newsSource: { update: jest.fn().mockResolvedValue({ id: 'source' }) },
    newsStory: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    adminAuditLog: { create: jest.fn() },
  };
  const prisma = {
    newsSource: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'source',
        name: 'Test',
        feedUrl: 'https://publisher.example/feed',
        status: 'PAUSED',
        rights: null,
      }),
      create: jest.fn().mockResolvedValue({ id: 'source', status: 'PAUSED' }),
    },
    newsStory: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
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
  return { service, prisma, audit, tx };
}

describe('news admin rights gate', () => {
  it('creates a new source active so it starts fetching immediately', async () => {
    const { service, prisma } = setup();
    await service.createNewsSource('admin', {
      name: 'Test',
      feedUrl: 'https://publisher.example/feed',
      status: 'ACTIVE',
    });
    expect(prisma.newsSource.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'ACTIVE', publicationMode: 'MANUAL' }),
    });
  });

  it('activates a source that has no rights review', async () => {
    const { service, tx } = setup();
    await service.updateNewsSource('admin', 'source', {
      name: 'Test',
      feedUrl: 'https://publisher.example/feed',
      status: 'ACTIVE',
    });
    expect(tx.newsSource.update).toHaveBeenCalledWith({
      where: { id: 'source' },
      data: expect.objectContaining({ status: 'ACTIVE' }),
    });
  });

  it('still refuses automatic publishing without approved rights', async () => {
    const { service } = setup();
    await expect(
      service.updateNewsSource('admin', 'source', {
        name: 'Test',
        feedUrl: 'https://publisher.example/feed',
        status: 'ACTIVE',
        publicationMode: 'AUTO',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires evidence before rights approval', async () => {
    const { service } = setup();
    await expect(
      service.updateNewsSourceRights('admin', 'source', {
        ...rights,
        permissionReference: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('pauses and withdraws stories in the same transaction when rights are revoked', async () => {
    const { service, tx } = setup();
    await service.updateNewsSourceRights('admin', 'source', {
      ...rights,
      status: 'REVOKED',
    });
    expect(tx.newsSource.update).toHaveBeenCalledWith({
      where: { id: 'source' },
      data: { status: 'PAUSED', publicationMode: 'MANUAL' },
    });
    expect(tx.newsStory.updateMany).toHaveBeenCalledWith({
      where: { sourceId: 'source', moderationStatus: 'APPROVED' },
      data: { moderationStatus: 'PENDING', publishedAt: null },
    });
    expect(tx.adminAuditLog.create).toHaveBeenCalled();
  });

  it('blocks approving an item whose source lacks rights', async () => {
    const { service, tx } = setup();
    tx.newsStory.findUnique.mockResolvedValue({
      id: 'story',
      headline: 'Test',
      highlight: 'Test preview',
      originalUrl: 'https://publisher.example/story',
      source: { status: 'ACTIVE', rights: null },
    });
    await expect(
      service.moderateStory('admin', 'story', 'APPROVED'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('archives a story with a reason and clears its publication date', async () => {
    const { service, tx } = setup();
    tx.newsStory.findUnique.mockResolvedValue({
      id: 'story',
      headline: 'Test',
    });
    tx.newsStory.update.mockResolvedValue({
      id: 'story',
      moderationStatus: 'ARCHIVED',
    });
    await service.moderateStory(
      'admin',
      'story',
      'ARCHIVED',
      'No longer timely',
    );
    expect(tx.newsStory.update).toHaveBeenCalledWith({
      where: { id: 'story' },
      data: { moderationStatus: 'ARCHIVED', publishedAt: null },
    });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: { headline: 'Test', reason: 'No longer timely' },
        }),
      }),
    );
  });
});

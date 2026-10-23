import {
  NewsIngestionService,
  canonicalNewsUrl,
} from './news-ingestion.service';
import { PrismaService } from '../prisma/prisma.service';
import { fetchFeedDocument } from './feed-fetch';
import { FeedUrlError } from './feed-fetch';
import { NewsAiService } from './news-ai.service';

jest.mock('./feed-fetch', () => ({
  ...jest.requireActual('./feed-fetch'),
  fetchFeedDocument: jest.fn(),
}));

const XML = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Controlled tennis feed</title>
<item><guid>one</guid><title>Player announces a tennis clinic</title>
<link>https://publisher.example/tennis/clinic?utm_source=rss</link>
<description>A short test description.</description>
<pubDate>Thu, 22 Oct 2026 08:00:00 GMT</pubDate></item>
</channel></rss>`;

function setup() {
  const prisma = {
    newsSettings: {
      findUnique: jest.fn().mockResolvedValue({ ingestionPaused: false }),
    },
    newsSource: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'source',
        feedUrl: 'https://publisher.example/feed',
        pollIntervalMinutes: 30,
        status: 'ACTIVE',
        publicationMode: 'MANUAL',
        consecutiveFailures: 0,
        rights: { aiProcessingAllowed: false },
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    newsIngestionRun: {
      create: jest.fn().mockResolvedValue({ id: 'run' }),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    newsStory: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'story' }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    newsCategoryConfig: {
      findMany: jest.fn().mockResolvedValue([{ slug: 'LATEST' }]),
    },
    newsAutomationEvent: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((value: unknown) =>
    typeof value === 'function'
      ? (value as (tx: typeof prisma) => Promise<unknown>)(prisma)
      : Promise.all(value as Promise<unknown>[]),
  );
  const ai = {
    configured: false,
    model: 'test',
    providerName: 'test',
    process: jest.fn(),
  };
  const service = new NewsIngestionService(
    prisma as unknown as PrismaService,
    ai as unknown as NewsAiService,
  );
  return { service, prisma, ai };
}

describe('NewsIngestionService', () => {
  beforeEach(() => jest.resetAllMocks());

  it('normalizes only known tracking parameters', () => {
    expect(
      canonicalNewsUrl(
        'https://publisher.example/tennis?a=1&utm_source=rss&b=2#section',
      ),
    ).toBe('https://publisher.example/tennis?a=1&b=2');
  });

  it('imports a controlled item into manual review and records the run', async () => {
    const { service, prisma } = setup();
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: XML,
      httpStatus: 200,
      finalUrl: 'https://publisher.example/feed',
      redirectCount: 0,
      latencyMs: 1,
      etag: null,
      lastModified: null,
    });
    await expect(service.ingestSource('source')).resolves.toEqual({
      created: 1,
      skipped: 0,
      errors: 0,
    });
    expect(prisma.newsStory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        originalUrl: 'https://publisher.example/tennis/clinic',
        moderationStatus: 'PENDING',
      }),
    });
    expect(prisma.newsIngestionRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUCCESS', createdCount: 1 }),
      }),
    );
    expect(prisma.newsSource.updateMany).toHaveBeenCalledTimes(2);
  });

  it('accepts an Atom entry with a safe publisher link', async () => {
    const { service, prisma } = setup();
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Tennis feed</title><entry><id>atom-1</id><title>Tennis event announced</title><link href="https://publisher.example/tennis/event"/><summary>A factual event announcement.</summary><updated>2026-10-22T08:00:00Z</updated></entry></feed>`,
      httpStatus: 200,
      finalUrl: 'https://publisher.example/atom',
      redirectCount: 0,
      latencyMs: 1,
      etag: null,
      lastModified: null,
    });
    await expect(service.ingestSource('source')).resolves.toMatchObject({
      created: 1,
      errors: 0,
    });
    expect(prisma.newsStory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          originalUrl: 'https://publisher.example/tennis/event',
        }),
      }),
    );
  });

  it('stores a publisher enclosure only when image reuse is approved', async () => {
    const { service, prisma } = setup();
    prisma.newsSource.findUniqueOrThrow.mockResolvedValue({
      id: 'source',
      feedUrl: 'https://publisher.example/feed',
      pollIntervalMinutes: 30,
      status: 'ACTIVE',
      publicationMode: 'MANUAL',
      rights: { imageAllowed: true, aiProcessingAllowed: false },
    });
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: XML.replace(
        '</item>',
        '<enclosure url="https://publisher.example/photo.jpg" type="image/jpeg"/></item>',
      ),
      httpStatus: 200,
      finalUrl: 'https://publisher.example/feed',
      redirectCount: 0,
      latencyMs: 1,
      etag: null,
      lastModified: null,
    });
    await service.ingestSource('source');
    expect(prisma.newsStory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: 'https://publisher.example/photo.jpg',
        }),
      }),
    );
  });

  it('records a 304 without parsing or importing an item', async () => {
    const { service, prisma } = setup();
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: null,
      httpStatus: 304,
      finalUrl: 'https://publisher.example/feed',
      redirectCount: 0,
      latencyMs: 1,
      etag: '"old"',
      lastModified: null,
    });
    await expect(service.ingestSource('source')).resolves.toMatchObject({
      created: 0,
      errors: 0,
    });
    expect(prisma.newsStory.create).not.toHaveBeenCalled();
    expect(prisma.newsIngestionRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUCCESS', httpStatus: 304 }),
      }),
    );
  });

  it('prunes only finished ingestion runs after the configured retention period', async () => {
    const { service, prisma } = setup();
    prisma.newsSettings.findUnique.mockResolvedValue({ runRetentionDays: 30 });
    await service.pruneOldRuns();
    expect(prisma.newsIngestionRun.deleteMany).toHaveBeenCalledWith({
      where: { finishedAt: { lt: expect.any(Date) } },
    });
  });

  it('counts a repeated GUID or canonical URL as a duplicate', async () => {
    const { service, prisma } = setup();
    prisma.newsStory.findFirst.mockResolvedValueOnce({ id: 'existing' });
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: XML,
      httpStatus: 200,
      finalUrl: 'https://publisher.example/feed',
      redirectCount: 0,
      latencyMs: 1,
      etag: null,
      lastModified: null,
    });
    await expect(service.ingestSource('source')).resolves.toMatchObject({
      created: 0,
      errors: 0,
    });
    expect(prisma.newsStory.create).not.toHaveBeenCalled();
    expect(prisma.newsIngestionRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ duplicateCount: 1 }),
      }),
    );
  });

  it('flags a similar title on a different URL for human review', async () => {
    const { service, prisma } = setup();
    prisma.newsStory.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'similar' });
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: XML,
      httpStatus: 200,
      finalUrl: 'https://publisher.example/feed',
      redirectCount: 0,
      latencyMs: 1,
      etag: null,
      lastModified: null,
    });
    await service.ingestSource('source');
    expect(prisma.newsStory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewFlags: ['SIMILAR_TITLE'],
          moderationStatus: 'PENDING',
        }),
      }),
    );
  });

  it('lets only one concurrent worker claim the same source lease', async () => {
    const { service, prisma } = setup();
    prisma.newsSource.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: XML,
      httpStatus: 200,
      finalUrl: 'https://publisher.example/feed',
      redirectCount: 0,
      latencyMs: 1,
      etag: null,
      lastModified: null,
    });
    const results = await Promise.all([
      service.ingestSource('source'),
      service.ingestSource('source'),
    ]);
    expect(results.map((result) => result.created).sort()).toEqual([0, 1]);
    expect(fetchFeedDocument).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed XML and never creates a story', async () => {
    const { service, prisma } = setup();
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: '<rss><channel><item>',
      httpStatus: 200,
      finalUrl: 'https://publisher.example/feed',
      redirectCount: 0,
      latencyMs: 1,
      etag: null,
      lastModified: null,
    });
    await expect(service.ingestSource('source')).resolves.toMatchObject({
      errors: 1,
    });
    expect(prisma.newsStory.create).not.toHaveBeenCalled();
  });

  it('removes markup from imported preview text', async () => {
    const { service, prisma } = setup();
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: XML.replace(
        'A short test description.',
        '&lt;b&gt;A short&lt;/b&gt; test description.',
      ),
      httpStatus: 200,
      finalUrl: 'https://publisher.example/feed',
      redirectCount: 0,
      latencyMs: 1,
      etag: null,
      lastModified: null,
    });
    await service.ingestSource('source');
    expect(prisma.newsStory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          highlight: 'A short test description.',
        }),
      }),
    );
  });

  it.each([403, 429, 500])(
    'records HTTP %s and avoids aggressive retry',
    async (status) => {
      const { service, prisma } = setup();
      jest
        .mocked(fetchFeedDocument)
        .mockRejectedValue(
          new FeedUrlError(`Feed responded with HTTP ${status}`, status),
        );
      await expect(service.ingestSource('source')).resolves.toMatchObject({
        errors: 1,
      });
      expect(prisma.newsIngestionRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            httpStatus: status,
            status: 'FAILED',
          }),
        }),
      );
      expect(prisma.newsSource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: status === 403 ? 'BLOCKED' : 'ACTIVE',
          }),
        }),
      );
    },
  );

  it('does not claim or fetch sources during a global pause', async () => {
    const { service, prisma } = setup();
    prisma.newsSettings.findUnique.mockResolvedValue({ ingestionPaused: true });
    await expect(service.ingestSource('source')).resolves.toEqual({
      created: 0,
      skipped: 0,
      errors: 0,
    });
    expect(prisma.newsSource.updateMany).not.toHaveBeenCalled();
    expect(fetchFeedDocument).not.toHaveBeenCalled();
  });

  it('does not fetch when another worker holds the lease', async () => {
    const { service, prisma } = setup();
    prisma.newsSource.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.ingestSource('source')).resolves.toEqual({
      created: 0,
      skipped: 0,
      errors: 0,
    });
    expect(fetchFeedDocument).not.toHaveBeenCalled();
  });

  it('rejects DTD input and logs a failed run without importing articles', async () => {
    const { service, prisma } = setup();
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>',
      httpStatus: 200,
      finalUrl: 'https://publisher.example/feed',
      redirectCount: 0,
      latencyMs: 1,
      etag: null,
      lastModified: null,
    });
    await expect(service.ingestSource('source')).resolves.toEqual({
      created: 0,
      skipped: 0,
      errors: 1,
    });
    expect(prisma.newsStory.create).not.toHaveBeenCalled();
    expect(prisma.newsIngestionRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          errorCode: 'INVALID_XML',
        }),
      }),
    );
  });

  it('keeps an imported story pending when AI fails', async () => {
    const { service, prisma, ai } = setup();
    prisma.newsSettings.findUnique.mockResolvedValue({
      aiEnabled: true,
      ingestionPaused: false,
      aiSummaryMaxCharacters: 240,
      aiDailyRequestLimit: 100,
    });
    prisma.newsSource.findUniqueOrThrow.mockResolvedValue({
      id: 'source',
      feedUrl: 'https://publisher.example/feed',
      status: 'ACTIVE',
      pollIntervalMinutes: 30,
      publicationMode: 'MANUAL',
      rights: { aiProcessingAllowed: true },
    });
    ai.configured = true;
    ai.process.mockRejectedValue(new Error('provider offline'));
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: XML,
      httpStatus: 200,
      finalUrl: 'https://publisher.example/feed',
      redirectCount: 0,
      latencyMs: 1,
      etag: null,
      lastModified: null,
    });
    await expect(service.ingestSource('source')).resolves.toMatchObject({
      created: 1,
      errors: 0,
    });
    expect(prisma.newsStory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { aiErrorCode: 'AI_PROCESSING_FAILED' },
      }),
    );
    expect(prisma.newsStory.updateMany).not.toHaveBeenCalled();
  });

  it('publishes only a clean, high confidence item with both automation gates', async () => {
    const { service, prisma, ai } = setup();
    prisma.newsSettings.findUnique.mockResolvedValue({
      aiEnabled: true,
      automaticPublishingEnabled: true,
      ingestionPaused: false,
      aiSummaryMaxCharacters: 240,
      aiDailyRequestLimit: 100,
    });
    prisma.newsSource.findUniqueOrThrow.mockResolvedValue({
      id: 'source',
      feedUrl: 'https://publisher.example/feed',
      status: 'ACTIVE',
      pollIntervalMinutes: 30,
      publicationMode: 'AUTO',
      rights: { aiProcessingAllowed: true },
    });
    ai.configured = true;
    ai.process.mockResolvedValue({
      summary: 'A tennis clinic was announced.',
      categorySlug: 'LATEST',
      tags: [],
      players: [],
      tournaments: [],
      language: 'en',
      relevanceScore: 0.95,
      confidence: 0.95,
      riskFlags: [],
    });
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: XML.replace(
        'A short test description.',
        'A tennis player announced a new clinic for local players next month.',
      ),
      httpStatus: 200,
      finalUrl: 'https://publisher.example/feed',
      redirectCount: 0,
      latencyMs: 1,
      etag: null,
      lastModified: null,
    });
    await expect(service.ingestSource('source')).resolves.toMatchObject({
      created: 1,
      errors: 0,
    });
    expect(prisma.newsStory.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ moderationStatus: 'APPROVED' }),
      }),
    );
    expect(prisma.newsAutomationEvent.create).toHaveBeenCalledTimes(1);
  });

  it('routes flagged AI content to review even when automation is enabled', async () => {
    const { service, prisma, ai } = setup();
    prisma.newsSettings.findUnique.mockResolvedValue({
      aiEnabled: true,
      automaticPublishingEnabled: true,
      ingestionPaused: false,
      aiSummaryMaxCharacters: 240,
      aiDailyRequestLimit: 100,
    });
    prisma.newsSource.findUniqueOrThrow.mockResolvedValue({
      id: 'source',
      feedUrl: 'https://publisher.example/feed',
      status: 'ACTIVE',
      pollIntervalMinutes: 30,
      publicationMode: 'AUTO',
      rights: { aiProcessingAllowed: true },
    });
    ai.configured = true;
    ai.process.mockResolvedValue({
      summary: 'A tennis clinic was announced.',
      categorySlug: 'LATEST',
      tags: [],
      players: [],
      tournaments: [],
      language: 'en',
      relevanceScore: 0.95,
      confidence: 0.95,
      riskFlags: ['unverified_claim'],
    });
    jest.mocked(fetchFeedDocument).mockResolvedValue({
      xml: XML.replace(
        'A short test description.',
        'A tennis player announced a new clinic for local players next month.',
      ),
      httpStatus: 200,
      finalUrl: 'https://publisher.example/feed',
      redirectCount: 0,
      latencyMs: 1,
      etag: null,
      lastModified: null,
    });
    await expect(service.ingestSource('source')).resolves.toMatchObject({
      created: 1,
      errors: 0,
    });
    expect(prisma.newsStory.updateMany).not.toHaveBeenCalled();
    expect(prisma.newsAutomationEvent.create).not.toHaveBeenCalled();
  });
});

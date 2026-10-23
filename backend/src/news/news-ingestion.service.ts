import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import Parser from 'rss-parser';
import { fetchFeedDocument, FeedUrlError } from './feed-fetch';
import { PrismaService } from '../prisma/prisma.service';
import { safePublisherUrl } from './news-rights';
import { NewsAiService } from './news-ai.service';
import { NewsAiProviderError } from './news-ai.provider';
import { newsIngestionRunsTotal, newsIngestionStoriesTotal, newsSourcesBlocked } from '../metrics/metrics.registry';

// One feed may contain 20 AI-eligible items; two bounded provider attempts per
// item can take about ten minutes. Keep the lease longer than that batch.
const LEASE_MS = 15 * 60_000;
const MAX_ITEMS = 20;

function cleanFeedText(value: string | undefined, maxLength: number): string {
  return (value ?? '').replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function nextNewsPollAt(intervalMinutes: number, failureCount = 0, now = Date.now()): Date {
  const base = Math.max(15, Math.min(120, intervalMinutes)) * 60_000;
  const backoff = Math.min(24 * 60 * 60_000, base * 2 ** Math.min(failureCount, 6));
  const jitter = Math.floor(Math.random() * Math.min(backoff * 0.1, 5 * 60_000));
  return new Date(now + backoff + jitter);
}

export function canonicalNewsUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || ['fbclid', 'gclid'].includes(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  return url.toString();
}

/** Polls only rights-cleared sources. The database lease prevents duplicate work across API replicas. */
@Injectable()
export class NewsIngestionService {
  private readonly logger = new Logger(NewsIngestionService.name);
  private readonly parser = new Parser<
    Record<string, never>,
    {
      link?: string;
      guid?: string;
      title?: string;
      contentSnippet?: string;
      isoDate?: string;
      enclosure?: { url?: string; type?: string };
    }
  >({ timeout: 10_000 });

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: NewsAiService,
  ) {}

  @Cron('* * * * *')
  async ingestAll() {
    try {
      await this.ingest();
    } finally {
      newsSourcesBlocked.set(await this.prisma.newsSource.count({ where: { status: 'BLOCKED' } }));
    }
  }

  @Cron('15 3 * * *')
  async pruneOldRuns() {
    const settings = await this.prisma.newsSettings.findUnique({ where: { id: 'default' } });
    const days = Math.max(7, Math.min(365, settings?.runRetentionDays ?? 90));
    return this.prisma.newsIngestionRun.deleteMany({
      where: { finishedAt: { lt: new Date(Date.now() - days * 24 * 60 * 60_000) } },
    });
  }

  async ingest(): Promise<{
    created: number;
    skipped: number;
    errors: number;
  }> {
    const settings = await this.prisma.newsSettings.findUnique({
      where: { id: 'default' },
    });
    if (settings?.ingestionPaused) return { created: 0, skipped: 0, errors: 0 };
    const now = new Date();
    const sources = await this.prisma.newsSource.findMany({
      where: {
        status: 'ACTIVE',
        feedUrl: { not: null },
        OR: [{ nextPollAt: null }, { nextPollAt: { lte: now } }],
        rights: {
          is: {
            status: 'APPROVED',
            commercialUseAllowed: true,
            headlineAllowed: true,
            excerptAllowed: true,
            cacheAllowed: true,
            reviewedBy: { not: null },
            reviewedAt: { not: null },
            permissionReference: { not: null },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        },
      },
      select: { id: true },
      take: 20,
      orderBy: [{ nextPollAt: 'asc' }, { id: 'asc' }],
    });

    const total = { created: 0, skipped: 0, errors: 0 };
    for (const source of sources) {
      try {
        const result = await this.ingestSource(source.id);
        total.created += result.created;
        total.skipped += result.skipped;
        total.errors += result.errors;
      } catch {
        total.errors++;
        this.logger.error(
          `News source ${source.id} failed before run completion`,
        );
      }
    }
    return total;
  }

  async ingestSource(
    sourceId: string,
  ): Promise<{ created: number; skipped: number; errors: number }> {
    const result = { created: 0, skipped: 0, errors: 0 };
    const settings = await this.prisma.newsSettings.findUnique({
      where: { id: 'default' },
    });
    if (settings?.ingestionPaused) return result;
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + LEASE_MS);
    const claimed = await this.prisma.newsSource.updateMany({
      where: {
        id: sourceId,
        status: 'ACTIVE',
        feedUrl: { not: null },
        OR: [{ syncLeaseUntil: null }, { syncLeaseUntil: { lte: now } }],
        AND: [
          { OR: [{ nextPollAt: null }, { nextPollAt: { lte: now } }] },
          {
            rights: {
              is: {
                status: 'APPROVED',
                commercialUseAllowed: true,
                headlineAllowed: true,
                excerptAllowed: true,
                cacheAllowed: true,
                reviewedBy: { not: null },
                reviewedAt: { not: null },
                permissionReference: { not: null },
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            },
          },
        ],
      },
      data: {
        syncLeaseUntil: leaseUntil,
        lastPolledAt: now,
      },
    });
    if (claimed.count === 0) return result;

    try {
      const source = await this.prisma.newsSource.findUniqueOrThrow({
        where: { id: sourceId },
        include: { rights: true },
      });
      const run = await this.prisma.newsIngestionRun.create({
        data: { sourceId },
      });
      let fetchedCount = 0;
      let duplicateCount = 0;
      let aiFailureCount = 0;
      let autoPublishedCount = 0;
      let fetchedHttpStatus: number | null = null;
      let finalUrl: string | null = null;
      let redirectCount = 0;
      let latencyMs: number | null = null;
      const categories = settings?.aiEnabled && source.rights?.aiProcessingAllowed
        ? await this.prisma.newsCategoryConfig.findMany({
            where: { enabled: true }, select: { slug: true },
          })
        : [];
      try {
        const document = await fetchFeedDocument(source.feedUrl!, {
          etag: source.feedEtag, lastModified: source.feedLastModified,
        });
        fetchedHttpStatus = document.httpStatus;
        finalUrl = document.finalUrl;
        redirectCount = document.redirectCount;
        latencyMs = document.latencyMs;
        const xml = document.xml;
        if (xml === null) {
          await this.prisma.$transaction([
            this.prisma.newsIngestionRun.update({ where: { id: run.id }, data: {
              status: 'SUCCESS', finishedAt: new Date(), httpStatus: 304,
              finalUrl, redirectCount, latencyMs,
            } }),
            this.prisma.newsSource.update({ where: { id: sourceId }, data: {
              lastSuccessAt: new Date(), consecutiveFailures: 0, lastErrorCode: null,
              nextPollAt: nextNewsPollAt(source.pollIntervalMinutes),
            } }),
          ]);
          newsIngestionRunsTotal.inc({ outcome: 'success', http_status: '304' });
          return result;
        }
        if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
          throw new Error('INVALID_XML_DTD');
        }
        const feed = await this.parser.parseString(xml);
        fetchedCount = Math.min(feed.items.length, MAX_ITEMS);
        for (const item of feed.items.slice(0, MAX_ITEMS)) {
          const rawUrl = item.link ?? '';
          const title = cleanFeedText(item.title, 500);
          if (!safePublisherUrl(rawUrl) || !title) {
            result.skipped++;
            continue;
          }
          const canonicalUrl = canonicalNewsUrl(rawUrl);
          const canonicalUrlHash = createHash('sha256')
            .update(canonicalUrl)
            .digest('hex');
          const guid = cleanFeedText(item.guid, 500) || null;
          const existing = await this.prisma.newsStory.findFirst({
            where: { sourceId, OR: [
              { canonicalUrlHash },
              { originalUrl: { in: [rawUrl, canonicalUrl] } },
              ...(guid ? [{ externalGuid: guid }] : []),
            ] },
            select: { id: true },
          });
          if (existing) {
            duplicateCount++;
            continue;
          }
          const parsedDate = item.isoDate ? new Date(item.isoDate) : new Date();
          try {
            const excerpt = cleanFeedText(item.contentSnippet, 300);
            const imageUrl = source.rights?.imageAllowed &&
              item.enclosure?.type?.toLowerCase().startsWith('image/') &&
              safePublisherUrl(item.enclosure.url ?? '')
                ? item.enclosure.url : null;
            const similarTitle = await this.prisma.newsStory.findFirst({
              where: { sourceId, headline: { equals: title, mode: 'insensitive' },
                canonicalUrlHash: { not: canonicalUrlHash } },
              select: { id: true },
            });
            const story = await this.prisma.newsStory.create({
              data: {
                sourceId,
                externalGuid: guid,
                canonicalUrlHash,
                originalUrl: canonicalUrl,
                headline: title,
                originalFeedHeadline: title,
                highlight: excerpt,
                originalFeedExcerpt: excerpt,
                imageUrl,
                reviewFlags: similarTitle ? ['SIMILAR_TITLE'] : [],
                publicationDate: Number.isNaN(parsedDate.getTime())
                  ? new Date()
                  : parsedDate,
                categories: ['LATEST'],
                topics: [],
                moderationStatus: 'PENDING',
              },
            });
            result.created++;
            if (settings?.aiEnabled && source.rights?.aiProcessingAllowed && this.ai.configured) {
              try {
                const processed = await this.ai.process(
                  title, excerpt, settings.aiSummaryMaxCharacters,
                  settings.aiDailyRequestLimit, categories.map((c) => c.slug),
                );
                if (processed) {
                  await this.prisma.newsStory.update({
                    where: { id: story.id },
                    data: {
                      aiSummary: processed.summary,
                      aiProvider: this.ai.providerName,
                      aiModel: this.ai.model,
                      aiConfidence: processed.confidence,
                      aiRelevanceScore: processed.relevanceScore,
                      aiRiskFlags: processed.riskFlags,
                      aiPlayers: processed.players,
                      aiTournaments: processed.tournaments,
                      aiLanguage: processed.language,
                      aiProcessedAt: new Date(),
                      categories: ['LATEST', processed.categorySlug].filter((v, i, a) => a.indexOf(v) === i),
                      topics: processed.tags,
                    },
                  });
                  if (source.publicationMode === 'AUTO' &&
                      settings.automaticPublishingEnabled &&
                      !similarTitle &&
                      processed.riskFlags.length === 0 &&
                      processed.confidence >= 0.9 &&
                      processed.relevanceScore >= 0.8 &&
                      processed.language === 'en' && excerpt.length >= 30) {
                    const published = await this.prisma.$transaction(async (tx) => {
                      const liveSettings = await tx.newsSettings.findUnique({ where: { id: 'default' } });
                      if (!liveSettings?.automaticPublishingEnabled || liveSettings.ingestionPaused) return false;
                      const changed = await tx.newsStory.updateMany({
                        where: {
                          id: story.id, moderationStatus: 'PENDING', reviewFlags: { isEmpty: true },
                          source: {
                            status: 'ACTIVE', publicationMode: 'AUTO',
                            rights: { is: {
                              status: 'APPROVED', commercialUseAllowed: true,
                              headlineAllowed: true, excerptAllowed: true,
                              cacheAllowed: true, aiProcessingAllowed: true,
                              automaticPublishingAllowed: true,
                              reviewedBy: { not: null }, reviewedAt: { not: null },
                              permissionReference: { not: null },
                              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                            } },
                          },
                        },
                        data: { moderationStatus: 'APPROVED', publishedAt: new Date(), moderationReason: 'Validated automatic publication' },
                      });
                      if (changed.count !== 1) return false;
                      await tx.newsAutomationEvent.create({
                        data: { sourceId, storyId: story.id, action: 'PUBLISHED', reason: 'AI metadata passed confidence, relevance, language, and risk checks; source excerpt retained' },
                      });
                      return true;
                    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
                    if (published) {
                      autoPublishedCount++;
                    }
                  }
                }
              } catch (error) {
                aiFailureCount++;
                await this.prisma.newsStory.update({
                  where: { id: story.id },
                  data: { aiErrorCode: error instanceof NewsAiProviderError ? `AI_${error.code}` : 'AI_PROCESSING_FAILED' },
                });
              }
            }
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            ) {
              duplicateCount++;
              continue;
            }
            throw error;
          }
        }

        await this.prisma.$transaction([
          this.prisma.newsIngestionRun.update({
            where: { id: run.id },
            data: {
              status: 'SUCCESS',
              finishedAt: new Date(),
              fetchedCount,
              createdCount: result.created,
              duplicateCount,
              skippedCount: result.skipped,
              aiFailureCount,
              autoPublishedCount,
              httpStatus: fetchedHttpStatus,
              finalUrl,
              redirectCount,
              latencyMs,
            },
          }),
          this.prisma.newsSource.update({
            where: { id: sourceId },
            data: {
              lastSuccessAt: new Date(),
              consecutiveFailures: 0,
              lastErrorCode: null,
              feedEtag: document.etag,
              feedLastModified: document.lastModified,
              nextPollAt: nextNewsPollAt(source.pollIntervalMinutes),
            },
          }),
        ]);
        newsIngestionRunsTotal.inc({ outcome: 'success', http_status: String(fetchedHttpStatus ?? 0) });
        if (result.created) newsIngestionStoriesTotal.inc({ result: 'created' }, result.created);
        if (duplicateCount) newsIngestionStoriesTotal.inc({ result: 'duplicate' }, duplicateCount);
      } catch (error) {
        result.errors++;
        const message = error instanceof Error ? error.message : '';
        const httpStatus = error instanceof FeedUrlError ? error.httpStatus ?? null : null;
        const blocked = httpStatus === 401 || httpStatus === 403;
        const code = blocked
          ? 'SOURCE_BLOCKED'
          : /INVALID_XML_DTD/.test(message)
            ? 'INVALID_XML'
            : 'SYNC_FAILED';
        await this.prisma.$transaction([
          this.prisma.newsIngestionRun.update({
            where: { id: run.id },
            data: {
              status: 'FAILED',
              finishedAt: new Date(),
              fetchedCount,
              createdCount: result.created,
              duplicateCount,
              skippedCount: result.skipped,
              aiFailureCount,
              autoPublishedCount,
              errorCode: code,
              httpStatus,
              finalUrl,
              redirectCount,
              latencyMs,
            },
          }),
          this.prisma.newsSource.update({
            where: { id: sourceId },
            data: {
              status: blocked ? 'BLOCKED' : source.status,
              consecutiveFailures: { increment: 1 },
              lastErrorCode: code,
              nextPollAt: blocked ? null : nextNewsPollAt(settings?.retryBaseMinutes ?? 30, source.consecutiveFailures + 1),
            },
          }),
        ]);
        newsIngestionRunsTotal.inc({ outcome: 'failed', http_status: String(httpStatus ?? 0) });
        this.logger.warn(`News source ${sourceId} sync failed: ${code}`);
      }
    } finally {
      await this.prisma.newsSource.updateMany({
        where: { id: sourceId, syncLeaseUntil: leaseUntil },
        data: { syncLeaseUntil: null },
      });
    }
    return result;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import Parser from 'rss-parser';

/**
 * Wave 7 — RSS ingestion worker. Runs every 6 hours, fetches every ACTIVE
 * news source's feedUrl, and creates PENDING stories for the moderation
 * queue. Dedupes on (sourceId, originalUrl) so a re-run is a no-op for
 * already-ingested items. Broken feeds log a warning and skip — one bad
 * source must not block the others.
 */
@Injectable()
export class NewsIngestionService {
  private readonly logger = new Logger(NewsIngestionService.name);
  private readonly parser = new Parser<
    Record<string, never>,
    {
      link?: string;
      title?: string;
      contentSnippet?: string;
      isoDate?: string;
    }
  >({ timeout: 10_000 });
  private readonly prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  @Cron('0 */6 * * *')
  async ingestAll() {
    await this.ingest();
  }

  async ingest(): Promise<{
    created: number;
    skipped: number;
    errors: number;
  }> {
    let created = 0;
    let skipped = 0;
    let errors = 0;

    const sources = await this.prisma.newsSource.findMany({
      where: { status: 'ACTIVE', feedUrl: { not: null } },
    });

    for (const source of sources) {
      try {
        const feed = await this.parser.parseURL(source.feedUrl!);
        for (const item of feed.items.slice(0, 20)) {
          const url = item.link ?? '';
          if (!url) {
            skipped++;
            continue;
          }

          const existing = await this.prisma.newsStory.findFirst({
            where: { sourceId: source.id, originalUrl: url },
          });
          if (existing) {
            skipped++;
            continue;
          }

          await this.prisma.newsStory.create({
            data: {
              sourceId: source.id,
              headline: item.title ?? 'Untitled',
              highlight: (item.contentSnippet ?? '').slice(0, 300),
              originalUrl: url,
              publicationDate: item.isoDate
                ? new Date(item.isoDate)
                : new Date(),
              categories: ['LATEST'],
              topics: [],
              moderationStatus: 'PENDING',
            },
          });
          created++;
        }
      } catch (e) {
        errors++;
        this.logger.warn(
          `Feed ${source.name} (${source.feedUrl}) failed: ${e}`,
        );
      }
    }

    if (created > 0 || errors > 0) {
      this.logger.log(
        `Ingestion: ${created} created, ${skipped} skipped, ${errors} errors.`,
      );
    }
    return { created, skipped, errors };
  }
}

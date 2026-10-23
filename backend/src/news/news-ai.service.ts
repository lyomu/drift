import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NEWS_AI_PROVIDER, NewsAiProviderError } from './news-ai.provider';
import type {
  NewsAiProvider,
  NewsAiRequest,
  NewsAiResult,
} from './news-ai.provider';

export type { NewsAiResult } from './news-ai.provider';

function shortStrings(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 10 &&
    value.every(
      (item) =>
        typeof item === 'string' && item.trim().length > 0 && item.length <= 80,
    )
  );
}

/** Provider output is untrusted even when the provider promises JSON Schema. */
export function validateNewsAiResult(
  value: unknown,
  maxSummaryCharacters: number,
  allowedCategories: string[],
): NewsAiResult | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
  if (!summary || summary.length > maxSummaryCharacters || /[<>]/.test(summary))
    return null;
  if (
    typeof data.category_slug !== 'string' ||
    !allowedCategories.includes(data.category_slug)
  )
    return null;
  if (
    !shortStrings(data.tags) ||
    !shortStrings(data.players) ||
    !shortStrings(data.tournaments) ||
    !shortStrings(data.risk_flags)
  )
    return null;
  if (
    typeof data.language !== 'string' ||
    !/^[a-z]{2}(-[A-Z]{2})?$/.test(data.language)
  )
    return null;
  if (
    typeof data.relevance_score !== 'number' ||
    !Number.isFinite(data.relevance_score) ||
    data.relevance_score < 0 ||
    data.relevance_score > 1 ||
    typeof data.confidence !== 'number' ||
    !Number.isFinite(data.confidence) ||
    data.confidence < 0 ||
    data.confidence > 1
  )
    return null;
  return {
    summary,
    categorySlug: data.category_slug,
    tags: data.tags,
    players: data.players,
    tournaments: data.tournaments,
    language: data.language,
    relevanceScore: data.relevance_score,
    confidence: data.confidence,
    riskFlags: data.risk_flags,
  };
}

@Injectable()
export class NewsAiService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NEWS_AI_PROVIDER) private readonly provider: NewsAiProvider,
  ) {}

  get configured(): boolean {
    return this.provider.configured;
  }
  get model(): string {
    return this.provider.model;
  }
  get providerName(): string {
    return this.provider.name;
  }

  async process(
    headline: string,
    excerpt: string,
    maxSummaryCharacters: number,
    dailyLimit: number,
    allowedCategories: string[],
  ): Promise<NewsAiResult | null> {
    if (
      !this.provider.configured ||
      !headline ||
      !excerpt ||
      allowedCategories.length === 0
    )
      return null;
    if (!Number.isInteger(dailyLimit) || dailyLimit < 1) return null;
    const day = new Date(
      new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z',
    );
    await this.prisma.newsAiQuotaDay.upsert({
      where: { day },
      create: { day },
      update: {},
    });
    const claimed = await this.prisma.newsAiQuotaDay.updateMany({
      where: { day, attempts: { lt: dailyLimit } },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count === 0) return null;

    const request: NewsAiRequest = {
      headline: headline.slice(0, 500),
      excerpt: excerpt.slice(0, 300),
      maxSummaryCharacters,
      allowedCategories,
    };
    const output = await this.provider.process(request);
    const result = validateNewsAiResult(
      output,
      maxSummaryCharacters,
      allowedCategories,
    );
    if (!result) throw new NewsAiProviderError('INVALID_RESULT', false);
    const evidence =
      `${request.headline} ${request.excerpt}`.toLocaleLowerCase();
    if (
      [...result.players, ...result.tournaments].some(
        (name) => !evidence.includes(name.toLocaleLowerCase()),
      )
    ) {
      throw new NewsAiProviderError('INVALID_RESULT', false);
    }
    const numericClaims: string[] = Array.from(
      result.summary.matchAll(/\b\d+(?:[.,]\d+)?%?\b/g),
      (match) => match[0],
    );
    if (numericClaims.some((claim) => !evidence.includes(claim))) {
      throw new NewsAiProviderError('INVALID_RESULT', false);
    }
    return {
      ...result,
      tags: result.tags.filter((tag) =>
        evidence.includes(tag.toLocaleLowerCase()),
      ),
    };
  }
}

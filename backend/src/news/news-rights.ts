import { Prisma, NewsRightsStatus, NewsSourceStatus } from '@prisma/client';
import { isIP } from 'node:net';
import { isBlockedAddress } from './feed-fetch';

/** One public-visibility policy for feed, detail, saved stories, and Home. */
export function visibleNewsWhere(now = new Date()): Prisma.NewsStoryWhereInput {
  return {
    moderationStatus: 'APPROVED',
    publishedAt: { lte: now },
    source: {
      status: NewsSourceStatus.ACTIVE,
      rights: {
        is: {
          status: NewsRightsStatus.APPROVED,
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
  };
}

export function safePublisherUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    const host = url.hostname
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .toLowerCase();
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      host.includes('.') &&
      !host.endsWith('.local') &&
      !host.endsWith('.internal') &&
      (isIP(host) === 0 || !isBlockedAddress(host))
    );
  } catch {
    return false;
  }
}

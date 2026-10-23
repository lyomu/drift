import { Prisma, NewsRightsStatus, NewsSourceStatus } from '@prisma/client';
import { isIP } from 'node:net';
import { isBlockedAddress } from './feed-fetch';

/**
 * One public-visibility policy for feed, detail, saved stories, and Home.
 *
 * An editor approving the story is the gate: a story is visible when it has
 * been approved, its publication date has arrived, and its source is active.
 * A rights record is no longer required here — it is recorded for the
 * publishers that need it and still gates unattended AUTO publishing, but it
 * does not decide what an approved story may show.
 *
 * Revocation remains absolute, and does not rely on the admin path having run:
 * a source whose rights are explicitly REVOKED or RESTRICTED is excluded here
 * as well, so withdrawing permission hides its stories however it was recorded.
 * A source with no rights record, or an UNREVIEWED one, is free to publish.
 */
export function visibleNewsWhere(now = new Date()): Prisma.NewsStoryWhereInput {
  return {
    moderationStatus: 'APPROVED',
    publishedAt: { lte: now },
    source: {
      status: NewsSourceStatus.ACTIVE,
      NOT: {
        rights: {
          is: {
            status: {
              in: [NewsRightsStatus.REVOKED, NewsRightsStatus.RESTRICTED],
            },
          },
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

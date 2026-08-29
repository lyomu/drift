import { Injectable } from '@nestjs/common';
import { NewsModerationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';

/** Older than this and it isn't "news" any more — better to show nothing. */
const MAX_AGE_DAYS = 14;

/**
 * The latest approved story. Closes the Home news card M11 deferred.
 *
 * Only `APPROVED` stories qualify — the same moderation gate `NewsService`
 * applies, so an unreviewed or rejected story can't reach Home by a side
 * door.
 *
 * Only the headline and image travel, never article text: `NewsStory` has no
 * body column at all (M11 enforced Doc 6 §2's republication rule in the
 * schema shape itself), and `highlight` is the platform's own summary. The
 * card links out to `originalUrl` via the story detail screen, which is where
 * attribution lives.
 */
@Injectable()
export class NewsHighlightContributor implements HomeCardContributor {
  readonly key = 'news-highlight';

  constructor(private readonly prisma: PrismaService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const cutoff = new Date(
      ctx.now.getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    );

    const story = await this.prisma.newsStory.findFirst({
      where: {
        moderationStatus: NewsModerationStatus.APPROVED,
        publicationDate: { gte: cutoff, lte: ctx.now },
      },
      orderBy: { publicationDate: 'desc' },
      select: {
        id: true,
        headline: true,
        highlight: true,
        imageUrl: true,
      },
    });
    if (!story) return [];

    return [
      {
        id: `news-highlight:${story.id}`,
        type: 'NEWS_HIGHLIGHT',
        priority: HOME_CARD_PRIORITY.NEWS_HIGHLIGHT,
        title: story.headline,
        body: story.highlight,
        accent: 'neutral',
        action: { label: 'Read', route: `/news/${story.id}` },
        dismissible: true,
        data: {
          kind: 'story',
          storyId: story.id,
          headline: story.headline,
          imageUrl: story.imageUrl,
        },
      },
    ];
  }
}

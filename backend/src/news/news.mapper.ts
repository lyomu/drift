import { Prisma } from '@prisma/client';
import { safePublisherUrl } from './news-rights';

export const storyInclude = {
  source: {
    select: {
      id: true,
      name: true,
      rights: { select: { imageAllowed: true, attributionText: true } },
    },
  },
} satisfies Prisma.NewsStoryInclude;

export type StoryRecord = Prisma.NewsStoryGetPayload<{
  include: typeof storyInclude;
}>;

/**
 * Deliberately constructive, same discipline as `court.mapper.ts` — every
 * field is named explicitly. There is no article-body field to accidentally
 * expose: the schema itself enforces the "never republish the full
 * article" rule (Doc 6 §2), so the mapper can't leak what doesn't exist.
 */
export function toStorySummary(story: StoryRecord, savedByViewer: boolean) {
  return {
    id: story.id,
    headline: story.headline,
    publisher: story.source.rights?.attributionText || story.source.name,
    imageUrl:
      story.source.rights?.imageAllowed &&
      story.imageUrl &&
      safePublisherUrl(story.imageUrl)
        ? story.imageUrl
        : null,
    highlight: story.highlight,
    publicationDate: story.publicationDate,
    categories: story.categories,
    topics: story.topics,
    savedByViewer,
  };
}

export type StorySummary = ReturnType<typeof toStorySummary>;

export function toStoryDetail(story: StoryRecord, savedByViewer: boolean) {
  return {
    ...toStorySummary(story, savedByViewer),
    originalUrl: story.originalUrl,
  };
}

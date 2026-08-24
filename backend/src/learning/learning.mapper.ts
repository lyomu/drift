import { Prisma } from '@prisma/client';

export const contentInclude = {
  steps: {
    orderBy: { order: 'asc' as const },
    include: { content: true },
  },
} satisfies Prisma.LearningContentInclude;

export type ContentRecord = Prisma.LearningContentGetPayload<{
  include: typeof contentInclude;
}>;

export function toContentSummary(content: {
  id: string;
  type: string;
  sport: string;
  targetSkill: string;
  branch: string | null;
  title: string;
  summary: string | null;
  durationMinutes: number | null;
}) {
  return {
    id: content.id,
    type: content.type,
    sport: content.sport,
    targetSkill: content.targetSkill,
    branch: content.branch,
    title: content.title,
    summary: content.summary,
    durationMinutes: content.durationMinutes,
  };
}

export type ContentSummary = ReturnType<typeof toContentSummary>;

/**
 * Full detail. `steps` is only ever non-empty for a TRAINING_PLAN row —
 * Lesson/Drill rows carry their own `bodyText`/`videoUrl` directly instead.
 */
export function toContentDetail(content: ContentRecord) {
  return {
    ...toContentSummary(content),
    bodyText: content.bodyText,
    videoUrl: content.videoUrl,
    steps: content.steps.map((step) => toContentSummary(step.content)),
  };
}

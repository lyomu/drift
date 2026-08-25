export type LearningContentType = "LESSON" | "DRILL" | "TRAINING_PLAN";
export type LearningContentStatus = "DRAFT" | "PUBLISHED";
export type MatchSport = "TENNIS" | "PADEL";
export type AssessmentBranch = "BEGINNER" | "FOUNDATIONAL" | "INTERMEDIATE" | "ADVANCED";
export type AssessmentPillar =
  | "FOREHAND"
  | "BACKHAND"
  | "SERVE"
  | "RETURN"
  | "NET_PLAY"
  | "MOVEMENT"
  | "MATCH_PLAY"
  | "COMPETITION_EXPERIENCE";

export const SKILL_OPTIONS: AssessmentPillar[] = [
  "FOREHAND",
  "BACKHAND",
  "SERVE",
  "RETURN",
  "NET_PLAY",
  "MOVEMENT",
  "MATCH_PLAY",
  "COMPETITION_EXPERIENCE",
];

export const BRANCH_OPTIONS: AssessmentBranch[] = [
  "BEGINNER",
  "FOUNDATIONAL",
  "INTERMEDIATE",
  "ADVANCED",
];

export type LearningContentInput = {
  sport: MatchSport;
  targetSkill: AssessmentPillar;
  branch: AssessmentBranch | null;
  title: string;
  summary: string | null;
  bodyText: string | null;
  videoUrl: string | null;
  durationMinutes: number | null;
  status: LearningContentStatus;
};

export type LearningPathInput = LearningContentInput & {
  pathGoal: string | null;
  stepIds: string[];
};

export type LearningContentSummary = {
  id: string;
  type: LearningContentType;
  sport: MatchSport;
  targetSkill: AssessmentPillar;
  branch: AssessmentBranch | null;
  title: string;
  summary: string | null;
  bodyText: string | null;
  videoUrl: string | null;
  durationMinutes: number | null;
  pathGoal: string | null;
  status: LearningContentStatus;
  createdAt: string;
  updatedAt: string;
  steps: Array<{
    id: string;
    order: number;
    content: StepContent;
  }>;
  usedInPaths: Array<{
    id: string;
    title: string;
    status: LearningContentStatus;
    order: number;
  }>;
  counts: {
    completions: number;
    practiceSessions: number;
    steps: number;
    usedInPaths: number;
  };
};

export type StepContent = {
  id: string;
  type: "LESSON" | "DRILL";
  sport: MatchSport;
  targetSkill: AssessmentPillar;
  branch: AssessmentBranch | null;
  title: string;
  summary: string | null;
  durationMinutes: number | null;
  status: LearningContentStatus;
};

export type LearningContentListResponse = {
  total: number;
  content: LearningContentSummary[];
};

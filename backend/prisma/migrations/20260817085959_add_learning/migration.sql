-- CreateEnum
CREATE TYPE "LearningContentType" AS ENUM ('LESSON', 'DRILL', 'TRAINING_PLAN');

-- CreateEnum
CREATE TYPE "LearningContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ON_TRACK', 'BEHIND', 'ACHIEVED');

-- CreateTable
CREATE TABLE "learning_content" (
    "id" TEXT NOT NULL,
    "type" "LearningContentType" NOT NULL,
    "sport" "MatchSport" NOT NULL DEFAULT 'TENNIS',
    "targetSkill" "AssessmentPillar" NOT NULL,
    "branch" "AssessmentBranch",
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "bodyText" TEXT,
    "videoUrl" TEXT,
    "durationMinutes" INTEGER,
    "status" "LearningContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_plan_steps" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "training_plan_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_content_completions" (
    "id" TEXT NOT NULL,
    "tennisProfileId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_content_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" TEXT NOT NULL,
    "tennisProfileId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "skillFocus" "AssessmentPillar" NOT NULL,
    "drillId" TEXT,
    "notes" TEXT,
    "perceivedPerformance" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "tennisProfileId" TEXT NOT NULL,
    "skill" "AssessmentPillar" NOT NULL,
    "baseline" DOUBLE PRECISION NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "deadline" TIMESTAMP(3),
    "achievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_milestones" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "achievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_content_targetSkill_branch_type_status_idx" ON "learning_content"("targetSkill", "branch", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "training_plan_steps_planId_order_key" ON "training_plan_steps"("planId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "learning_content_completions_tennisProfileId_contentId_key" ON "learning_content_completions"("tennisProfileId", "contentId");

-- CreateIndex
CREATE INDEX "practice_sessions_tennisProfileId_skillFocus_occurredAt_idx" ON "practice_sessions"("tennisProfileId", "skillFocus", "occurredAt");

-- CreateIndex
CREATE INDEX "goals_tennisProfileId_idx" ON "goals"("tennisProfileId");

-- AddForeignKey
ALTER TABLE "training_plan_steps" ADD CONSTRAINT "training_plan_steps_planId_fkey" FOREIGN KEY ("planId") REFERENCES "learning_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plan_steps" ADD CONSTRAINT "training_plan_steps_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "learning_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_content_completions" ADD CONSTRAINT "learning_content_completions_tennisProfileId_fkey" FOREIGN KEY ("tennisProfileId") REFERENCES "tennis_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_content_completions" ADD CONSTRAINT "learning_content_completions_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "learning_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_tennisProfileId_fkey" FOREIGN KEY ("tennisProfileId") REFERENCES "tennis_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "learning_content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_tennisProfileId_fkey" FOREIGN KEY ("tennisProfileId") REFERENCES "tennis_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

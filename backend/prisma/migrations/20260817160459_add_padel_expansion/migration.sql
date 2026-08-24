/*
  Warnings:

  - You are about to drop the column `rating` on the `padel_profiles` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PadelAssessmentPillar" AS ENUM ('RALLY_CONSISTENCY', 'FOREHAND', 'BACKHAND', 'SERVE', 'RETURN', 'VOLLEY', 'OVERHEAD', 'BANDEJA', 'VIBORA', 'SMASH', 'WALL_USAGE', 'POSITIONING', 'NET_CONTROL', 'TRANSITION', 'PARTNER_COMMUNICATION', 'TACTICAL_AWARENESS');

-- CreateEnum
CREATE TYPE "PadelAssessmentBranch" AS ENUM ('BEGINNER', 'EXPERIENCED');

-- CreateEnum
CREATE TYPE "PadelSide" AS ENUM ('LEFT', 'RIGHT', 'EITHER');

-- AlterTable
ALTER TABLE "padel_profiles" DROP COLUMN "rating",
ADD COLUMN     "dominantHand" "DominantHand",
ADD COLUMN     "doublesRating" DOUBLE PRECISION,
ADD COLUMN     "goals" TEXT[],
ADD COLUMN     "partnerPreference" TEXT,
ADD COLUMN     "preferredSide" "PadelSide",
ADD COLUMN     "singlesRating" DOUBLE PRECISION,
ADD COLUMN     "systemSuggestedLevel" DOUBLE PRECISION,
ADD COLUMN     "systemSuggestedLevelSetAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "padel_assessment_sessions" (
    "id" TEXT NOT NULL,
    "padelProfileId" TEXT NOT NULL,
    "branch" "PadelAssessmentBranch" NOT NULL,
    "questionBudget" INTEGER NOT NULL,
    "status" "AssessmentSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "resultSystemSuggestedLevel" DOUBLE PRECISION,
    "resultSkillBreakdown" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "padel_assessment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "padel_assessment_answers" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "pillar" "PadelAssessmentPillar" NOT NULL,
    "selectedOption" "AnswerOption" NOT NULL,
    "pointValue" INTEGER NOT NULL,
    "sequenceIndex" INTEGER NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "padel_assessment_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "padel_assessment_answers_sessionId_sequenceIndex_key" ON "padel_assessment_answers"("sessionId", "sequenceIndex");

-- AddForeignKey
ALTER TABLE "padel_assessment_sessions" ADD CONSTRAINT "padel_assessment_sessions_padelProfileId_fkey" FOREIGN KEY ("padelProfileId") REFERENCES "padel_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "padel_assessment_answers" ADD CONSTRAINT "padel_assessment_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "padel_assessment_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

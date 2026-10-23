-- AlterTable
ALTER TABLE "news_ingestion_runs" ADD COLUMN     "aiFailureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "autoPublishedCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "news_settings" ADD COLUMN     "aiDailyRequestLimit" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiSummaryMaxCharacters" INTEGER NOT NULL DEFAULT 240,
ADD COLUMN     "automaticPublishingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "news_source_rights" ADD COLUMN     "automaticPublishingAllowed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "news_stories" ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "aiErrorCode" TEXT,
ADD COLUMN     "aiLanguage" TEXT,
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "aiPlayers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "aiProcessedAt" TIMESTAMP(3),
ADD COLUMN     "aiProvider" TEXT,
ADD COLUMN     "aiRelevanceScore" DOUBLE PRECISION,
ADD COLUMN     "aiRiskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "aiTournaments" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "news_ai_quota_days" (
    "day" DATE NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "news_ai_quota_days_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "news_automation_events" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_automation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_automation_events_sourceId_createdAt_idx" ON "news_automation_events"("sourceId", "createdAt" DESC);

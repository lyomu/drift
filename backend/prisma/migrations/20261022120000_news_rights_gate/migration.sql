-- Existing sources are unreviewed. Pause them before the new worker is deployed.
ALTER TABLE "news_sources" ALTER COLUMN "status" SET DEFAULT 'PAUSED';
UPDATE "news_sources" SET "status" = 'PAUSED' WHERE "status" = 'ACTIVE';

CREATE TYPE "NewsRightsStatus" AS ENUM ('UNREVIEWED', 'APPROVED', 'RESTRICTED', 'REVOKED');
CREATE TYPE "NewsPublicationMode" AS ENUM ('MANUAL', 'AUTO');

ALTER TABLE "news_sources"
    ADD COLUMN "pollIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN "publicationMode" "NewsPublicationMode" NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN "nextPollAt" TIMESTAMP(3),
    ADD COLUMN "syncLeaseUntil" TIMESTAMP(3),
    ADD COLUMN "lastPolledAt" TIMESTAMP(3),
    ADD COLUMN "lastSuccessAt" TIMESTAMP(3),
    ADD COLUMN "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "lastErrorCode" TEXT;

ALTER TABLE "news_stories"
    ADD COLUMN "externalGuid" TEXT,
    ADD COLUMN "canonicalUrlHash" TEXT;

CREATE UNIQUE INDEX "news_stories_sourceId_canonicalUrlHash_key" ON "news_stories"("sourceId", "canonicalUrlHash");

CREATE TABLE "news_ingestion_runs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    CONSTRAINT "news_ingestion_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "news_ingestion_runs_sourceId_startedAt_idx" ON "news_ingestion_runs"("sourceId", "startedAt" DESC);
ALTER TABLE "news_ingestion_runs" ADD CONSTRAINT "news_ingestion_runs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "news_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "news_source_rights" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "NewsRightsStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "termsUrl" TEXT,
    "permissionReference" TEXT,
    "commercialUseAllowed" BOOLEAN NOT NULL DEFAULT false,
    "headlineAllowed" BOOLEAN NOT NULL DEFAULT false,
    "excerptAllowed" BOOLEAN NOT NULL DEFAULT false,
    "imageAllowed" BOOLEAN NOT NULL DEFAULT false,
    "aiProcessingAllowed" BOOLEAN NOT NULL DEFAULT false,
    "cacheAllowed" BOOLEAN NOT NULL DEFAULT false,
    "attributionText" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "news_source_rights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "news_source_rights_sourceId_key" ON "news_source_rights"("sourceId");
ALTER TABLE "news_source_rights" ADD CONSTRAINT "news_source_rights_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "news_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "news_stories" ADD COLUMN "publishedAt" TIMESTAMP(3);
CREATE INDEX "news_stories_moderationStatus_publishedAt_id_idx" ON "news_stories"("moderationStatus", "publishedAt" DESC, "id" DESC);

-- Retire fictional demonstration stories without deleting saved-story references.
UPDATE "news_sources"
SET "status" = 'PAUSED', "publicationMode" = 'MANUAL', "nextPollAt" = NULL
WHERE "id" = 'seed-source-drift-digest';

UPDATE "news_stories"
SET "moderationStatus" = 'ARCHIVED', "publishedAt" = NULL,
    "moderationReason" = 'Retired fictional seed story'
WHERE "sourceId" = 'seed-source-drift-digest';

ALTER TABLE "news_sources"
  ADD COLUMN "feedEtag" TEXT,
  ADD COLUMN "feedLastModified" TEXT;

ALTER TABLE "news_ingestion_runs"
  ADD COLUMN "httpStatus" INTEGER,
  ADD COLUMN "finalUrl" TEXT,
  ADD COLUMN "redirectCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "latencyMs" INTEGER;

ALTER TABLE "news_stories"
  ADD COLUMN "originalFeedExcerpt" TEXT,
  ADD COLUMN "reviewFlags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Legacy rows may share a publisher GUID. Retain their content and URL identity;
-- only clear ambiguous GUIDs before enforcing the new import identity.
WITH duplicates AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "sourceId", "externalGuid" ORDER BY "createdAt", "id"
  ) AS ordinal
  FROM "news_stories" WHERE "externalGuid" IS NOT NULL
)
UPDATE "news_stories" AS story
SET "externalGuid" = NULL
FROM duplicates
WHERE story."id" = duplicates."id" AND duplicates.ordinal > 1;

CREATE UNIQUE INDEX "news_stories_sourceId_externalGuid_key"
  ON "news_stories"("sourceId", "externalGuid");

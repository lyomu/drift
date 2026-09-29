-- AI match-video analysis: job tracking (Phase 1).
--
-- Records the JOB, not its findings. The plan's companion `stroke_events` table is
-- deliberately absent: its columns are stroke type, speed and placement x/y, and
-- placement is derived from a court homography fitted to painted court lines. The
-- Phase 0 spike found those lines worn away or missing on the first batch of real
-- Drift courts (see cv-service/PHASE0_FINDINGS.md), so which of those outputs
-- survives is not yet known. Job tracking does not depend on the answer.

CREATE TYPE "VideoAnalysisStatus" AS ENUM (
    'PENDING',
    'REJECTED',
    'ACCEPTED',
    'ANALYZING',
    'COMPLETED',
    'FAILED'
);

CREATE TABLE "video_analysis_jobs" (
    "id"               TEXT NOT NULL,
    "status"           "VideoAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "userId"           TEXT NOT NULL,

    -- An opaque key for VideoStorageService, never a path: the local-disk driver and
    -- an object store disagree about what a location looks like, and this column
    -- should not need migrating when the driver changes. NULL once a refused clip's
    -- bytes have been discarded.
    "storageKey"       TEXT,
    "originalFilename" TEXT NOT NULL,
    "sizeBytes"        INTEGER NOT NULL,
    "mimeType"         TEXT NOT NULL,

    -- The precheck verdict, stored whole. JSON rather than columns because the shape
    -- belongs to cv-service and travels with it; adding a check there should not
    -- require a migration here.
    "precheckResult"   JSONB,
    -- The user-facing messages from the blocking findings, lifted out of the JSON so
    -- the common read -- "why was my video refused" -- needs no parsing.
    "rejectionReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

    -- Which cv-service produced the verdict. Without it a re-run after a threshold
    -- change is indistinguishable from the original, and the stored verdicts quietly
    -- become a mix of incomparable things.
    "cvServiceVersion" TEXT,

    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "completedAt"      TIMESTAMP(3),

    CONSTRAINT "video_analysis_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "video_analysis_jobs_userId_createdAt_idx"
    ON "video_analysis_jobs"("userId", "createdAt");

CREATE INDEX "video_analysis_jobs_status_idx"
    ON "video_analysis_jobs"("status");

ALTER TABLE "video_analysis_jobs"
    ADD CONSTRAINT "video_analysis_jobs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

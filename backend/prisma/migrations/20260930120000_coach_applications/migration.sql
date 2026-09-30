-- Coach self-service applications + platform review.
--
-- Until now the only way a CoachProfile could exist was a club owner creating
-- one for an already-onboarded account (coaches.service.ts createForClub), and
-- GET /coaches returned every profile regardless of verificationStatus. This
-- migration adds the review record behind a coach listing themselves, and the
-- backfill below keeps every coach created the old way visible.

CREATE TYPE "CoachApplicationStatus" AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'CHANGES_REQUESTED',
    'APPROVED',
    'REJECTED'
);

CREATE TABLE "coach_applications" (
    "id"     TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CoachApplicationStatus" NOT NULL DEFAULT 'DRAFT',

    -- Mirrors coach_profiles. A pending edit must not mutate the live listing,
    -- so the application carries its own copy until a reviewer approves it.
    "bio"              TEXT,
    "qualifications"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "yearsExperience"  INTEGER,
    "specialisations"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "levels"           "CoachLevel"[] NOT NULL DEFAULT ARRAY[]::"CoachLevel"[],
    "availabilityNote" TEXT,
    "publicEmail"      TEXT,
    "publicPhone"      TEXT,
    "bookingUrl"       TEXT,

    "submittedAt"    TIMESTAMP(3),
    "reviewedAt"     TIMESTAMP(3),
    -- PlatformAdmin id, intentionally without an FK -- same choice as
    -- club_creation_requests."reviewedById".
    "reviewedById"   TEXT,
    "decisionReason" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coach_applications_userId_key" ON "coach_applications"("userId");
CREATE INDEX "coach_applications_status_submittedAt_idx" ON "coach_applications"("status", "submittedAt");

ALTER TABLE "coach_applications"
    ADD CONSTRAINT "coach_applications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Append-only decision trail. Nothing updates or deletes these rows, so the
-- history survives later edits to the application itself.
CREATE TABLE "coach_application_events" (
    "id"            TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,

    -- Exactly one is set: the coach for their own submissions, the reviewer
    -- for a decision.
    "actorUserId"  TEXT,
    "actorAdminId" TEXT,

    "previousStatus" "CoachApplicationStatus",
    "nextStatus"     "CoachApplicationStatus" NOT NULL,
    "note"           TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_application_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "coach_application_events_applicationId_createdAt_idx"
    ON "coach_application_events"("applicationId", "createdAt");

ALTER TABLE "coach_application_events"
    ADD CONSTRAINT "coach_application_events_applicationId_fkey"
    FOREIGN KEY ("applicationId") REFERENCES "coach_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------- backfill
--
-- GET /coaches is about to require verificationStatus = 'VERIFIED'. Every
-- profile that exists today was created by a club owner vouching for the
-- coach by account email, and most sit at the 'UNVERIFIED' default -- so
-- without this they would all silently drop out of mobile Discover on deploy.
-- Treat that club vouch as the approval it already was.

INSERT INTO "coach_applications" (
    "id", "userId", "status",
    "bio", "qualifications", "yearsExperience", "specialisations", "levels",
    "availabilityNote", "publicEmail", "publicPhone", "bookingUrl",
    "submittedAt", "reviewedAt", "decisionReason", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::TEXT, p."userId", 'APPROVED',
    p."bio", p."qualifications", p."yearsExperience", p."specialisations", p."levels",
    p."availabilityNote", p."publicEmail", p."publicPhone", p."bookingUrl",
    p."createdAt", p."createdAt",
    'Backfilled: profile predates the coach application flow and was created by a club administrator.',
    p."createdAt", NOW()
FROM "coach_profiles" p;

INSERT INTO "coach_application_events" (
    "id", "applicationId", "previousStatus", "nextStatus", "note", "createdAt"
)
SELECT
    gen_random_uuid()::TEXT, a."id", NULL, 'APPROVED',
    'Backfilled by migration 20260930120000_coach_applications.',
    NOW()
FROM "coach_applications" a;

UPDATE "coach_profiles"
SET "verificationStatus" = 'VERIFIED'
WHERE "verificationStatus" <> 'VERIFIED';

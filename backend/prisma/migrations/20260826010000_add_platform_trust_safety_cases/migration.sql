-- Phase 5H: platform-admin Trust & Safety cases and report priority.
-- Migration source only; execution is deferred to the consolidated QA pass.

CREATE TYPE "TrustSafetyPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "AbuseCaseStatus" AS ENUM ('OPEN', 'CLOSED');

ALTER TABLE "player_reports"
  ADD COLUMN "priority" "TrustSafetyPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "message_reports"
  ADD COLUMN "priority" "TrustSafetyPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "court_reports"
  ADD COLUMN "priority" "TrustSafetyPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "club_post_moderation_reports"
  ADD COLUMN "priority" "TrustSafetyPriority" NOT NULL DEFAULT 'NORMAL';

CREATE INDEX "player_reports_priority_status_createdAt_idx"
  ON "player_reports"("priority", "status", "createdAt");
CREATE INDEX "message_reports_priority_status_createdAt_idx"
  ON "message_reports"("priority", "status", "createdAt");
CREATE INDEX "court_reports_priority_status_createdAt_idx"
  ON "court_reports"("priority", "status", "createdAt");
CREATE INDEX "club_post_moderation_reports_priority_status_createdAt_idx"
  ON "club_post_moderation_reports"("priority", "status", "createdAt");

CREATE TABLE "abuse_cases" (
    "id" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "status" "AbuseCaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TrustSafetyPriority" NOT NULL DEFAULT 'HIGH',
    "summary" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abuse_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "abuse_case_notes" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abuse_case_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "abuse_cases_status_priority_createdAt_idx"
  ON "abuse_cases"("status", "priority", "createdAt");
CREATE INDEX "abuse_cases_subjectUserId_status_idx"
  ON "abuse_cases"("subjectUserId", "status");
CREATE INDEX "abuse_case_notes_caseId_createdAt_idx"
  ON "abuse_case_notes"("caseId", "createdAt");
CREATE INDEX "abuse_case_notes_actorId_createdAt_idx"
  ON "abuse_case_notes"("actorId", "createdAt");

ALTER TABLE "abuse_cases"
  ADD CONSTRAINT "abuse_cases_subjectUserId_fkey"
  FOREIGN KEY ("subjectUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "abuse_cases"
  ADD CONSTRAINT "abuse_cases_openedById_fkey"
  FOREIGN KEY ("openedById") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "abuse_cases"
  ADD CONSTRAINT "abuse_cases_closedById_fkey"
  FOREIGN KEY ("closedById") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "abuse_case_notes"
  ADD CONSTRAINT "abuse_case_notes_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "abuse_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "abuse_case_notes"
  ADD CONSTRAINT "abuse_case_notes_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

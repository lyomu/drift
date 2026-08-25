CREATE TYPE "VenuePlacesSyncStatus" AS ENUM ('SYNCED', 'STALE', 'FAILED');
CREATE TYPE "VenueVerificationRequestStatus" AS ENUM ('PENDING', 'MORE_INFO', 'APPROVED', 'REJECTED');
CREATE TYPE "VenueDuplicateDecisionType" AS ENUM ('DISTINCT', 'MERGED');

ALTER TABLE "courts"
  ADD COLUMN "googlePlacesSyncStatus" "VenuePlacesSyncStatus" NOT NULL DEFAULT 'STALE',
  ADD COLUMN "googlePlacesSyncedAt" TIMESTAMP(3),
  ADD COLUMN "googlePlacesSyncError" TEXT;

CREATE TABLE "venue_verification_requests" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "submittedById" TEXT NOT NULL,
  "status" "VenueVerificationRequestStatus" NOT NULL DEFAULT 'PENDING',
  "submissionNote" TEXT,
  "decisionNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "venue_verification_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "venue_duplicate_decisions" (
  "id" TEXT NOT NULL,
  "pairKey" TEXT NOT NULL,
  "firstCourtId" TEXT NOT NULL,
  "secondCourtId" TEXT NOT NULL,
  "decision" "VenueDuplicateDecisionType" NOT NULL,
  "survivorCourtId" TEXT,
  "decidedById" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "venue_duplicate_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "courts_googlePlacesSyncStatus_googlePlacesSyncedAt_idx" ON "courts"("googlePlacesSyncStatus", "googlePlacesSyncedAt");
CREATE INDEX "venue_verification_requests_status_createdAt_idx" ON "venue_verification_requests"("status", "createdAt");
CREATE INDEX "venue_verification_requests_clubId_createdAt_idx" ON "venue_verification_requests"("clubId", "createdAt");
CREATE UNIQUE INDEX "venue_duplicate_decisions_pairKey_key" ON "venue_duplicate_decisions"("pairKey");
CREATE INDEX "venue_duplicate_decisions_decision_createdAt_idx" ON "venue_duplicate_decisions"("decision", "createdAt");

ALTER TABLE "venue_verification_requests" ADD CONSTRAINT "venue_verification_requests_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "venue_verification_requests" ADD CONSTRAINT "venue_verification_requests_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "venue_verification_requests" ADD CONSTRAINT "venue_verification_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "venue_duplicate_decisions" ADD CONSTRAINT "venue_duplicate_decisions_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

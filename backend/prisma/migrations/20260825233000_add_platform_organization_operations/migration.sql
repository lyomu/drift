CREATE TYPE "ClubPlatformStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED');

ALTER TABLE "clubs"
  ADD COLUMN "platformStatus" "ClubPlatformStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "platformStatusReason" TEXT,
  ADD COLUMN "platformSuspendedAt" TIMESTAMP(3);

CREATE INDEX "clubs_platformStatus_updatedAt_idx" ON "clubs"("platformStatus", "updatedAt");

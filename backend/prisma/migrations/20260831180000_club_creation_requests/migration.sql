-- CreateEnum
CREATE TYPE "ClubCreationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN "setupCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "club_creation_requests" (
    "id" TEXT NOT NULL,
    "clubName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "status" "ClubCreationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "setupTokenHash" TEXT,
    "setupTokenExpiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdClubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_creation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "club_creation_requests_status_createdAt_idx" ON "club_creation_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "club_creation_requests_requesterEmail_idx" ON "club_creation_requests"("requesterEmail");

-- CreateEnum
CREATE TYPE "CommunityType" AS ENUM ('SOCIAL', 'TRAINING', 'LADDER', 'CLUB');

-- CreateEnum
CREATE TYPE "CommunityStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CommunityJoinPolicy" AS ENUM ('OPEN', 'BY_REQUEST');

-- CreateEnum
CREATE TYPE "CommunityFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunityRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "CommunityMemberStatus" AS ENUM ('REQUESTED', 'ACTIVE');

-- AlterEnum
ALTER TYPE "ConversationType" ADD VALUE 'COMMUNITY';

-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'COMMUNITIES';

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "communityId" TEXT;

-- AlterTable
ALTER TABLE "ladders" ADD COLUMN     "communityId" TEXT,
ALTER COLUMN "clubId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "leagues" ADD COLUMN     "communityId" TEXT;

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "communities" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "type" "CommunityType" NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "frequency" "CommunityFrequency" NOT NULL,
    "about" TEXT,
    "photoUrl" TEXT,
    "joinPolicy" "CommunityJoinPolicy" NOT NULL DEFAULT 'OPEN',
    "status" "CommunityStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "clubId" TEXT,
    "createdById" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_members" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CommunityRole" NOT NULL DEFAULT 'MEMBER',
    "status" "CommunityMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "mutedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_photo_assets" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_photo_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "notes" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TrustSafetyPriority" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_audit_logs" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "communities_clubId_key" ON "communities"("clubId");

-- CreateIndex
CREATE INDEX "communities_status_city_idx" ON "communities"("status", "city");

-- CreateIndex
CREATE INDEX "communities_latitude_longitude_idx" ON "communities"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "communities_createdById_idx" ON "communities"("createdById");

-- CreateIndex
CREATE INDEX "community_members_userId_status_idx" ON "community_members"("userId", "status");

-- CreateIndex
CREATE INDEX "community_members_communityId_status_idx" ON "community_members"("communityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "community_members_communityId_userId_key" ON "community_members"("communityId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "community_photo_assets_communityId_key" ON "community_photo_assets"("communityId");

-- CreateIndex
CREATE INDEX "community_reports_communityId_status_idx" ON "community_reports"("communityId", "status");

-- CreateIndex
CREATE INDEX "community_reports_priority_status_createdAt_idx" ON "community_reports"("priority", "status", "createdAt");

-- CreateIndex
CREATE INDEX "community_audit_logs_communityId_createdAt_idx" ON "community_audit_logs"("communityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_communityId_key" ON "conversations"("communityId");

-- CreateIndex
CREATE INDEX "ladders_communityId_state_idx" ON "ladders"("communityId", "state");

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ladders" ADD CONSTRAINT "ladders_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_photo_assets" ADD CONSTRAINT "community_photo_assets_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_audit_logs" ADD CONSTRAINT "community_audit_logs_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_audit_logs" ADD CONSTRAINT "community_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

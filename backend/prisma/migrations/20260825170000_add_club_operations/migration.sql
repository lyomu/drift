-- Structured competition controls and club operations for Phase 4.
ALTER TABLE "leagues"
  ADD COLUMN "scoringFormat" TEXT,
  ADD COLUMN "walkoverRule" TEXT,
  ADD COLUMN "unfinishedMatchPolicy" TEXT;

ALTER TABLE "seasons" ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE TYPE "ClubPostModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REMOVED', 'ESCALATED');
CREATE TYPE "ClubEventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "ClubEventRegistrationStatus" AS ENUM ('REGISTERED', 'CANCELLED', 'ATTENDED', 'NO_SHOW');
CREATE TYPE "CourtInquiryKind" AS ENUM ('PROFILE_VIEW', 'CONTACT', 'BOOKING');

CREATE TABLE "season_awards" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "issuedById" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "season_awards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_post_moderation_reports" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ClubPostModerationStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_post_moderation_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_media_assets" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "bytes" BYTEA NOT NULL,
  "caption" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_media_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_notification_settings" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "membershipChanges" BOOLEAN NOT NULL DEFAULT true,
  "competitionUpdates" BOOLEAN NOT NULL DEFAULT true,
  "eventRegistrations" BOOLEAN NOT NULL DEFAULT true,
  "moderationAlerts" BOOLEAN NOT NULL DEFAULT true,
  "weeklyDigest" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "club_notification_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_audit_logs" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "club_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_events" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "capacity" INTEGER,
  "status" "ClubEventStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "club_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "club_event_registrations" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "ClubEventRegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attendedAt" TIMESTAMP(3),
  CONSTRAINT "club_event_registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "court_inquiries" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "courtId" TEXT NOT NULL,
  "viewerId" TEXT,
  "kind" "CourtInquiryKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "court_inquiries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "season_awards_seasonId_recipientId_title_key" ON "season_awards"("seasonId", "recipientId", "title");
CREATE INDEX "season_awards_seasonId_issuedAt_idx" ON "season_awards"("seasonId", "issuedAt");
CREATE INDEX "club_post_moderation_reports_clubId_status_createdAt_idx" ON "club_post_moderation_reports"("clubId", "status", "createdAt");
CREATE INDEX "club_media_assets_clubId_createdAt_idx" ON "club_media_assets"("clubId", "createdAt");
CREATE UNIQUE INDEX "club_notification_settings_clubId_key" ON "club_notification_settings"("clubId");
CREATE INDEX "club_audit_logs_clubId_createdAt_idx" ON "club_audit_logs"("clubId", "createdAt");
CREATE INDEX "club_audit_logs_clubId_action_idx" ON "club_audit_logs"("clubId", "action");
CREATE INDEX "club_events_clubId_startsAt_idx" ON "club_events"("clubId", "startsAt");
CREATE UNIQUE INDEX "club_event_registrations_eventId_userId_key" ON "club_event_registrations"("eventId", "userId");
CREATE INDEX "club_event_registrations_eventId_status_idx" ON "club_event_registrations"("eventId", "status");
CREATE INDEX "court_inquiries_clubId_createdAt_idx" ON "court_inquiries"("clubId", "createdAt");
CREATE INDEX "court_inquiries_courtId_kind_createdAt_idx" ON "court_inquiries"("courtId", "kind", "createdAt");

ALTER TABLE "season_awards" ADD CONSTRAINT "season_awards_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "season_awards" ADD CONSTRAINT "season_awards_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "season_awards" ADD CONSTRAINT "season_awards_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "club_post_moderation_reports" ADD CONSTRAINT "club_post_moderation_reports_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_post_moderation_reports" ADD CONSTRAINT "club_post_moderation_reports_postId_fkey" FOREIGN KEY ("postId") REFERENCES "club_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_post_moderation_reports" ADD CONSTRAINT "club_post_moderation_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_post_moderation_reports" ADD CONSTRAINT "club_post_moderation_reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "club_media_assets" ADD CONSTRAINT "club_media_assets_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_media_assets" ADD CONSTRAINT "club_media_assets_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "club_notification_settings" ADD CONSTRAINT "club_notification_settings_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_audit_logs" ADD CONSTRAINT "club_audit_logs_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_audit_logs" ADD CONSTRAINT "club_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "club_events" ADD CONSTRAINT "club_events_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_events" ADD CONSTRAINT "club_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "club_event_registrations" ADD CONSTRAINT "club_event_registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "club_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_event_registrations" ADD CONSTRAINT "club_event_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "court_inquiries" ADD CONSTRAINT "court_inquiries_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "court_inquiries" ADD CONSTRAINT "court_inquiries_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "court_inquiries" ADD CONSTRAINT "court_inquiries_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

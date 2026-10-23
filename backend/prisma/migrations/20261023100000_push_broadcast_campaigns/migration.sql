CREATE TYPE "PushBroadcastAudience" AS ENUM ('PLAYER', 'COACH', 'CLUB_STAFF');
CREATE TYPE "PushBroadcastStatus" AS ENUM ('SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

ALTER TABLE "notifications" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "push_broadcasts"
  ADD COLUMN "audience" "PushBroadcastAudience"[] NOT NULL DEFAULT ARRAY[]::"PushBroadcastAudience"[],
  ADD COLUMN "status" "PushBroadcastStatus" NOT NULL DEFAULT 'SENT',
  ADD COLUMN "scheduledFor" TIMESTAMP(3),
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "failureReason" TEXT;

CREATE TABLE "push_broadcast_image_assets" (
  "id" TEXT NOT NULL,
  "broadcastId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "bytes" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_broadcast_image_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "push_broadcast_image_assets_broadcastId_key" ON "push_broadcast_image_assets"("broadcastId");
CREATE INDEX "push_broadcasts_status_scheduledFor_idx" ON "push_broadcasts"("status", "scheduledFor");
ALTER TABLE "push_broadcast_image_assets" ADD CONSTRAINT "push_broadcast_image_assets_broadcastId_fkey"
  FOREIGN KEY ("broadcastId") REFERENCES "push_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

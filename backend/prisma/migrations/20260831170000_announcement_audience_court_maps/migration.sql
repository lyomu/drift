-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('EVERYONE', 'MEMBERS', 'COACHES', 'ADMINS');

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN "audience" "AnnouncementAudience" NOT NULL DEFAULT 'EVERYONE';

-- AlterTable
ALTER TABLE "courts" ADD COLUMN "mapsUrl" TEXT;

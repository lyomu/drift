-- AlterEnum
ALTER TYPE "ClubMembershipStatus" ADD VALUE 'PENDING';

-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'CLUBS';

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "clubs" BOOLEAN NOT NULL DEFAULT true;

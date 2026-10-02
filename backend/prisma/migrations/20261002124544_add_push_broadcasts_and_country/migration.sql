-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'ANNOUNCEMENTS';

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "announcements" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "tennis_profiles" ADD COLUMN     "country" TEXT;

-- CreateTable
CREATE TABLE "push_broadcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "country" TEXT,
    "recipientCount" INTEGER NOT NULL,
    "deliveredCount" INTEGER NOT NULL,
    "skippedCount" INTEGER NOT NULL,
    "sentById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "push_broadcasts_createdAt_idx" ON "push_broadcasts"("createdAt");

-- CreateIndex
CREATE INDEX "push_broadcasts_sentById_idx" ON "push_broadcasts"("sentById");

-- AddForeignKey
ALTER TABLE "push_broadcasts" ADD CONSTRAINT "push_broadcasts_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

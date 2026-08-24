/*
  Warnings:

  - You are about to drop the column `roundIntervalDays` on the `seasons` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "seasons" DROP COLUMN "roundIntervalDays",
ADD COLUMN     "roundIntervalMinutes" INTEGER NOT NULL DEFAULT 1440;

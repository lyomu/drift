-- CreateEnum
CREATE TYPE "CourtBookingStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CourtBookingCanceller" AS ENUM ('PLAYER', 'CLUB');

-- AlterTable
ALTER TABLE "courts" ADD COLUMN     "bookingAdvanceDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "bookingMaxSlots" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "bookingSlotMinutes" INTEGER,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi';

-- CreateTable
CREATE TABLE "court_opening_hours" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "opensMinute" INTEGER NOT NULL,
    "closesMinute" INTEGER NOT NULL,

    CONSTRAINT "court_opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_bookings" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "courtGroupId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "CourtBookingStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "decisionNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" "CourtBookingCanceller",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "court_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "court_opening_hours_courtId_dayOfWeek_idx" ON "court_opening_hours"("courtId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "court_bookings_courtId_startsAt_idx" ON "court_bookings"("courtId", "startsAt");

-- CreateIndex
CREATE INDEX "court_bookings_courtGroupId_status_startsAt_idx" ON "court_bookings"("courtGroupId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "court_bookings_userId_startsAt_idx" ON "court_bookings"("userId", "startsAt");

-- CreateIndex
CREATE INDEX "court_bookings_courtId_status_idx" ON "court_bookings"("courtId", "status");

-- AddForeignKey
ALTER TABLE "court_opening_hours" ADD CONSTRAINT "court_opening_hours_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_bookings" ADD CONSTRAINT "court_bookings_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_bookings" ADD CONSTRAINT "court_bookings_courtGroupId_fkey" FOREIGN KEY ("courtGroupId") REFERENCES "court_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_bookings" ADD CONSTRAINT "court_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_bookings" ADD CONSTRAINT "court_bookings_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

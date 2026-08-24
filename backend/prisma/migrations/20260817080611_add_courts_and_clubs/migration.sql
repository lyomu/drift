-- CreateEnum
CREATE TYPE "ListingVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "CourtSurface" AS ENUM ('HARD', 'CLAY', 'GRASS', 'ARTIFICIAL_GRASS');

-- CreateEnum
CREATE TYPE "CourtBookingType" AS ENUM ('UNKNOWN', 'CONTACT_ONLY', 'EXTERNAL_LINK', 'NATIVE_PARTNER');

-- CreateEnum
CREATE TYPE "CourtReportReason" AS ENUM ('INCORRECT_INFO', 'PERMANENTLY_CLOSED', 'DUPLICATE_LISTING', 'INAPPROPRIATE_CONTENT', 'OTHER');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "courtId" TEXT;

-- CreateTable
CREATE TABLE "courts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "clubId" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "bookingType" "CourtBookingType" NOT NULL DEFAULT 'UNKNOWN',
    "bookingUrl" TEXT,
    "amenities" TEXT[],
    "openingHoursNote" TEXT,
    "isPublic" BOOLEAN,
    "photoUrls" TEXT[],
    "googlePlacesRef" TEXT,
    "verificationStatus" "ListingVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_groups" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "sport" "MatchSport" NOT NULL DEFAULT 'TENNIS',
    "surface" "CourtSurface" NOT NULL,
    "indoor" BOOLEAN NOT NULL DEFAULT false,
    "lighting" BOOLEAN NOT NULL DEFAULT false,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "court_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_reports" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "CourtReportReason" NOT NULL,
    "notes" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "website" TEXT,
    "amenities" TEXT[],
    "openingHoursNote" TEXT,
    "photoUrls" TEXT[],
    "verificationStatus" "ListingVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courts_latitude_longitude_idx" ON "courts"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "courts_clubId_idx" ON "courts"("clubId");

-- CreateIndex
CREATE INDEX "court_groups_courtId_idx" ON "court_groups"("courtId");

-- CreateIndex
CREATE INDEX "court_groups_sport_surface_indoor_idx" ON "court_groups"("sport", "surface", "indoor");

-- CreateIndex
CREATE INDEX "court_reports_courtId_status_idx" ON "court_reports"("courtId", "status");

-- CreateIndex
CREATE INDEX "clubs_latitude_longitude_idx" ON "clubs"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_groups" ADD CONSTRAINT "court_groups_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_reports" ADD CONSTRAINT "court_reports_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_reports" ADD CONSTRAINT "court_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

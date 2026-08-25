-- CreateEnum
CREATE TYPE "CoachLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'COMPETITIVE');

-- CreateTable
CREATE TABLE "coach_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" INTEGER,
    "specialisations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "levels" "CoachLevel"[] DEFAULT ARRAY[]::"CoachLevel"[],
    "availabilityNote" TEXT,
    "publicEmail" TEXT,
    "publicPhone" TEXT,
    "bookingUrl" TEXT,
    "verificationStatus" "ListingVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_club_affiliations" (
    "id" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_club_affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coach_profiles_userId_key" ON "coach_profiles"("userId");

-- CreateIndex
CREATE INDEX "coach_profiles_verificationStatus_idx" ON "coach_profiles"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "coach_club_affiliations_coachProfileId_clubId_key" ON "coach_club_affiliations"("coachProfileId", "clubId");

-- CreateIndex
CREATE INDEX "coach_club_affiliations_clubId_idx" ON "coach_club_affiliations"("clubId");

-- AddForeignKey
ALTER TABLE "coach_profiles" ADD CONSTRAINT "coach_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_club_affiliations" ADD CONSTRAINT "coach_club_affiliations_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "coach_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_club_affiliations" ADD CONSTRAINT "coach_club_affiliations_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('SIGN_UP', 'VERIFY', 'BASIC_PROFILE', 'TENNIS_EXPERIENCE', 'ASSESSMENT', 'LEVEL_REVIEW', 'GOALS', 'PLAYING_PREFERENCES', 'LOCATION', 'CLUB_COURTS', 'AVAILABILITY', 'PADEL_INTEREST', 'COMPLETE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "DominantHand" AS ENUM ('LEFT', 'RIGHT', 'AMBIDEXTROUS');

-- CreateEnum
CREATE TYPE "ExperienceSignal" AS ENUM ('NEW', 'UNDER_6M', 'SIX_TO_12M', 'ONE_TO_2Y', 'TWO_TO_5Y', 'FIVE_PLUS', 'COMPETITIVE');

-- CreateEnum
CREATE TYPE "FormatPreference" AS ENUM ('SINGLES', 'DOUBLES', 'EITHER');

-- CreateEnum
CREATE TYPE "StylePreference" AS ENUM ('SOCIAL', 'COMPETITIVE', 'EITHER');

-- CreateEnum
CREATE TYPE "TimeBlock" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "PadelInterestValue" AS ENUM ('YES', 'NO', 'WANT_TO_LEARN');

-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('GPS', 'MANUAL');

-- CreateEnum
CREATE TYPE "AssessmentBranch" AS ENUM ('BEGINNER', 'FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "AssessmentSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AssessmentPillar" AS ENUM ('FOREHAND', 'BACKHAND', 'SERVE', 'RETURN', 'NET_PLAY', 'MOVEMENT', 'MATCH_PLAY', 'COMPETITION_EXPERIENCE');

-- CreateEnum
CREATE TYPE "AnswerOption" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F');

-- CreateEnum
CREATE TYPE "VerificationChannel" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('SIGNUP');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "photoUrl" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "onboardingStep" "OnboardingStep" NOT NULL DEFAULT 'SIGN_UP',
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tennis_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "singlesRating" DOUBLE PRECISION,
    "doublesRating" DOUBLE PRECISION,
    "overallRating" DOUBLE PRECISION,
    "systemSuggestedLevel" DOUBLE PRECISION,
    "systemSuggestedLevelSetAt" TIMESTAMP(3),
    "userSelectedLevel" DOUBLE PRECISION,
    "dominantHand" "DominantHand",
    "experienceSignal" "ExperienceSignal",
    "selfReportedRatingScale" TEXT,
    "selfReportedRatingValue" DOUBLE PRECISION,
    "onboardingGoals" TEXT[],
    "formatPreference" "FormatPreference",
    "stylePreference" "StylePreference",
    "preferredTimeSlots" TEXT[],
    "generalLocation" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationSource" "LocationSource",
    "preferredClubName" TEXT,
    "preferredCourtNames" TEXT[],
    "padelInterest" "PadelInterestValue",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tennis_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_slots" (
    "id" TEXT NOT NULL,
    "tennisProfileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "timeBlock" "TimeBlock" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "padel_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "padel_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_sessions" (
    "id" TEXT NOT NULL,
    "tennisProfileId" TEXT NOT NULL,
    "branch" "AssessmentBranch" NOT NULL,
    "currentTier" "AssessmentBranch" NOT NULL,
    "questionBudget" INTEGER NOT NULL,
    "status" "AssessmentSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "resultSystemSuggestedLevel" DOUBLE PRECISION,
    "resultSkillBreakdown" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_answers" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "pillar" "AssessmentPillar" NOT NULL,
    "selectedOption" "AnswerOption" NOT NULL,
    "pointValue" INTEGER NOT NULL,
    "sequenceIndex" INTEGER NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "VerificationChannel" NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL DEFAULT 'SIGNUP',
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "tennis_profiles_userId_key" ON "tennis_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "availability_slots_tennisProfileId_dayOfWeek_timeBlock_key" ON "availability_slots"("tennisProfileId", "dayOfWeek", "timeBlock");

-- CreateIndex
CREATE UNIQUE INDEX "padel_profiles_userId_key" ON "padel_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_answers_sessionId_sequenceIndex_key" ON "assessment_answers"("sessionId", "sequenceIndex");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- AddForeignKey
ALTER TABLE "tennis_profiles" ADD CONSTRAINT "tennis_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_tennisProfileId_fkey" FOREIGN KEY ("tennisProfileId") REFERENCES "tennis_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "padel_profiles" ADD CONSTRAINT "padel_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_tennisProfileId_fkey" FOREIGN KEY ("tennisProfileId") REFERENCES "tennis_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "assessment_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

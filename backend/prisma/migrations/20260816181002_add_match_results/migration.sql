-- CreateEnum
CREATE TYPE "MatchResultStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "MatchResultOutcome" AS ENUM ('SCORE', 'WALKOVER', 'RETIREMENT');

-- CreateTable
CREATE TABLE "match_results" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "status" "MatchResultStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "outcome" "MatchResultOutcome" NOT NULL,
    "sets" JSONB,
    "winningSide" "MatchSide",
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "disputedById" TEXT,
    "disputedAt" TIMESTAMP(3),
    "disputantOutcome" "MatchResultOutcome",
    "disputantSets" JSONB,
    "disputantWinningSide" "MatchSide",
    "resolvedAt" TIMESTAMP(3),
    "ratingDeltaA" DOUBLE PRECISION,
    "ratingDeltaB" DOUBLE PRECISION,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_reflections" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_reflections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_results_matchId_key" ON "match_results"("matchId");

-- CreateIndex
CREATE INDEX "match_results_status_idx" ON "match_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "match_reflections_matchId_userId_key" ON "match_reflections"("matchId", "userId");

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_disputedById_fkey" FOREIGN KEY ("disputedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_reflections" ADD CONSTRAINT "match_reflections_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_reflections" ADD CONSTRAINT "match_reflections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

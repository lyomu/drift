-- Competitions expansion (Wave 6): knockout Tournaments and rolling Ladders.

-- CreateEnum
CREATE TYPE "TournamentState" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'RUNNING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LadderState" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LadderChallengeState" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'PLAYED');

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "sport" "MatchSport" NOT NULL DEFAULT 'TENNIS',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "drawSize" INTEGER NOT NULL,
    "state" "TournamentState" NOT NULL DEFAULT 'REGISTRATION_OPEN',
    "registrationClosesAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_entries" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_rounds" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,

    CONSTRAINT "tournament_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_fixtures" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "sideAUserId" TEXT,
    "sideBUserId" TEXT,
    "isBye" BOOLEAN NOT NULL DEFAULT false,
    "winnerUserId" TEXT,
    "matchId" TEXT,

    CONSTRAINT "tournament_fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ladders" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "sport" "MatchSport" NOT NULL DEFAULT 'TENNIS',
    "name" TEXT NOT NULL,
    "challengeRange" INTEGER NOT NULL DEFAULT 2,
    "state" "LadderState" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ladders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ladder_entries" (
    "id" TEXT NOT NULL,
    "ladderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ladder_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ladder_challenges" (
    "id" TEXT NOT NULL,
    "ladderId" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "defenderId" TEXT NOT NULL,
    "state" "LadderChallengeState" NOT NULL DEFAULT 'PENDING',
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ladder_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournaments_clubId_state_idx" ON "tournaments"("clubId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_entries_tournamentId_userId_key" ON "tournament_entries"("tournamentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_rounds_tournamentId_index_key" ON "tournament_rounds"("tournamentId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_fixtures_roundId_slotIndex_key" ON "tournament_fixtures"("roundId", "slotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_fixtures_matchId_key" ON "tournament_fixtures"("matchId");

-- CreateIndex
CREATE INDEX "ladders_clubId_state_idx" ON "ladders"("clubId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ladder_entries_ladderId_userId_key" ON "ladder_entries"("ladderId", "userId");

-- CreateIndex
CREATE INDEX "ladder_challenges_ladderId_state_idx" ON "ladder_challenges"("ladderId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ladder_challenges_matchId_key" ON "ladder_challenges"("matchId");

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_fixtures" ADD CONSTRAINT "tournament_fixtures_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "tournament_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_fixtures" ADD CONSTRAINT "tournament_fixtures_sideAUserId_fkey" FOREIGN KEY ("sideAUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_fixtures" ADD CONSTRAINT "tournament_fixtures_sideBUserId_fkey" FOREIGN KEY ("sideBUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_fixtures" ADD CONSTRAINT "tournament_fixtures_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ladders" ADD CONSTRAINT "ladders_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_ladderId_fkey" FOREIGN KEY ("ladderId") REFERENCES "ladders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ladder_entries" ADD CONSTRAINT "ladder_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ladder_challenges" ADD CONSTRAINT "ladder_challenges_ladderId_fkey" FOREIGN KEY ("ladderId") REFERENCES "ladders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ladder_challenges" ADD CONSTRAINT "ladder_challenges_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ladder_challenges" ADD CONSTRAINT "ladder_challenges_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ladder_challenges" ADD CONSTRAINT "ladder_challenges_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

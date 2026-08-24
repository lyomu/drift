-- CreateEnum
CREATE TYPE "LeagueState" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SeasonRegistrationStatus" AS ENUM ('ENROLLED', 'WAITLISTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "leagues" (
    "id" TEXT NOT NULL,
    "sport" "MatchSport" NOT NULL DEFAULT 'TENNIS',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rulesText" TEXT,
    "format" "MatchFormat" NOT NULL DEFAULT 'SINGLES',
    "state" "LeagueState" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "registrationOpensAt" TIMESTAMP(3) NOT NULL,
    "registrationClosesAt" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "roundCount" INTEGER NOT NULL,
    "roundIntervalDays" INTEGER NOT NULL DEFAULT 1,
    "capacity" INTEGER,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_registrations" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SeasonRegistrationStatus" NOT NULL DEFAULT 'ENROLLED',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixtures" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "sideAUserId" TEXT NOT NULL,
    "sideBUserId" TEXT,
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standings" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "previousRank" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "season_registrations_seasonId_status_idx" ON "season_registrations"("seasonId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "season_registrations_seasonId_userId_key" ON "season_registrations"("seasonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_seasonId_index_key" ON "rounds"("seasonId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "fixtures_matchId_key" ON "fixtures"("matchId");

-- CreateIndex
CREATE INDEX "fixtures_roundId_idx" ON "fixtures"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "standings_seasonId_userId_key" ON "standings"("seasonId", "userId");

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_registrations" ADD CONSTRAINT "season_registrations_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_registrations" ADD CONSTRAINT "season_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_sideAUserId_fkey" FOREIGN KEY ("sideAUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_sideBUserId_fkey" FOREIGN KEY ("sideBUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

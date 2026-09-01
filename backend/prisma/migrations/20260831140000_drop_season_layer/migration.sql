-- Drop the Season layer: a league is now a single competition run.
-- Season's scheduling columns fold up onto `leagues`; Round / Standing /
-- registrations / awards re-parent from `seasonId` onto `leagueId`.
--
-- NOTE: hand-written. On a dev database `npx prisma migrate reset` + reseed
-- is the reliable path; this script exists so migration history stays honest
-- and so an environment with data can be moved forward in place.

-- 1. leagues gains the competition-scheduling columns (from Season)
ALTER TABLE "leagues"
  ADD COLUMN "registrationOpensAt" TIMESTAMP(3),
  ADD COLUMN "registrationClosesAt" TIMESTAMP(3),
  ADD COLUMN "startsAt" TIMESTAMP(3),
  ADD COLUMN "roundCount" INTEGER,
  ADD COLUMN "roundIntervalMinutes" INTEGER NOT NULL DEFAULT 1440,
  ADD COLUMN "capacity" INTEGER,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelReason" TEXT,
  ADD COLUMN "completedAt" TIMESTAMP(3);

-- 2. Backfill each league from its most-recent season (one competition per league now)
UPDATE "leagues" l SET
  "registrationOpensAt"  = s."registrationOpensAt",
  "registrationClosesAt" = s."registrationClosesAt",
  "startsAt"             = s."startsAt",
  "roundCount"           = s."roundCount",
  "roundIntervalMinutes" = s."roundIntervalMinutes",
  "capacity"             = s."capacity",
  "cancelledAt"          = s."cancelledAt",
  "cancelReason"         = s."cancelReason",
  "completedAt"          = s."completedAt"
FROM (
  SELECT DISTINCT ON ("leagueId") *
  FROM "seasons"
  ORDER BY "leagueId", "startsAt" DESC
) s
WHERE s."leagueId" = l."id";

-- 3. leagues drops the old descriptive window (only ever used by the
--    season-within-league-window check, which is gone)
ALTER TABLE "leagues" DROP COLUMN "startDate", DROP COLUMN "endDate";

-- 4. Rename the registration-status enum
ALTER TYPE "SeasonRegistrationStatus" RENAME TO "LeagueRegistrationStatus";

-- 5. rounds: seasonId -> leagueId
ALTER TABLE "rounds" DROP CONSTRAINT "rounds_seasonId_fkey";
ALTER INDEX "rounds_seasonId_index_key" RENAME TO "rounds_leagueId_index_key";
ALTER TABLE "rounds" RENAME COLUMN "seasonId" TO "leagueId";
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_leagueId_fkey"
  FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. standings: seasonId -> leagueId
ALTER TABLE "standings" DROP CONSTRAINT "standings_seasonId_fkey";
ALTER INDEX "standings_seasonId_userId_key" RENAME TO "standings_leagueId_userId_key";
ALTER TABLE "standings" RENAME COLUMN "seasonId" TO "leagueId";
ALTER TABLE "standings" ADD CONSTRAINT "standings_leagueId_fkey"
  FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. season_registrations -> league_registrations
ALTER TABLE "season_registrations" DROP CONSTRAINT "season_registrations_seasonId_fkey";
ALTER TABLE "season_registrations" RENAME TO "league_registrations";
ALTER TABLE "league_registrations" RENAME COLUMN "seasonId" TO "leagueId";
ALTER INDEX "season_registrations_pkey" RENAME TO "league_registrations_pkey";
ALTER INDEX "season_registrations_seasonId_userId_key" RENAME TO "league_registrations_leagueId_userId_key";
ALTER INDEX "season_registrations_seasonId_status_idx" RENAME TO "league_registrations_leagueId_status_idx";
ALTER TABLE "league_registrations" RENAME CONSTRAINT "season_registrations_userId_fkey" TO "league_registrations_userId_fkey";
ALTER TABLE "league_registrations" ADD CONSTRAINT "league_registrations_leagueId_fkey"
  FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. season_awards -> league_awards
ALTER TABLE "season_awards" DROP CONSTRAINT "season_awards_seasonId_fkey";
ALTER TABLE "season_awards" RENAME TO "league_awards";
ALTER TABLE "league_awards" RENAME COLUMN "seasonId" TO "leagueId";
ALTER INDEX "season_awards_pkey" RENAME TO "league_awards_pkey";
ALTER INDEX "season_awards_seasonId_recipientId_title_key" RENAME TO "league_awards_leagueId_recipientId_title_key";
ALTER INDEX "season_awards_seasonId_issuedAt_idx" RENAME TO "league_awards_leagueId_issuedAt_idx";
ALTER TABLE "league_awards" RENAME CONSTRAINT "season_awards_recipientId_fkey" TO "league_awards_recipientId_fkey";
ALTER TABLE "league_awards" RENAME CONSTRAINT "season_awards_issuedById_fkey" TO "league_awards_issuedById_fkey";
ALTER TABLE "league_awards" ADD CONSTRAINT "league_awards_leagueId_fkey"
  FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. Season is gone
DROP TABLE "seasons";

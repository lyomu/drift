-- Phase 5E: reusable platform-admin competition rulesets.
-- Migration source only; execution is deferred to the consolidated QA pass.

CREATE TABLE "competition_rulesets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sport" "MatchSport" NOT NULL DEFAULT 'TENNIS',
    "format" "MatchFormat" NOT NULL DEFAULT 'SINGLES',
    "competitionTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "scoringFormat" TEXT NOT NULL,
    "walkoverRule" TEXT NOT NULL,
    "unfinishedMatchPolicy" TEXT NOT NULL,
    "rulesText" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_rulesets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "competition_rulesets_sport_format_isActive_idx"
    ON "competition_rulesets"("sport", "format", "isActive");

CREATE INDEX "competition_rulesets_isDefault_idx"
    ON "competition_rulesets"("isDefault");

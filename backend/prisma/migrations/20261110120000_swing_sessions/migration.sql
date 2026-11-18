-- Swing Check: on-device swing metrics (docs/ml/SWING_METRICS_SPEC.md).
--
-- The phone runs pose detection itself and sends only the numbers it derived.
-- No video and no pose landmarks are stored here, by design.

CREATE TYPE "SwingStroke" AS ENUM ('FOREHAND', 'SERVE');

CREATE TABLE "swing_sessions" (
    "id"             TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "stroke"         "SwingStroke" NOT NULL,
    "dominantHand"   "DominantHand" NOT NULL,
    "swingsDetected" INTEGER NOT NULL,
    "swingsMeasured" INTEGER NOT NULL,

    -- Per-swing values and refusal reasons, and the session summary, as the app
    -- computed them. JSON so a new metric does not need a migration.
    "metrics"        JSONB NOT NULL,
    "summary"        JSONB NOT NULL,

    -- Coach feedback once generated (tips, locale, provider/model). NULL until asked.
    "feedback"       JSONB,

    -- Which pose model and app build produced the numbers.
    "poseModel"      TEXT NOT NULL,
    "appVersion"     TEXT NOT NULL,

    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swing_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "swing_sessions_userId_createdAt_idx"
    ON "swing_sessions"("userId", "createdAt");

ALTER TABLE "swing_sessions"
    ADD CONSTRAINT "swing_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

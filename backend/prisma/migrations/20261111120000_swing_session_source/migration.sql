-- Swing Check: record where a session's frames came from (VIDEO_AI_BUILD_PLAN.md A4).
--
-- LIVE = the phone's camera, CLIP = a video already on the phone, analysed on
-- the phone. The clip itself is never uploaded; only the numbers are stored.
-- Existing rows are all live sessions, hence the default.

CREATE TYPE "SwingSessionSource" AS ENUM ('LIVE', 'CLIP');

ALTER TABLE "swing_sessions"
    ADD COLUMN "source" "SwingSessionSource" NOT NULL DEFAULT 'LIVE';

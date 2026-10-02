-- Analysis results for video_analysis_jobs.
--
-- The summary is stored whole rather than exploded into columns, matching
-- precheckResult and for the same reason: the shape belongs to cv-service and moves
-- with it. It also carries `court_calibrated` and a `warning` when the court fit
-- failed, which is what separates a measurement from a plausible-looking number, and
-- flattening it into typed columns is how that distinction gets lost.

ALTER TABLE "video_analysis_jobs"
    ADD COLUMN "analysisResult" JSONB,
    ADD COLUMN "failureReason"  TEXT;

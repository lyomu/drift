-- Phase 5F: platform-admin learning content paths.
-- Migration source only; execution is deferred to the consolidated QA pass.

ALTER TABLE "learning_content"
  ADD COLUMN "pathGoal" TEXT;

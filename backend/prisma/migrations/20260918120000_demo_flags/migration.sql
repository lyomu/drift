-- Demo-account isolation (2026-09).
--
-- A seeded demo persona (player + club owner, with three months of history)
-- lives in the production database so it can be shown to prospects. These
-- flags let discovery surfaces hide it from real users — and hide real users
-- from the demo persona, so a demo challenge can never notify a real person.
-- Defaults are false: every existing row stays a real one.

ALTER TABLE "users"
    ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "clubs"
    ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- Launch waitlist for the public website (2026-09).
--
-- The landing page previously had no conversion action at all: the store
-- listings do not exist yet, so its "get the app" buttons were inert spans
-- and the only way to register interest was a mailto link. This table is
-- what replaces that.
--
-- Intentionally unrelated to "users". These people have no account, and the
-- list exists for exactly one send — "the app is live". Keeping it out of
-- the identity graph means it can be exported, or deleted wholesale after
-- launch, without a single foreign key to reason about.
--
-- "email" is UNIQUE and normalised (lower-cased, trimmed) by the service
-- before insert. Postgres unique indexes are case-sensitive, so without that
-- normalisation "A@b.com" and "a@b.com" would both be accepted as separate
-- people. The writer upserts on this column, which is also why a repeat
-- submission is a no-op rather than an error the form has to explain.
--
-- "audience" defaults to PLAYER: the form defaults to it too, and a signup
-- that never touched the toggle is a player.

CREATE TYPE "WaitlistAudience" AS ENUM ('PLAYER', 'CLUB');

CREATE TABLE "waitlist_signups" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "audience" "WaitlistAudience" NOT NULL DEFAULT 'PLAYER',
    "city" TEXT,
    "level" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_signups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_signups_email_key" ON "waitlist_signups"("email");

-- Every read of this table is "who signed up, newest first" or "who signed up
-- between these dates" — there is no other access pattern.
CREATE INDEX "waitlist_signups_createdAt_idx" ON "waitlist_signups"("createdAt");

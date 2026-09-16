-- First name on waitlist signups (2026-09).
--
-- The launch email reads better addressed to someone, and the signup form now
-- asks for a first name before the email address.
--
-- Nullable, and first name only. The form requires it, but the column does
-- not: a signup captured through some other route later should not be forced
-- to invent one, and a marketing list has no business holding a full legal
-- name it will never use.
--
-- Added as its own migration rather than by editing
-- `20260908000800_waitlist_signups`, because Prisma records a checksum per
-- migration and rewriting one that has already been applied anywhere makes
-- `migrate deploy` fail on that environment.

ALTER TABLE "waitlist_signups"
    ADD COLUMN "firstName" TEXT;

-- Country on waitlist signups (2026-09).
--
-- Captures market interest before the optional free-text city. Kept nullable:
-- country improves launch planning but is not needed to join the list.

ALTER TABLE "waitlist_signups"
    ADD COLUMN "country" TEXT;

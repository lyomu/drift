-- Phone number + WhatsApp reachability, collected at signup and on Basic
-- Profile (2026-09).
--
-- Only the flag is new: "phone" has existed on "users" since the schema was
-- laid down, it simply had no writer. This adds the companion boolean.
--
-- NOT NULL DEFAULT false rather than nullable: "no answer" and "not on
-- WhatsApp" are the same thing to every caller, and a three-state field would
-- invite readers to distinguish them for no benefit. Existing rows are
-- backfilled to false by the default, which is correct — none of them were
-- ever asked.
--
-- The number itself stays UNVERIFIED: there is no SMS provider, so
-- "phoneVerifiedAt" remains null and this is a contact detail, not a factor.

ALTER TABLE "users"
    ADD COLUMN "phoneOnWhatsApp" BOOLEAN NOT NULL DEFAULT false;

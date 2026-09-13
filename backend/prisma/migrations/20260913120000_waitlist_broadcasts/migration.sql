-- Launch-waitlist management for platform admin (2026-09).
--
-- The waitlist shipped write-only: the public form joined and confirmed, and
-- that was the whole surface. Managing it needs two more things — a record of
-- each bulk send (so a launch email is never double-sent by accident) and a
-- per-address marker of the last broadcast that actually reached it.
--
-- `audience` stays nullable on purpose: null is a real state here, meaning
-- "sent to the whole list", not missing data.

ALTER TABLE "waitlist_signups"
    ADD COLUMN "lastEmailedAt" TIMESTAMP(3);

CREATE TABLE "waitlist_broadcasts" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "WaitlistAudience",
    "recipientCount" INTEGER NOT NULL,
    "deliveredCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "sentById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_broadcasts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "waitlist_broadcasts"
    ADD CONSTRAINT "waitlist_broadcasts_sentById_fkey"
    FOREIGN KEY ("sentById") REFERENCES "platform_admins"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "waitlist_broadcasts_createdAt_idx" ON "waitlist_broadcasts"("createdAt");
CREATE INDEX "waitlist_broadcasts_sentById_idx" ON "waitlist_broadcasts"("sentById");

-- Home feed card dismiss/snooze — foundation/04-screen-inventory.md §A.3
-- lists "Dismiss/snooze a card" as a Home secondary action, unbuilt until now.
-- Migration source only; execution is deferred to the consolidated QA pass.

CREATE TABLE "dismissed_home_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dismissed_home_cards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dismissed_home_cards_userId_cardId_key" ON "dismissed_home_cards"("userId", "cardId");
CREATE INDEX "dismissed_home_cards_userId_idx" ON "dismissed_home_cards"("userId");

ALTER TABLE "dismissed_home_cards" ADD CONSTRAINT "dismissed_home_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

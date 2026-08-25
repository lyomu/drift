-- Phase 5G: platform-admin commercial definitions.
-- Migration source only; execution is deferred to the consolidated QA pass.

CREATE TYPE "PromotionDiscountType" AS ENUM ('PERCENT', 'AMOUNT');

CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "audience" "BillingAudience",
    "discountType" "PromotionDiscountType" NOT NULL,
    "percentOff" INTEGER,
    "amountOffMinor" INTEGER,
    "currency" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");
CREATE INDEX "promotions_isActive_startsAt_endsAt_idx" ON "promotions"("isActive", "startsAt", "endsAt");
CREATE INDEX "promotions_audience_isActive_idx" ON "promotions"("audience", "isActive");

CREATE TABLE "sponsor_placements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sponsorName" TEXT NOT NULL,
    "placementKey" TEXT NOT NULL,
    "destinationUrl" TEXT,
    "imageUrl" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsor_placements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sponsor_placements_placementKey_isActive_idx" ON "sponsor_placements"("placementKey", "isActive");
CREATE INDEX "sponsor_placements_startsAt_endsAt_idx" ON "sponsor_placements"("startsAt", "endsAt");

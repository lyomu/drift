-- Tracker 7.1 — connect Platform Admin to the payment provider.
--
-- 1. `provider_plans` replaces `payment_plans."providerPlanId"`.
--    A hosted provider bills a fixed amount against a mandate, so a discount
--    cannot be applied per cycle from our side; a promotion is a *different*
--    provider plan at the discounted price. One nullable column could not hold
--    both, so the mapping moves to its own table keyed on the triple
--    (plan, promotion, provider) with a null promotion meaning "no discount".
--
-- 2. `providerInvoiceId` on a transaction is the provider's own per-charge id,
--    captured from the webhook. Refunds are filed against it, so a transaction
--    without one can only ever be marked refunded in our own ledger.

ALTER TABLE "payment_plans" DROP COLUMN "providerPlanId";

ALTER TABLE "payment_transactions" ADD COLUMN "providerInvoiceId" TEXT;

CREATE TABLE "provider_plans" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "promotionId" TEXT,
    "provider" TEXT NOT NULL,
    "providerPlanId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "provider_plans_planId_promotionId_provider_key" ON "provider_plans"("planId", "promotionId", "provider");
CREATE INDEX "provider_plans_provider_providerPlanId_idx" ON "provider_plans"("provider", "providerPlanId");

ALTER TABLE "provider_plans" ADD CONSTRAINT "provider_plans_planId_fkey" FOREIGN KEY ("planId") REFERENCES "payment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_plans" ADD CONSTRAINT "provider_plans_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

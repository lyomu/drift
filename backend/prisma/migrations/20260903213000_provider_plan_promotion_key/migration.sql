-- `provider_plans` was unique on (planId, promotionId, provider) with a
-- nullable promotionId. Postgres treats NULLs in a unique index as distinct, so
-- that constraint did not actually stop the undiscounted plan being minted
-- twice — and Prisma refuses a null in a compound unique lookup, so the code
-- could not even read the row back. A non-null discriminator fixes both.
ALTER TABLE "provider_plans" ADD COLUMN "promotionKey" TEXT;
UPDATE "provider_plans" SET "promotionKey" = COALESCE("promotionId", '');
ALTER TABLE "provider_plans" ALTER COLUMN "promotionKey" SET NOT NULL;

DROP INDEX "provider_plans_planId_promotionId_provider_key";
CREATE UNIQUE INDEX "provider_plans_planId_promotionKey_provider_key" ON "provider_plans"("planId", "promotionKey", "provider");

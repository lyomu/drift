-- Tracker 7.1 — club billing through IntaSend.
--
-- The hosted provider mints its own plan and customer identifiers. Storing them
-- is what stops a duplicate plan being created in the provider for every club
-- that subscribes, and a duplicate customer for every checkout.
--
-- Both are nullable on purpose: every existing row predates the provider, and a
-- free plan never reaches it at all.
ALTER TABLE "payment_plans" ADD COLUMN "providerPlanId" TEXT;
ALTER TABLE "billing_accounts" ADD COLUMN "providerCustomerId" TEXT;

-- Hybrid club billing: IntaSend (KES/M-Pesa) + Paddle (USD), routed by plan
-- currency. Closes the 404 a club owner hit on IntaSend's hosted checkout: the
-- only paid club plan was priced in XTS, ISO's test currency, which IntaSend
-- accepts enough to mint a plan and a setup_url but cannot actually render a
-- checkout page for.
--
-- See docs/PAYMENTS_PLAN.md for the routing model this supports.

-- Groups currency variants of the same tier for display only.
ALTER TABLE "payment_plans" ADD COLUMN "groupCode" TEXT;

-- Which hosted provider issued a subscription's providerReference. Needed now
-- that more than one hosted provider can be active: cancelling a mandate has
-- to call the provider that actually holds it.
ALTER TABLE "billing_subscriptions" ADD COLUMN "provider" TEXT;

-- Backfill: IntaSend is the only hosted provider that has ever run here, so
-- every existing row with a provider-issued reference was billed through it.
UPDATE "billing_subscriptions"
SET "provider" = 'INTASEND'
WHERE "providerReference" IS NOT NULL;

-- The free tier gets a groupCode too, and its currency moves off XTS to USD —
-- cosmetic only, since a free plan (priceMinor 0) never reaches a provider.
UPDATE "payment_plans"
SET "groupCode" = 'CLUB_STARTER', "currency" = 'USD'
WHERE "id" = 'seed-plan-club-starter';

-- Two real paid tiers, each priced in both KES (IntaSend) and USD (Paddle).
-- Prices and entitlement copy here are placeholders — see
-- docs/OWNER_ACTIONS.md for replacing them before a real club sees them.
-- The old CLUB_GROWTH_SANDBOX (XTS) row is left untouched: once the app
-- filters plan listings to currencies a configured provider actually bills,
-- it stops being offered anywhere real, while staying available to
-- dev/CI's sandbox-covers-everything mode exactly as before.
INSERT INTO "payment_plans"
  ("id", "code", "name", "description", "audience", "priceMinor", "currency", "interval", "entitlements", "isActive", "isTest", "sortOrder", "groupCode", "updatedAt")
VALUES
  ('seed-plan-club-pro-usd', 'CLUB_PRO_USD', 'Club Pro', 'Placeholder pricing — replace before launch.', 'CLUB', 2900, 'USD', 'MONTHLY', ARRAY['Everything in Starter', 'Tournaments and ladders', 'Coach affiliations', 'Priority support'], true, false, 20, 'CLUB_PRO', CURRENT_TIMESTAMP),
  ('seed-plan-club-pro-kes', 'CLUB_PRO_KES', 'Club Pro', 'Placeholder pricing — replace before launch.', 'CLUB', 300000, 'KES', 'MONTHLY', ARRAY['Everything in Starter', 'Tournaments and ladders', 'Coach affiliations', 'Priority support'], true, false, 20, 'CLUB_PRO', CURRENT_TIMESTAMP),
  ('seed-plan-club-elite-usd', 'CLUB_ELITE_USD', 'Club Elite', 'Placeholder pricing — replace before launch.', 'CLUB', 7900, 'USD', 'MONTHLY', ARRAY['Everything in Pro', 'Custom court operations', 'Advanced analytics', 'Dedicated onboarding'], true, false, 30, 'CLUB_ELITE', CURRENT_TIMESTAMP),
  ('seed-plan-club-elite-kes', 'CLUB_ELITE_KES', 'Club Elite', 'Placeholder pricing — replace before launch.', 'CLUB', 800000, 'KES', 'MONTHLY', ARRAY['Everything in Pro', 'Custom court operations', 'Advanced analytics', 'Dedicated onboarding'], true, false, 30, 'CLUB_ELITE', CURRENT_TIMESTAMP);

-- Club Starter is the real free tier every club is put on at signup
-- (BillingService.ensureAccount picks the cheapest active plan), but the
-- original payments migration seeded it with isTest = true, alongside the
-- sandbox plans. The billing summary reports `sandbox: plan.isTest`, so every
-- club on the free tier saw "This is a test plan — no real payment method or
-- provider token is involved." on its Billing page. Club Pro and Elite were
-- already isTest = false. The sandbox-only plans (CLUB_GROWTH_SANDBOX,
-- PLAYER_PLUS_SANDBOX) keep their flag.
UPDATE "payment_plans"
SET "isTest" = false
WHERE "id" = 'seed-plan-club-starter';

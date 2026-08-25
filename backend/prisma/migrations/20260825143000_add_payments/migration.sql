-- Provider-neutral payments foundation. XTS is ISO 4217's test currency;
-- these paid plans exercise the complete flow without asserting production
-- pricing before Drift has made that commercial decision.

CREATE TYPE "BillingAudience" AS ENUM ('PLAYER', 'CLUB');
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED');
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'MOBILE_MONEY');
CREATE TYPE "BillingInvoiceStatus" AS ENUM ('OPEN', 'PAID', 'FAILED', 'VOID');
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

CREATE TABLE "payment_plans" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "audience" "BillingAudience" NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "entitlements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "billing_accounts_exactly_one_owner_check"
      CHECK ((CASE WHEN "userId" IS NULL THEN 0 ELSE 1 END) +
             (CASE WHEN "clubId" IS NULL THEN 0 ELSE 1 END) = 1)
);

CREATE TABLE "billing_subscriptions" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "providerReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerToken" TEXT NOT NULL,
    "brand" TEXT,
    "last4" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "BillingInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "billingAccountId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_plans_code_key" ON "payment_plans"("code");
CREATE INDEX "payment_plans_audience_isActive_sortOrder_idx" ON "payment_plans"("audience", "isActive", "sortOrder");
CREATE UNIQUE INDEX "billing_accounts_userId_key" ON "billing_accounts"("userId");
CREATE UNIQUE INDEX "billing_accounts_clubId_key" ON "billing_accounts"("clubId");
CREATE UNIQUE INDEX "billing_subscriptions_billingAccountId_key" ON "billing_subscriptions"("billingAccountId");
CREATE INDEX "billing_subscriptions_planId_status_idx" ON "billing_subscriptions"("planId", "status");
CREATE UNIQUE INDEX "payment_methods_providerToken_key" ON "payment_methods"("providerToken");
CREATE INDEX "payment_methods_billingAccountId_removedAt_idx" ON "payment_methods"("billingAccountId", "removedAt");
CREATE UNIQUE INDEX "billing_invoices_number_key" ON "billing_invoices"("number");
CREATE INDEX "billing_invoices_billingAccountId_createdAt_idx" ON "billing_invoices"("billingAccountId", "createdAt");
CREATE INDEX "billing_invoices_status_idx" ON "billing_invoices"("status");
CREATE UNIQUE INDEX "payment_transactions_invoiceId_key" ON "payment_transactions"("invoiceId");
CREATE UNIQUE INDEX "payment_transactions_providerReference_key" ON "payment_transactions"("providerReference");
CREATE INDEX "payment_transactions_billingAccountId_createdAt_idx" ON "payment_transactions"("billingAccountId", "createdAt");
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "payment_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "payment_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "billing_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "payment_plans" ("id", "code", "name", "description", "audience", "priceMinor", "currency", "interval", "entitlements", "isActive", "isTest", "sortOrder", "updatedAt") VALUES
  ('seed-plan-player-free', 'PLAYER_FREE', 'Free', 'Core Drift access for every player.', 'PLAYER', 0, 'XTS', 'MONTHLY', ARRAY['Player discovery', 'Matches and competitions', 'Learning library'], true, true, 0, CURRENT_TIMESTAMP),
  ('seed-plan-player-plus-sandbox', 'PLAYER_PLUS_SANDBOX', 'Drift Plus Sandbox', 'Test-only paid tier for validating upgrade and billing flows.', 'PLAYER', 1000, 'XTS', 'MONTHLY', ARRAY['Everything in Free', 'Sandbox premium entitlement'], true, true, 10, CURRENT_TIMESTAMP),
  ('seed-plan-club-starter', 'CLUB_STARTER', 'Club Starter', 'Core club administration access.', 'CLUB', 0, 'XTS', 'MONTHLY', ARRAY['Club profile and members', 'Competitions and courts'], true, true, 0, CURRENT_TIMESTAMP),
  ('seed-plan-club-growth-sandbox', 'CLUB_GROWTH_SANDBOX', 'Club Growth Sandbox', 'Test-only paid tier for validating club billing flows.', 'CLUB', 2500, 'XTS', 'MONTHLY', ARRAY['Everything in Club Starter', 'Sandbox commercial entitlement'], true, true, 10, CURRENT_TIMESTAMP);

-- Phase 4 — Google & Apple sign-in.
--
-- Two changes, both additive in effect:
--
-- 1. "passwordHash" becomes nullable. A Google- or Apple-only user has no
--    password at all, so the column can no longer be required. Every read path
--    that compared against it now guards the null first (AuthService.login and
--    changePassword) — a social-only account gets the same generic rejection a
--    wrong password gets, so the two cannot be told apart by probing.
--
-- 2. social_identities stores one row per (provider, providerAccountId). The
--    unique constraint on that pair is what makes provider sign-in idempotent:
--    a returning user is matched on the provider's immutable `sub`, never on
--    email, so changing the address at Google keeps the same Drift account.
--    One user may hold several rows (Google + Apple + a password).
--
-- Rollback: revert the application commit. The column stays nullable — no
-- destructive down-migration, and a nullable column no code writes null into
-- is harmless.

CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'APPLE');

ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE TABLE "social_identities" (
    "id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_identities_provider_providerAccountId_key"
    ON "social_identities"("provider", "providerAccountId");

CREATE INDEX "social_identities_userId_idx" ON "social_identities"("userId");

ALTER TABLE "social_identities"
    ADD CONSTRAINT "social_identities_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

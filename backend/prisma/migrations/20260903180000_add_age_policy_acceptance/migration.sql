-- P.2: record acceptance of the launch 18+ account policy without storing date of birth.
ALTER TABLE "users"
  ADD COLUMN "agePolicyAcceptedAt" TIMESTAMP(3);

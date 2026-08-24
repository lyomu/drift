-- AlterEnum
-- Password reset reuses the whole VerificationCode machinery (code hashing,
-- expiry, attempt counting, resend throttling) that SIGNUP already relies on;
-- the purpose column is the only thing that distinguishes the two flows.
ALTER TYPE "VerificationPurpose" ADD VALUE 'PASSWORD_RESET';

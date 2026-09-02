-- Phase 6 — push notification device tokens.
--
-- `token` is UNIQUE on its own rather than paired with "userId". An FCM token
-- identifies an *installation*, not a person, so when a second account signs
-- in on the same handset the row has to MOVE to them — which an upsert on
-- `token` does in a single statement. A composite unique on
-- ("userId", "token") would instead leave the previous owner's row in place,
-- and that person would keep receiving notifications on a device that is no
-- longer theirs.
--
-- ON DELETE CASCADE matters beyond tidiness: a device token is personal data
-- tied to a user, so it has to disappear with them for the GDPR erasure work
-- still open as tracker P.3.

CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS');

CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

CREATE INDEX "device_tokens_userId_idx" ON "device_tokens"("userId");

ALTER TABLE "device_tokens"
    ADD CONSTRAINT "device_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

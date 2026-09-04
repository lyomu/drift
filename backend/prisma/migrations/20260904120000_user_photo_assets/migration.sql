-- Profile photo uploads (2026-09 shell redesign).
--
-- Bytes live in Postgres, exactly as "club_media_assets" already does — no
-- object store exists in this deployment, and a profile photo is small and
-- capped at 5MB by the upload interceptor.
--
-- UNIQUE on "userId" rather than a plain index: a person has at most one
-- profile photo, so re-uploading has to REPLACE the row (an upsert on
-- "userId") instead of accumulating orphaned blobs nobody can reach.
--
-- ON DELETE CASCADE because a photo is personal data tied to a user and must
-- disappear with them for the erasure job (tracker P.3).

CREATE TABLE "user_photo_assets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_photo_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_photo_assets_userId_key" ON "user_photo_assets"("userId");

ALTER TABLE "user_photo_assets"
    ADD CONSTRAINT "user_photo_assets_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

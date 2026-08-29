CREATE TABLE "platform_admin_password_resets" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_admin_password_resets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_admin_password_resets_adminId_expiresAt_idx"
  ON "platform_admin_password_resets"("adminId", "expiresAt");

ALTER TABLE "platform_admin_password_resets"
  ADD CONSTRAINT "platform_admin_password_resets_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "platform_admins"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

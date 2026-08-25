CREATE TYPE "PlatformPermission" AS ENUM (
  'ACCESS_MANAGE',
  'USERS_MANAGE',
  'ANALYTICS_READ',
  'VENUES_MANAGE',
  'ORGANIZATIONS_MANAGE',
  'COMPETITIONS_MANAGE',
  'CONTENT_MANAGE',
  'COMMERCIAL_MANAGE',
  'TRUST_SAFETY_MANAGE',
  'PLATFORM_CONFIG_MANAGE',
  'SUPPORT_MANAGE',
  'AUDIT_READ'
);

CREATE TABLE "platform_roles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_role_permissions" (
  "roleId" TEXT NOT NULL,
  "permission" "PlatformPermission" NOT NULL,
  CONSTRAINT "platform_role_permissions_pkey" PRIMARY KEY ("roleId", "permission")
);

CREATE TABLE "platform_admin_two_factor_challenges" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_admin_two_factor_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_admin_invitations" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_admin_invitations_pkey" PRIMARY KEY ("id")
);

INSERT INTO "platform_roles" ("id", "name", "description", "isSystem", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Super Admin',
  'Protected bootstrap role with full platform access.',
  true,
  CURRENT_TIMESTAMP
);

INSERT INTO "platform_role_permissions" ("roleId", "permission")
SELECT '00000000-0000-4000-8000-000000000001', value::"PlatformPermission"
FROM unnest(enum_range(NULL::"PlatformPermission")) AS value;

ALTER TABLE "platform_admins"
  ADD COLUMN "roleId" TEXT,
  ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "platform_admins"
SET "roleId" = '00000000-0000-4000-8000-000000000001'
WHERE "roleId" IS NULL;

ALTER TABLE "platform_admins" ALTER COLUMN "roleId" SET NOT NULL;

CREATE UNIQUE INDEX "platform_roles_name_key" ON "platform_roles"("name");
CREATE INDEX "platform_role_permissions_permission_idx" ON "platform_role_permissions"("permission");
CREATE INDEX "platform_admins_roleId_deactivatedAt_idx" ON "platform_admins"("roleId", "deactivatedAt");
CREATE INDEX "platform_admin_two_factor_challenges_adminId_expiresAt_idx" ON "platform_admin_two_factor_challenges"("adminId", "expiresAt");
CREATE UNIQUE INDEX "platform_admin_invitations_tokenHash_key" ON "platform_admin_invitations"("tokenHash");
CREATE INDEX "platform_admin_invitations_email_acceptedAt_idx" ON "platform_admin_invitations"("email", "acceptedAt");

ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "platform_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_role_permissions" ADD CONSTRAINT "platform_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "platform_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_admin_two_factor_challenges" ADD CONSTRAINT "platform_admin_two_factor_challenges_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_admin_invitations" ADD CONSTRAINT "platform_admin_invitations_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "platform_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_admin_invitations" ADD CONSTRAINT "platform_admin_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

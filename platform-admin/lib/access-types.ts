export type PlatformPermission =
  | "ACCESS_MANAGE"
  | "USERS_MANAGE"
  | "ANALYTICS_READ"
  | "VENUES_MANAGE"
  | "ORGANIZATIONS_MANAGE"
  | "COMPETITIONS_MANAGE"
  | "CONTENT_MANAGE"
  | "COMMERCIAL_MANAGE"
  | "TRUST_SAFETY_MANAGE"
  | "PLATFORM_CONFIG_MANAGE"
  | "SUPPORT_MANAGE"
  | "AUDIT_READ";

export type PermissionDefinition = {
  permission: PlatformPermission;
  module: string;
  description: string;
};

export type PlatformRole = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: PlatformPermission[];
  _count?: { admins: number };
};

export type PlatformStaff = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  deactivatedAt: string | null;
  twoFactorEnabled: boolean;
  role: { id: string; name: string };
};

export type PlatformInvitation = {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string;
  role: { id: string; name: string };
};

export type CurrentPlatformAdmin = {
  id: string;
  email: string;
  name: string | null;
  role: {
    id: string;
    name: string;
    permissions: PlatformPermission[];
  };
};

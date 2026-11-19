import type { ClubRole } from "./organization-types";

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type UserVerificationStatus =
  | "UNVERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "RESTRICTED";
export type ClubMembershipStatus = "INVITED" | "PENDING" | "ACTIVE" | "SUSPENDED";

/**
 * Overlapping tags, not a partition — a club owner who plays and coaches
 * carries all three. Derived server-side from which profile relations exist
 * (`User` has no role column), so the rules stay in one place. Platform-staff
 * permissions are a separate identity and never appear here.
 */
export type UserCategory = "PLAYER" | "COACH" | "CLUB_STAFF";

export const USER_CATEGORY_LABEL: Record<UserCategory, string> = {
  PLAYER: "Player",
  COACH: "Coach",
  CLUB_STAFF: "Club staff",
};

export const CLUB_ROLES: ClubRole[] = [
  "OWNER",
  "ADMIN",
  "COMPETITION_MANAGER",
  "COACH",
  "CONTENT_MANAGER",
  "READ_ONLY",
];

export const MEMBERSHIP_STATUSES: ClubMembershipStatus[] = [
  "ACTIVE",
  "INVITED",
  "PENDING",
  "SUSPENDED",
];

/** Matches the backend buckets (`common/last-active.ts`); all UTC. */
export type ActivityFilter = "today" | "7d" | "30d" | "inactive_90d" | "never";

export const ACTIVITY_FILTER_LABEL: Record<ActivityFilter, string> = {
  today: "Active today",
  "7d": "Active in last 7 days",
  "30d": "Active in last 30 days",
  inactive_90d: "Inactive 90+ days",
  never: "Never active",
};

export type UserSortField = "createdAt" | "lastActiveAt" | "name";

export type UserClubRole = {
  role: ClubRole;
  clubId: string;
  clubName: string;
};

export type UserRow = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  accountStatus: AccountStatus;
  verificationStatus: UserVerificationStatus;
  onboardingStep: string;
  createdAt: string;
  /** null = no activity ever recorded (not back-filled for older users). */
  lastActiveAt: string | null;
  categories: UserCategory[];
  coachListingSuspended: boolean;
  clubRoles: UserClubRole[];
};

export type UserListResponse = {
  total: number;
  take: number;
  skip: number;
  counts: {
    active: number;
    suspended: number;
    deleted: number;
    players: number;
    coaches: number;
    clubStaff: number;
    activeToday: number;
    neverActive: number;
    unverified: number;
  };
  users: UserRow[];
};

export type UserGoal = {
  id: string;
  skill: string;
  focus: string | null;
  baseline: number;
  target: number;
  deadline: string | null;
  achievedAt: string | null;
};

export type UserMembership = {
  role: ClubRole;
  status: ClubMembershipStatus;
  joinedAt: string;
  clubId: string;
  clubName: string;
};

export type UserDetail = {
  id: string;
  email: string | null;
  phone: string | null;
  phoneOnWhatsApp: boolean;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  photoUrl: string | null;
  accountStatus: AccountStatus;
  verificationStatus: UserVerificationStatus;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  onboardingStep: string;
  onboardingCompletedAt: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  categories: UserCategory[];
  tennisProfile: {
    singlesRating: number | null;
    doublesRating: number | null;
    dominantHand: string | null;
    generalLocation: string | null;
    preferredClubName: string | null;
  } | null;
  padelProfile: {
    singlesRating: number | null;
    doublesRating: number | null;
  } | null;
  goals: UserGoal[];
  coachProfile: {
    id: string;
    yearsExperience: number | null;
    qualifications: string[];
    specialisations: string[];
    levels: string[];
    verificationStatus: string;
    listingSuspendedAt: string | null;
    listingSuspendedReason: string | null;
    affiliations: Array<{ id: string; name: string }>;
  } | null;
  clubMemberships: UserMembership[];
  subscription: {
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    plan: {
      code: string;
      name: string;
      interval: string;
      priceMinor: number;
      currency: string;
    };
  } | null;
  security: {
    hasPassword: boolean;
    socialProviders: string[];
    emailVerified: boolean;
    phoneVerified: boolean;
    activeSessions: number;
    registeredDevices: number;
    lastActiveAt: string | null;
  };
  stats: {
    matches: number;
    reportsReceived: number;
    connections: number;
    activeSessions: number;
  };
};

export type UserMatch = {
  id: string;
  sport: string;
  format: string;
  state: string;
  playedAt: string;
  side: string;
  participation: string;
  result: { status: string; outcome: string; winningSide: string | null } | null;
  opponents: Array<{ id: string; name: string; side: string }>;
};

export type UserAuditEvent = {
  id: string;
  action: string;
  reason: string | null;
  metadata: unknown;
  createdAt: string;
  /** In the tamper-evident hash chain (older rows predate it). */
  chained: boolean;
  actor: { id: string; name: string | null; email: string };
};

export const MIN_REASON_LENGTH = 10;

export function displayName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Unnamed account"
  );
}

export function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

/**
 * "Never" is shown as such: a null `lastActiveAt` means nothing was recorded,
 * which is not the same as "a long time ago", and older accounts are not
 * back-filled with invented history.
 */
export function formatLastActive(value: string | null): string {
  if (!value) return "Never recorded";
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return "Within the last hour";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

const ACTION_LABELS: Record<string, string> = {
  "user.suspend": "Suspended account",
  "user.reactivate": "Reactivated account",
  "user.restore": "Reactivated account",
  "user.delete_request": "Requested deletion",
  "user.restore_deleted": "Restored deleted account",
  "user.revoke_sessions": "Revoked sessions",
  "user.password_reset_sent": "Sent password reset",
  "user.verification_change": "Changed verification",
  "user.profile_update": "Edited profile",
  "user.club_membership_add": "Added club membership",
  "user.club_membership_change": "Changed club membership",
  "user.club_membership_remove": "Removed club membership",
  "user.coach_listing_suspend": "Suspended coach listing",
  "user.coach_listing_reinstate": "Reinstated coach listing",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replaceAll(/[._]/g, " ");
}

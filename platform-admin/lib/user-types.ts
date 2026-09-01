import type { ClubRole } from "./organization-types";

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type UserVerificationStatus =
  | "UNVERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "RESTRICTED";

/**
 * Overlapping tags, not a partition — a club owner who plays and coaches
 * carries all three. Derived server-side from which profile relations exist
 * (`User` has no role column), so the rules stay in one place.
 */
export type UserCategory = "PLAYER" | "COACH" | "CLUB_STAFF";

export const USER_CATEGORY_LABEL: Record<UserCategory, string> = {
  PLAYER: "Player",
  COACH: "Coach",
  CLUB_STAFF: "Club staff",
};

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
  categories: UserCategory[];
  clubRoles: UserClubRole[];
};

export type UserListResponse = {
  total: number;
  counts: {
    active: number;
    suspended: number;
    deleted: number;
    players: number;
    coaches: number;
    clubStaff: number;
  };
  users: UserRow[];
};

export type UserDetail = {
  id: string;
  email: string | null;
  phone: string | null;
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
  categories: UserCategory[];
  tennisProfile: {
    singlesRating: number | null;
    doublesRating: number | null;
    dominantHand: string | null;
  } | null;
  padelProfile: {
    singlesRating: number | null;
    doublesRating: number | null;
  } | null;
  coachProfile: {
    id: string;
    yearsExperience: number | null;
    qualifications: string[];
    specialisations: string[];
    levels: string[];
    verificationStatus: string;
    affiliations: Array<{ id: string; name: string }>;
  } | null;
  clubMemberships: Array<{
    role: ClubRole;
    joinedAt: string;
    clubId: string;
    clubName: string;
  }>;
  stats: {
    matches: number;
    reportsReceived: number;
    connections: number;
    activeSessions: number;
  };
};

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

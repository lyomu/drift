export type ClubPlatformStatus = "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED";
export type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED";
export type ClubRole =
  | "OWNER"
  | "ADMIN"
  | "COMPETITION_MANAGER"
  | "COACH"
  | "CONTENT_MANAGER"
  | "READ_ONLY";
export type ClubMembershipStatus = "INVITED" | "PENDING" | "ACTIVE" | "SUSPENDED";

export type ClubCreationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ClubCreationRequest = {
  id: string;
  clubName: string;
  location: string;
  requesterName: string;
  requesterEmail: string;
  status: ClubCreationRequestStatus;
  decisionNote: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  createdClubId: string | null;
  createdAt: string;
};
export type BillingSubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELLED";

export type BillingPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  audience: "PLAYER" | "CLUB";
  priceMinor: number;
  currency: string;
  interval: "MONTHLY" | "YEARLY";
  entitlements: string[];
  isTest: boolean;
};

export type BillingSubscription = {
  id: string;
  status: BillingSubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  plan: BillingPlan;
};

export type BillingInvoice = {
  id: string;
  number: string;
  amountMinor: number;
  currency: string;
  status: "OPEN" | "PAID" | "FAILED" | "VOID";
  description: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  createdAt: string;
  plan: { id: string; name: string };
  transaction: {
    status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
    provider: string;
    providerReference: string;
    failureReason: string | null;
    paymentMethodLabel: string;
  } | null;
};

export type BillingTransaction = {
  id: string;
  amountMinor: number;
  currency: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  provider: string;
  providerReference: string;
  failureReason: string | null;
  createdAt: string;
  plan: string;
  paymentMethodLabel: string;
};

export type OrganizationBilling = {
  subscription: BillingSubscription | null;
  invoices: BillingInvoice[];
  transactions: BillingTransaction[];
  totalsByCurrency: {
    currency: string;
    paidMinor: number;
    failedMinor: number;
    invoiceCount: number;
  }[];
};

export type OrganizationSummary = {
  id: string;
  name: string;
  address: string | null;
  verificationStatus: VerificationStatus;
  platformStatus: ClubPlatformStatus;
  platformStatusReason: string | null;
  platformSuspendedAt: string | null;
  updatedAt: string;
  counts: {
    courts: number;
    members: number;
    coaches: number;
    moderationReports: number;
    pendingAdminApprovals: number;
  };
  subscription: BillingSubscription | null;
};

export type OrganizationDetail = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  amenities: string[];
  openingHoursNote: string | null;
  photoUrls: string[];
  verificationStatus: VerificationStatus;
  platformStatus: ClubPlatformStatus;
  platformStatusReason: string | null;
  platformSuspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts: {
    courts: number;
    members: number;
    coaches: number;
    leagues: number;
    tournaments: number;
    ladders: number;
    events: number;
    posts: number;
    moderationReports: number;
  };
  moderationByStatus: Record<string, number>;
  courts: { id: string; name: string; address: string | null; verificationStatus: VerificationStatus }[];
  memberships: {
    membershipId: string;
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: ClubRole;
    status: ClubMembershipStatus;
    createdAt: string;
  }[];
  billing: OrganizationBilling;
};

export type AdminApproval = {
  membershipId: string;
  role: "OWNER" | "ADMIN";
  status: ClubMembershipStatus;
  createdAt: string;
  club: {
    id: string;
    name: string;
    platformStatus: ClubPlatformStatus;
    verificationStatus: VerificationStatus;
  };
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

export type EscalatedModerationReport = {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REMOVED" | "ESCALATED";
  createdAt: string;
  club: { id: string; name: string; platformStatus: ClubPlatformStatus };
  post: {
    id: string;
    body: string;
    deletedAt: string | null;
    createdAt: string;
    author: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
  };
  reporter: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
};

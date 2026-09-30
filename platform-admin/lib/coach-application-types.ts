export type CoachApplicationStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED";

export type CoachLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "COMPETITIVE";

export type CoachApplicationSummary = {
  id: string;
  status: CoachApplicationStatus;
  userId: string;
  accountEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  yearsExperience: number | null;
  specialisations: string[];
  levels: CoachLevel[];
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

/** One row per state change, append-only — the decision trail for an audit. */
export type CoachApplicationEvent = {
  id: string;
  previousStatus: CoachApplicationStatus | null;
  nextStatus: CoachApplicationStatus;
  note: string | null;
  actorUserId: string | null;
  actorAdminId: string | null;
  createdAt: string;
};

export type CoachApplicationDetail = CoachApplicationSummary & {
  bio: string | null;
  qualifications: string[];
  availabilityNote: string | null;
  publicContact: {
    email: string | null;
    phone: string | null;
    bookingUrl: string | null;
  };
  decisionReason: string | null;
  reviewedById: string | null;
  accountStatus: string;
  onboardingStep: string;
  history: CoachApplicationEvent[];
};

export type CoachApplicationDecision =
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CHANGES";

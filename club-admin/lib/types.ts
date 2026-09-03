export type ClubRole =
  | "OWNER"
  | "ADMIN"
  | "COMPETITION_MANAGER"
  | "COACH"
  | "CONTENT_MANAGER"
  | "READ_ONLY";

export type ClubMembershipStatus =
  | "INVITED"
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED";

export type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED";

export type CoachLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "COMPETITIVE";

export type LeagueState = "DRAFT" | "PUBLISHED" | "CANCELLED";

export type MatchSport = "TENNIS" | "PADEL";
export type MatchFormat = "SINGLES" | "DOUBLES";

export type LeagueRegistrationStatus = "ENROLLED" | "WAITLISTED" | "WITHDRAWN";

export type CompetitionState =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "SCHEDULED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export type AnnouncementStatus = "DRAFT" | "PUBLISHED";
export type AnnouncementAudience = "EVERYONE" | "MEMBERS" | "COACHES" | "ADMINS";

export type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";

export type CourtSurface = "HARD" | "CLAY" | "GRASS" | "ARTIFICIAL_GRASS";
export type CourtBookingType =
  | "UNKNOWN"
  | "CONTACT_ONLY"
  | "EXTERNAL_LINK"
  | "NATIVE_PARTNER";

export type Membership = {
  clubId: string;
  clubName: string;
  role: ClubRole;
  setupComplete: boolean;
};

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

export type ClubProfile = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  sports: MatchSport[];
  amenities: string[];
  openingHoursNote: string | null;
  photoUrls: string[];
  verificationStatus: VerificationStatus;
};

export type Member = {
  membershipId: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: ClubRole;
  status: ClubMembershipStatus;
  joinedAt: string;
};

// A league is a single competition run since M15 — registration window,
// round count, standings and the derived competition state all live here.
export type LeagueSummary = {
  id: string;
  clubId: string | null;
  sport: MatchSport;
  name: string;
  description: string | null;
  rulesText: string | null;
  scoringFormat: string | null;
  walkoverRule: string | null;
  unfinishedMatchPolicy: string | null;
  format: MatchFormat;
  state: LeagueState;
  competitionState: CompetitionState;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  startsAt: string | null;
  roundCount: number | null;
  roundIntervalMinutes: number;
  capacity: number | null;
  enrolledCount: number;
  completedAt: string | null;
  cancelledAt: string | null;
  viewerRegistrationStatus: LeagueRegistrationStatus | null;
};

export type PlayerSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
} | null;

export type MatchResult = {
  status: string;
  outcome: string;
  winningSide: "A" | "B" | null;
  submittedById: string | null;
  disputedById: string | null;
  disputantWinningSide: "A" | "B" | null;
};

export type MatchDto = {
  id: string;
  state: string;
  result: MatchResult | null;
  [key: string]: unknown;
};

export type Fixture = {
  id: string;
  sideA: PlayerSummary;
  sideB: PlayerSummary;
  isBye: boolean;
  match: MatchDto | null;
};

export type RoundDto = {
  id: string;
  leagueId: string;
  index: number;
  deadline: string;
  openedAt: string | null;
  closedAt: string | null;
  fixtures: Fixture[];
};

export type StandingRow = {
  userId: string;
  displayName: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  previousRank: number | null;
};

export type Dispute = {
  fixtureId: string;
  leagueId: string;
  sideA: PlayerSummary;
  sideB: PlayerSummary;
  match: MatchDto | null;
};

export type CourtGroup = {
  id?: string;
  sport?: MatchSport;
  surface: CourtSurface;
  indoor: boolean;
  lighting: boolean;
  count: number;
};

export type CourtSummary = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  surfaces: unknown;
  indoorAvailable: boolean;
  outdoorAvailable: boolean;
  verificationStatus: VerificationStatus;
  bookingType: CourtBookingType;
  clubId: string | null;
  clubName: string | null;
};

export type CourtProfile = CourtSummary & {
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  bookingUrl: string | null;
  amenities: string[];
  openingHoursNote: string | null;
  isPublic: boolean | null;
  photoUrls: string[];
  courtGroups: CourtGroup[];
};

export type Announcement = {
  id: string;
  clubId: string;
  authorId: string;
  title: string;
  body: string;
  pinned: boolean;
  status: AnnouncementStatus;
  audience: AnnouncementAudience;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CourtReport = {
  id: string;
  courtId: string;
  courtName: string;
  reason: string;
  notes: string | null;
  status: ReportStatus;
  createdAt: string;
};

export type ClubEvent = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  _count?: { registrations: number };
  registrations?: EventRegistration[];
};

export type EventRegistration = {
  id: string;
  status: "REGISTERED" | "CANCELLED" | "ATTENDED" | "NO_SHOW";
  registeredAt: string;
  user: { id: string; firstName: string | null; lastName: string | null; email: string | null };
};

export type LadderAdmin = {
  id: string;
  name: string;
  sport: MatchSport;
  challengeRange: number;
  state: "ACTIVE" | "ARCHIVED";
  createdAt?: string;
  _count?: { entries: number };
  entries?: { id: string; position: number; wins: number; losses: number; user: { id: string; firstName: string | null; lastName: string | null } }[];
};

export type MediaAsset = { id: string; filename: string; mimeType: string; caption: string | null; createdAt: string };

export type ModerationReport = {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REMOVED" | "ESCALATED";
  createdAt: string;
  post: { id: string; body: string; createdAt: string; author: { firstName: string | null; lastName: string | null } | null };
  reporter: { firstName: string | null; lastName: string | null };
};

export type CoachClub = {
  id: string;
  name: string;
};

export type CoachAdmin = {
  id: string;
  userId: string;
  accountEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  bio: string | null;
  qualifications: string[];
  yearsExperience: number | null;
  specialisations: string[];
  levels: CoachLevel[];
  availabilityNote: string | null;
  verificationStatus: VerificationStatus;
  clubs: CoachClub[];
  publicContact: {
    email: string | null;
    phone: string | null;
    bookingUrl: string | null;
  };
};

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

export type BillingPaymentMethod = {
  id: string;
  type: "CARD" | "MOBILE_MONEY";
  provider: string;
  brand: string | null;
  last4: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
};

export type BillingSubscription = {
  id: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED";
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

export type ClubBilling = {
  subscription: BillingSubscription;
  paymentMethods: BillingPaymentMethod[];
  plans: BillingPlan[];
  invoices: BillingInvoice[];
  sandbox: boolean;
  /** The provider collects payment itself; we never hold card details. */
  hostedCheckout?: boolean;
};

/** Returned by a plan change when the payer has to finish at the provider. */
export type BillingCheckout = {
  url: string;
  invoiceNumber: string;
  provider: string;
};

export type ChangeSubscriptionResult = ClubBilling & {
  checkout?: BillingCheckout;
};

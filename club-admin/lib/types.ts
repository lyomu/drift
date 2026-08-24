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

export type LeagueState = "DRAFT" | "PUBLISHED" | "CANCELLED";

export type MatchSport = "TENNIS" | "PADEL";
export type MatchFormat = "SINGLES" | "DOUBLES";

export type SeasonRegistrationStatus = "ENROLLED" | "WAITLISTED" | "WITHDRAWN";

export type AnnouncementStatus = "DRAFT" | "PUBLISHED";

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

export type LeagueSummary = {
  id: string;
  sport: MatchSport;
  name: string;
  description: string | null;
  rulesText: string | null;
  format: MatchFormat;
  seasons: { id: string; label: string }[];
};

export type SeasonDetail = {
  id: string;
  leagueId: string;
  leagueName: string;
  label: string;
  state: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  startsAt: string;
  roundCount: number;
  enrolledCount: number;
  capacity: number | null;
  viewerRegistrationStatus: SeasonRegistrationStatus | null;
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
  seasonId: string;
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
  seasonId: string;
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

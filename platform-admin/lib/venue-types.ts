export type VenueCourtGroup = {
  id?: string;
  sport: "TENNIS" | "PADEL";
  surface: "HARD" | "CLAY" | "GRASS" | "ARTIFICIAL_GRASS";
  indoor: boolean;
  lighting: boolean;
  count: number;
};

export type Venue = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  clubId: string | null;
  club: { id: string; name: string; verificationStatus: string } | null;
  phone: string | null;
  website: string | null;
  bookingType: "UNKNOWN" | "CONTACT_ONLY" | "EXTERNAL_LINK" | "NATIVE_PARTNER";
  bookingUrl: string | null;
  amenities: string[];
  openingHoursNote: string | null;
  isPublic: boolean | null;
  photoUrls: string[];
  googlePlacesRef: string | null;
  googlePlacesSyncStatus: "SYNCED" | "STALE" | "FAILED";
  googlePlacesSyncedAt: string | null;
  googlePlacesSyncError: string | null;
  placesSyncStatus: "SYNCED" | "STALE" | "FAILED";
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED";
  courtGroups: VenueCourtGroup[];
  createdAt: string;
  updatedAt: string;
  _count: { matches: number; reports: number; inquiries: number };
};

export type ClubOption = {
  id: string;
  name: string;
  verificationStatus: string;
};

export type VenueFormValue = {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  clubId: string | null;
  phone: string | null;
  website: string | null;
  bookingType: Venue["bookingType"];
  bookingUrl: string | null;
  amenities: string[];
  openingHoursNote: string | null;
  isPublic: boolean | null;
  photoUrls: string[];
  googlePlacesRef: string | null;
  verificationStatus: Venue["verificationStatus"];
  courtGroups: Omit<VenueCourtGroup, "id">[];
};

export type PlacesSyncReport = {
  integration: {
    configured: boolean;
    latestSuccess: string | null;
    counts: { synced: number; stale: number; failed: number };
  };
  venues: {
    id: string;
    name: string;
    address: string | null;
    googlePlacesRef: string | null;
    googlePlacesSyncStatus: string;
    googlePlacesSyncedAt: string | null;
    googlePlacesSyncError: string | null;
    syncStatus: "SYNCED" | "STALE" | "FAILED";
  }[];
};

export type VenueVerificationRequest = {
  id: string;
  status: "PENDING" | "MORE_INFO" | "APPROVED" | "REJECTED";
  submissionNote: string | null;
  decisionNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  club: {
    id: string;
    name: string;
    description: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    website: string | null;
    verificationStatus: string;
    _count: { courts: number; memberships: number };
  };
  submittedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  reviewedBy: { id: string; name: string | null; email: string } | null;
};

export type DuplicateVenue = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  club: { id: string; name: string; verificationStatus: string } | null;
  googlePlacesRef: string | null;
  verificationStatus: string;
  courtGroups: VenueCourtGroup[];
  counts: { matches: number; reports: number; inquiries: number };
};

export type DuplicateCandidate = {
  pairKey: string;
  confidence: number;
  reasons: string[];
  first: DuplicateVenue;
  second: DuplicateVenue;
};

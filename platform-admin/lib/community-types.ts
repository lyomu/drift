export type CommunityStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type CommunityType = "SOCIAL" | "TRAINING" | "LADDER" | "CLUB";

export interface CommunityPerson {
  id: string;
  displayName: string;
  email?: string | null;
}

export interface CommunitySummary {
  id: string;
  type: CommunityType;
  name: string;
  city: string;
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "OTHER";
  about: string | null;
  photoUrl: string | null;
  joinPolicy: "OPEN" | "BY_REQUEST";
  status: CommunityStatus;
  decisionNote: string | null;
  clubId: string | null;
  clubName: string | null;
  memberCount: number;
  isDemo: boolean;
  reviewedAt: string | null;
  createdAt: string;
  openReportCount?: number;
  createdBy: CommunityPerson;
}

export interface CommunityMember {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  level: number | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "REQUESTED" | "ACTIVE";
  since: string;
}

export interface CommunityReportRow {
  id: string;
  reason: string;
  notes: string | null;
  status: string;
  priority: string;
  createdAt: string;
  reporter: CommunityPerson;
}

export interface CommunityAuditRow {
  id: string;
  action: string;
  targetUserId: string | null;
  details: unknown;
  createdAt: string;
  actor: CommunityPerson | null;
}

export interface CommunityDetail {
  community: CommunitySummary;
  members: CommunityMember[];
  requests: CommunityMember[];
  reports: CommunityReportRow[];
  auditLog: CommunityAuditRow[];
}

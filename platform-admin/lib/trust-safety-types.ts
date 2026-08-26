export type TrustSafetyPriority = "NORMAL" | "HIGH" | "URGENT";
export type QueueState = "PENDING" | "ACTIONED" | "DISMISSED";
export type ReportType = "PLAYER" | "MESSAGE" | "COURT" | "CLUB_POST";
export type AbuseCaseStatus = "OPEN" | "CLOSED";

export type TrustSafetyPerson = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string;
  accountStatus?: string;
} | null;

export type ReportedContentItem = {
  id: string;
  type: ReportType;
  reason: string;
  notes: string | null;
  sourceStatus: string;
  state: QueueState;
  priority: TrustSafetyPriority;
  createdAt: string;
  reporter: NonNullable<TrustSafetyPerson>;
  subject: TrustSafetyPerson;
  preview: string;
  locationLabel: string | null;
  canOpenCase: boolean;
};

export type ReportedContentResponse = {
  items: ReportedContentItem[];
  counts: {
    pending: number;
    actioned: number;
    dismissed: number;
    urgent: number;
    high: number;
  };
};

export type AbuseCaseNote = {
  id: string;
  action: string;
  body: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { id: string; email: string; name: string | null };
};

export type AbuseCaseSummary = {
  id: string;
  status: AbuseCaseStatus;
  priority: TrustSafetyPriority;
  summary: string;
  subjectUser: NonNullable<TrustSafetyPerson>;
  openedBy: { id: string; email: string; name: string | null };
  closedBy: { id: string; email: string; name: string | null } | null;
  closedAt: string | null;
  closeReason: string | null;
  createdAt: string;
  updatedAt: string;
  notes: AbuseCaseNote[];
  evidenceCounts: {
    playerReports: number;
    messageReports: number;
    clubPostReports: number;
    blocksReceived: number;
    suspensions: number;
  };
};

export type AbuseCaseEvidence = {
  playerReports: Array<{ id: string; reason: string; status: string; priority: TrustSafetyPriority; notes: string | null; reporter: NonNullable<TrustSafetyPerson>; createdAt: string }>;
  messageReports: Array<{ id: string; reason: string; status: string; priority: TrustSafetyPriority; notes: string | null; preview: string; reporter: NonNullable<TrustSafetyPerson>; createdAt: string }>;
  clubPostReports: Array<{ id: string; reason: string; status: string; priority: TrustSafetyPriority; preview: string; club: { id: string; name: string }; reporter: NonNullable<TrustSafetyPerson>; createdAt: string }>;
  blocks: Array<{ id: string; blocker: NonNullable<TrustSafetyPerson>; createdAt: string }>;
  statusActions: Array<{ id: string; action: string; createdAt: string; metadata: unknown; actor: { id: string; email: string; name: string | null } }>;
};

export type AbuseCasesResponse = {
  cases: AbuseCaseSummary[];
  counts: { open: number; closed: number; urgent: number };
};

export type AbuseCaseDetailResponse = {
  case: AbuseCaseSummary;
  evidence: AbuseCaseEvidence;
};

export function label(value: string) {
  return value.replaceAll("_", " ");
}

export function dateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "n/a";
}

export function priorityTone(priority: TrustSafetyPriority): "neutral" | "success" | "warning" | "error" | "info" {
  if (priority === "URGENT") return "error";
  if (priority === "HIGH") return "warning";
  return "neutral";
}

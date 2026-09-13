export type WaitlistAudience = "PLAYER" | "CLUB";

export type WaitlistSignupRow = {
  id: string;
  email: string;
  firstName: string | null;
  audience: WaitlistAudience;
  country: string | null;
  city: string | null;
  level: string | null;
  source: string | null;
  createdAt: string;
  lastEmailedAt: string | null;
};

export type WaitlistStats = {
  /** Rows matching the current filters (capped list included). */
  filtered: number;
  /** Whole-list counters, independent of the current filters. */
  total: number;
  players: number;
  clubs: number;
  last7Days: number;
  /** Addresses no broadcast has reached yet — the launch-email queue. */
  notEmailedYet: number;
  latestSignupAt: string | null;
};

export type WaitlistOverview = {
  signups: WaitlistSignupRow[];
  stats: WaitlistStats;
};

export type WaitlistBroadcastRow = {
  id: string;
  subject: string;
  body: string;
  /** null = the send covered the whole list. */
  audience: WaitlistAudience | null;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  sentBy: { id: string; email: string; name: string | null };
  createdAt: string;
};

export function waitlistPersonName(row: WaitlistSignupRow) {
  return row.firstName?.trim() || "—";
}

export function audienceLabel(audience: WaitlistAudience | null) {
  if (!audience) return "Whole list";
  return audience === "PLAYER" ? "Players" : "Clubs";
}

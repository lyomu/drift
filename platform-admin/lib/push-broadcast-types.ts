export type PushBroadcastCountry = {
  countryCode: string;
  countryName: string;
};

export type PushBroadcastRow = {
  id: string;
  title: string;
  body: string;
  /** ISO-3166-1 alpha-2; null = the send covered every country. */
  country: string | null;
  recipientCount: number;
  deliveredCount: number;
  skippedCount: number;
  sentBy: { id: string; email: string; name: string | null };
  createdAt: string;
};

export type PushBroadcastOverview = {
  broadcasts: PushBroadcastRow[];
  countries: PushBroadcastCountry[];
};

export function countryLabel(
  code: string | null,
  countries: PushBroadcastCountry[],
) {
  if (!code) return "All countries";
  return countries.find((c) => c.countryCode === code)?.countryName ?? code;
}

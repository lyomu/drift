/** A daily tennis fact as returned by `/platform-admin/tennis-facts`. */
export type TennisFactRow = {
  id: string;
  titleEn: string;
  titleFr: string;
  titleEs: string;
  bodyEn: string;
  bodyFr: string;
  bodyEs: string;
  sourceEn: string | null;
  sourceFr: string | null;
  sourceEs: string | null;
  active: boolean;
  sortOrder: number;
  /** Server-relative; resolve with `mediaUrl`. */
  imageUrl: string | null;
  /** True for the fact the app shows today. */
  isToday: boolean;
  createdAt: string;
  updatedAt: string;
};

export const FACT_LANGUAGES = [
  { code: "En", label: "English" },
  { code: "Fr", label: "French" },
  { code: "Es", label: "Spanish" },
] as const;

export type FactLanguageCode = (typeof FACT_LANGUAGES)[number]["code"];

/** Column limits — keep in sync with `TennisFactInputDto`. */
export const FACT_LIMITS = { title: 60, body: 280, source: 80 } as const;

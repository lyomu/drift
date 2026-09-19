import { DM_Sans } from "next/font/google";

/**
 * DM Sans is the single family for this surface — display, headings, body
 * and UI — mirroring the 2026-09 mobile typography decision
 * (mobile/lib/core/theme/drift_typography.dart). Shared by both root
 * layouts (the localised site and the English-only legal pages).
 */
export const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

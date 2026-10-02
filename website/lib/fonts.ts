import { DM_Serif_Display, Outfit } from "next/font/google";

/** Shared Outfit font for every public-site surface. */
export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

/** Accent face used by the Figma-led app CTA section. */
export const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-dm-serif",
  display: "swap",
});

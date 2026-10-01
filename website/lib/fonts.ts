import { Outfit } from "next/font/google";

/** Shared Outfit font for every public-site surface. */
export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

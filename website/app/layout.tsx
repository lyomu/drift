import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

/**
 * DM Sans is the single family for this surface — display, headings, body
 * and UI — mirroring the 2026-09 mobile typography decision
 * (mobile/lib/core/theme/drift_typography.dart).
 */
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Drift Tennis · Find your match. Play your season.",
  description:
    "Drift Tennis turns “I should play more tennis” into an actual match, an actual improvement plan, and an actual community: opponents at your level, verified results, real leagues, and a rating you can trust. Tennis leads and padel runs on the same rails. Free to join while we get going.",
  keywords: [
    "tennis",
    "padel",
    "tennis app",
    "tennis leagues",
    "find tennis players",
    "tennis Kenya",
  ],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1c91d0",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

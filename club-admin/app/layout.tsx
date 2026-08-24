import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClubProvider } from "@/lib/club-context";

const outfit = localFont({
  src: "./fonts/Outfit-Variable.ttf",
  variable: "--font-outfit",
  weight: "400 700",
  display: "swap",
});

// Display fallback until the Sharp Sans Display licence is purchased —
// see foundation/05-design-system.md §3 and mobile's pubspec.yaml.
const displayFace = localFont({
  src: "./fonts/SpaceGrotesk-Variable.ttf",
  variable: "--font-display-face",
  weight: "600 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Drift Club Admin",
  description: "Manage your club, leagues, courts, and members on Drift.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${displayFace.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">
        <ClubProvider>{children}</ClubProvider>
      </body>
    </html>
  );
}

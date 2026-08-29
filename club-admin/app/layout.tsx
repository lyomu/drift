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

// Display fallback until the Sharp Sans Display licence is purchased.
// See foundation/05-design-system.md section 3 and mobile's pubspec.yaml.
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-body">
        <ClubProvider>{children}</ClubProvider>
      </body>
    </html>
  );
}

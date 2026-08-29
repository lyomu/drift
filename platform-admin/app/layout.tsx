import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const outfit = localFont({
  src: "./fonts/Outfit-Variable.ttf",
  variable: "--font-outfit",
  weight: "400 700",
  display: "swap",
});

const displayFace = localFont({
  src: "./fonts/SpaceGrotesk-Variable.ttf",
  variable: "--font-display-face",
  weight: "600 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Drift Platform Admin",
  description: "Platform governance for Drift Tennis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${displayFace.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">{children}</body>
    </html>
  );
}

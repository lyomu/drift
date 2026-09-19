import type { Metadata, Viewport } from "next";

import { dmSans } from "@/lib/fonts";
import { baseMetadata } from "@/lib/seo";

import "../globals.css";

/**
 * Root layout for the legal documents (`/terms`, `/privacy-policy`,
 * `/data-privacy`). They are authoritative in English only and sit outside
 * the `[locale]` segment, so they get their own `<html lang="en">`.
 */
export const metadata: Metadata = baseMetadata;

export const viewport: Viewport = {
  themeColor: "#1c91d0",
};

export default function LegalRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

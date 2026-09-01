import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

// Lexend ships as a variable font, so every weight the UI uses (regular
// through extrabold) comes from a single file instead of discrete cuts.
const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Drift Platform Admin",
  description: "Platform governance for Drift Tennis.",
};

// Set the saved theme before first paint so a light-mode user on a dark OS
// (or vice-versa) never sees a flash of the wrong palette.
const themeScript = `try{var t=localStorage.getItem("drift-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${lexend.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-body">{children}</body>
    </html>
  );
}

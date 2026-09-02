import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClubProvider } from "@/lib/club-context";

const dmSans = localFont({
  src: "./fonts/DMSans-Variable.ttf",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});

const outfit = localFont({
  src: "./fonts/Outfit-Variable.ttf",
  variable: "--font-outfit",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Drift Club Admin",
  description: "Manage your club, leagues, courts, and members on Drift.",
};

// Set the saved theme before first paint so a light-mode user on a dark OS
// (or vice-versa) never sees a flash of the wrong palette.
const themeScript = `try{var t=localStorage.getItem("drift-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${outfit.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClubProvider } from "@/lib/club-context";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { cookies, headers } from "next/headers";
import { I18nProvider } from "@/lib/i18n/i18n-context";
import { ToastProvider } from "@/components/Toast";
import { isLocale, LOCALE_COOKIE, localeFromAcceptLanguage } from "@/lib/i18n/locales";
import { en } from "@/lib/i18n/messages/en";
import { fr } from "@/lib/i18n/messages/fr";
import { es } from "@/lib/i18n/messages/es";

const outfit = localFont({
  src: "./fonts/Outfit-Variable.ttf",
  variable: "--font-outfit",
  weight: "100 900",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved)
    ? saved
    : localeFromAcceptLanguage((await headers()).get("accept-language"));
  const messages = { en, fr, es }[locale];
  return {
    title: messages["a.metaTitle"],
    description: messages["a.metaDescription"],
  };
}

// Set the saved theme before first paint so a light-mode user on a dark OS
// (or vice-versa) never sees a flash of the wrong palette.
const themeScript = `try{var t=localStorage.getItem("drift-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The saved choice wins; a first visit follows the browser language. Read
  // here rather than on the client so the first paint is already translated.
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved)
    ? saved
    : localeFromAcceptLanguage((await headers()).get("accept-language"));

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${outfit.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,100..700,0..1,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-body">
        <I18nProvider initialLocale={locale}>
          <WorkspaceProvider>
            <ClubProvider>
              <ToastProvider>{children}</ToastProvider>
            </ClubProvider>
          </WorkspaceProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

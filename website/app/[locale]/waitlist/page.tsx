import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WaitlistForm } from "@/components/waitlist-form";
import { getDictionary } from "@/lib/content";
import { outfit } from "@/lib/fonts";
import { isLocale } from "@/lib/locales";
import { localizedMetadata } from "@/lib/seo";
import { apexUrl, WAITLIST_URL } from "@/lib/site";

import styles from "./waitlist-page.module.css";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return localizedMetadata(locale, {
    path: "/waitlist",
    origin: WAITLIST_URL,
    title: t.header.joinCta,
    description: t.waitlist.metaDescription,
  });
}

export default async function WaitlistPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  return (
    <main className={`${styles.waitlist} ${outfit.className}`}>
      <div className={styles.canvas}>
        <Link className={styles.brand} href={apexUrl(locale, "/")} aria-label="Drift home">DRIFT</Link>
        <nav className={styles.navigation} aria-label="Waitlist navigation">
          <Link className={styles.backLink} href={apexUrl(locale, "/")}>← BACK TO DRIFT</Link>
          <span className={styles.accessPill}>EARLY ACCESS</span>
        </nav>

        <section className={styles.copy} aria-labelledby="waitlist-title">
          <p className={styles.eyebrow}>PLAY MORE. BELONG MORE.</p>
          <h1 id="waitlist-title">Your next rally is waiting.</h1>
          <p className={styles.description}>Drift helps you find compatible players, join real seasons, and keep your tennis life moving forward.</p>
          <WaitlistForm t={t.waitlist} />
          <p className={styles.footnote}>A better way to play tennis starts with one honest match.</p>
        </section>

        <aside className={styles.photoPanel} aria-label="Drift tennis community">
          <div className={styles.photoOverlay} />
          <div className={styles.photoCopy}>
            <p>DRIFT / 01</p>
            <h2>Find your level. Find your people.</h2>
            <span>One app for the players, clubs, practice, and seasons that make your game yours.</span>
          </div>
        </aside>
      </div>
    </main>
  );
}

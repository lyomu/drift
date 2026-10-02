import Link from "next/link";

import { legalLinks } from "@/lib/content";

import styles from "./legal-layout.module.css";

type LegalSection = { id: string; title: string };

type LegalLayoutProps = {
  title: string;
  summary: string;
  sections: LegalSection[];
  children: React.ReactNode;
};

/** The legal routes share a branded long-form reading surface. */
export function LegalLayout({ title, summary, sections, children }: LegalLayoutProps) {
  return (
    <div className={styles.legalSurface}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Drift home">
          <span className={styles.brandBall} aria-hidden="true" />
          <span>DRIFT</span>
        </Link>
        <nav className={styles.nav} aria-label="Primary navigation">
          <Link href="/#play">FOR PLAYERS</Link>
          <Link href="/#clubs">FOR CLUBS</Link>
          <Link href="/#training">FOR COACHES</Link>
        </nav>
        {/* The CTA is labelled GET THE APP, so it goes to the landing page's
            download section (`#download`), not the waitlist form. Same
            convention as the `/#play`, `/#clubs` section links above. */}
        <Link className={styles.appLink} href="/#download">
          GET THE APP <Arrow />
        </Link>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroImage} aria-hidden="true" />
          <div className={styles.heroShade} aria-hidden="true" />
          <div className={`${styles.inner} ${styles.heroContent}`}>
            <p className={styles.kicker}>DRIFT TENNIS LEGAL</p>
            <h1>{title}</h1>
            <p>{summary}</p>
            <span>Effective 8 September 2026 | Version 1.0</span>
          </div>
        </section>

        <div className={`${styles.inner} ${styles.contentGrid}`}>
          <aside className={styles.contents}>
            <p>ON THIS PAGE</p>
            <nav aria-label={`${title} contents`}>
              <ol>
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="legal-copy min-w-0">{children}</article>
        </div>

        <section className={styles.supportBand}>
          <div className={styles.inner}>
            <p>Questions about your information?</p>
            <p>
              Email <a href="mailto:drift@einsbrand.com">drift@einsbrand.com</a>. You can also read our <Link href="/privacy-policy">Privacy Policy</Link> and <Link href="/data-privacy">Data Privacy Notice</Link>.
            </p>
          </div>
        </section>
      </main>

      <footer className={styles.footer} id="footer">
        <div className={`${styles.inner} ${styles.footerGrid}`}>
          <div>
            <strong>DRIFT</strong>
            <p>Find your next rally.</p>
          </div>
          <nav aria-label="Legal">
            <b>LEGAL</b>
            {legalLinks.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div>
            <b>CONTACT</b>
            <a href="mailto:serve@driftsports.app">serve@driftsports.app</a>
          </div>
        </div>
        <p className={`${styles.inner} ${styles.copyright}`}>© 2026 Drift Sports. Built for the next point.</p>
      </footer>
    </div>
  );
}

function Arrow() {
  return (
    <svg aria-hidden="true" className={styles.arrow} viewBox="0 0 16 16" fill="none">
      <path d="M3 13 13 3M6 3h7v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

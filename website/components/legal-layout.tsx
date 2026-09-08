import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type LegalSection = { id: string; title: string };

type LegalLayoutProps = {
  title: string;
  summary: string;
  sections: LegalSection[];
  children: React.ReactNode;
};

/** The legal routes share a quiet, long-form reading surface. */
export function LegalLayout({ title, summary, sections, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <SiteHeader minimal />
      <main>
        <section className="bg-[var(--color-primary-dark)] text-white" data-on-primary>
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <p className="text-sm font-semibold text-white/80">Drift Tennis legal</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-balance sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-2xl leading-relaxed text-white/90">{summary}</p>
            <p className="mt-7 text-sm text-white/75">Effective 8 September 2026 · Version 1.0</p>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[12rem_minmax(0,46rem)] lg:gap-16 lg:py-16">
          <aside className="lg:sticky lg:top-8 lg:h-fit">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">On this page</p>
            <nav aria-label={`${title} contents`} className="mt-3">
              <ol className="space-y-2 border-l border-[var(--color-border)] pl-4 text-sm">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary-dark)]" href={`#${section.id}`}>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
          <article className="legal-copy min-w-0">{children}</article>
        </div>

        <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <p className="font-semibold">Questions about your information?</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Email <a href="mailto:drift@einsbrand.com">drift@einsbrand.com</a>. You can also read our <Link href="/privacy-policy">Privacy Policy</Link> and <Link href="/data-privacy">Data Privacy Notice</Link>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

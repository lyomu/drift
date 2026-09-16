/**
 * Footer links are absolute where they must survive other routes: the legal
 * links point at the English-only legal documents, so they stay
 * route-prefixed (`/terms`), while the product links carry the locale prefix
 * so they resolve back into the right language from any page.
 */
import Link from "next/link";

import { getDictionary, legalLinks } from "@/lib/content";
import { localeHref, type Locale } from "@/lib/locales";

export function SiteFooter({ locale = "en" }: { locale?: Locale }) {
  const t = getDictionary(locale);

  const productLinks = [
    { href: localeHref(locale, "/#discover"), label: t.footer.theLoop },
    { href: localeHref(locale, "/#clubs"), label: t.footer.forClubs },
    { href: localeHref(locale, "/waitlist"), label: t.footer.join, featured: true },
  ] as const;

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1.15fr_1.2fr]">
          <div>
            <p className="font-bold">Drift Tennis</p>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {t.footer.tagline}
            </p>
          </div>

          <FooterGroup title={t.footer.product} ariaLabel={t.footer.productAria}>
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link
                  className={
                    "featured" in link
                      ? "font-semibold text-[var(--color-primary-dark)]"
                      : "hover:text-[var(--color-primary-dark)]"
                  }
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </FooterGroup>

          <FooterGroup title={t.footer.legal} ariaLabel={t.footer.legalAria}>
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  className="hover:text-[var(--color-primary-dark)]"
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </FooterGroup>

          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t.footer.contact}
            </p>
            <a
              className="mt-3 inline-block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary-dark)]"
              href="mailto:drift@einsbrand.com"
            >
              drift@einsbrand.com
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--color-border)] pt-6">
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t.footer.copyright.replace("{year}", String(new Date().getFullYear()))}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({
  title,
  ariaLabel,
  children,
}: {
  title: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <nav aria-label={ariaLabel}>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        {title}
      </p>
      <ul className="mt-3 grid gap-2 text-sm text-[var(--color-text-secondary)]">
        {children}
      </ul>
    </nav>
  );
}

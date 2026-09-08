/**
 * Footer links are absolute (`/#clubs`, not `#clubs`) so they still resolve
 * from the waitlist and legal routes, where those sections do not exist.
 */
import Link from "next/link";

import { footer, legalLinks } from "@/lib/content";

const productLinks = [
  { href: "/#discover", label: "The loop" },
  { href: "/#clubs", label: "For clubs" },
  { href: "/waitlist", label: "Join the waitlist", featured: true },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1.15fr_1.2fr]">
          <div>
            <p className="font-bold">Drift Tennis</p>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Find your match. Play your season.
            </p>
          </div>

          <FooterGroup title="Product" ariaLabel="Footer product links">
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

          <FooterGroup title="Legal" ariaLabel="Footer legal links">
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
              Contact
            </p>
            <a
              className="mt-3 inline-block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary-dark)]"
              href={`mailto:${footer.supportEmail}`}
            >
              {footer.supportEmail}
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--color-border)] pt-6">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Copyright {new Date().getFullYear()} Drift Tennis. Proprietary.
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

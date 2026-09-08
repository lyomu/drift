/**
 * Footer links are absolute (`/#clubs`, not `#clubs`) so they still resolve
 * from the waitlist route, where those sections do not exist.
 */
import Link from "next/link";

import { footer } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-bold">Drift Tennis</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Find your match. Play your season.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--color-text-secondary)]">
            <li>
              <Link
                className="hover:text-[var(--color-primary-dark)]"
                href="/#discover"
              >
                The loop
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-[var(--color-primary-dark)]"
                href="/#clubs"
              >
                For clubs
              </Link>
            </li>
            <li>
              <Link
                className="font-semibold text-[var(--color-primary-dark)]"
                href="/waitlist"
              >
                Join the waitlist
              </Link>
            </li>
            <li>
              <Link className="hover:text-[var(--color-primary-dark)]" href="/terms">
                Terms
              </Link>
            </li>
            <li>
              <Link className="hover:text-[var(--color-primary-dark)]" href="/privacy-policy">
                Privacy
              </Link>
            </li>
            <li>
              <Link className="hover:text-[var(--color-primary-dark)]" href="/data-privacy">
                Data privacy
              </Link>
            </li>
            <li>
              <a
                className="hover:text-[var(--color-primary-dark)]"
                href={`mailto:${footer.supportEmail}`}
              >
                {footer.supportEmail}
              </a>
            </li>
          </ul>
        </nav>

        <p className="text-xs text-[var(--color-text-secondary)]">
          © {new Date().getFullYear()} Drift Tennis · Proprietary
        </p>
      </div>
    </footer>
  );
}

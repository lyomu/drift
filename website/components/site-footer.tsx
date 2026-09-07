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
              <a className="hover:text-[var(--color-primary-dark)]" href="#round-1">
                The loop
              </a>
            </li>
            <li>
              <a className="hover:text-[var(--color-primary-dark)]" href="#clubs">
                For clubs
              </a>
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

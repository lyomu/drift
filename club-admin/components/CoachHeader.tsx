"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/dashboard-design";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useWorkspace } from "@/lib/workspace-context";

/**
 * The coach shell's top bar. Deliberately not `SiteHeader`: that one points at
 * /settings, /team, /audit and /notifications, which are club routes a coach
 * has no access to — reusing it would have filled the header with dead links.
 *
 * It also carries the small-screen nav, because `CoachSidebar` is desktop-only
 * and four destinations do not justify a drawer.
 */
const NAV = [
  { href: "/coach", label: "Overview", exact: true },
  { href: "/coach/application", label: "Application" },
  { href: "/coach/profile", label: "Profile" },
  { href: "/coach/clubs", label: "Clubs" },
];

export function CoachHeader() {
  const pathname = usePathname();
  const { logout } = useWorkspace();

  return (
    <header className="sticky top-0 z-30 flex shrink-0 flex-col border-b border-drift-border bg-drift-surface">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-8">
        <Link
          href="/coach"
          className="min-w-0 truncate text-sm font-bold text-drift-text-primary transition-colors hover:text-drift-primary"
        >
          Drift
        </Link>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-semibold text-drift-text-secondary transition-colors hover:bg-drift-primary-light hover:text-drift-text-primary"
          >
            <MaterialIcon name="logout" className="text-[18px]" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-drift-border px-2 pb-2 pt-1.5 sm:hidden">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                active
                  ? "bg-drift-primary-light font-bold text-drift-primary-dark"
                  : "font-semibold text-drift-text-secondary"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

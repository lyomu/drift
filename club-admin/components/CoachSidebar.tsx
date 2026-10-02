"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/dashboard-design";
import { APPLICATION_COPY } from "@/lib/coach-api";
import { useWorkspace } from "@/lib/workspace-context";

/**
 * Flat by design. The club sidebar groups a large console; a coach has four
 * destinations, and collapsing them into accordions would hide the whole nav
 * behind a click.
 */
const NAV = [
  { href: "/coach", label: "Overview", icon: "home", exact: true },
  { href: "/coach/application", label: "Application", icon: "assignment" },
  { href: "/coach/profile", label: "Public profile", icon: "badge" },
  { href: "/coach/clubs", label: "Clubs", icon: "groups" },
];

export function CoachSidebar() {
  const pathname = usePathname();
  const { coach, memberships, hasBoth, logout } = useWorkspace();
  const status = coach?.applicationStatus ?? null;

  return (
    <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-drift-border bg-drift-surface px-4 py-6 sm:flex">
      <div className="flex flex-col px-2 pb-5">
        <Image
          src="/images/drift-icon.png"
          alt="Drift"
          width={192}
          height={178}
          className="h-6 w-auto"
        />
        <div className="mt-2.5 truncate text-sm font-bold text-drift-text-primary">
          Coach workspace
        </div>
        {status && (
          <div className="mt-1 inline-flex self-start rounded-full bg-drift-primary-light px-[9px] py-0.5 text-[11px] font-bold uppercase text-drift-primary-dark">
            {APPLICATION_COPY[status].label}
          </div>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`navitem flex items-center gap-2.5 rounded-md px-2.5 py-[9px] text-sm transition-colors ${
                active
                  ? "bg-drift-primary-light font-bold text-drift-primary-dark"
                  : "font-semibold text-drift-text-secondary"
              }`}
            >
              <MaterialIcon
                name={item.icon}
                filled={active}
                className="text-xl"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Only shown to someone who genuinely holds both -- a head coach who
          also administers their club. Everyone else never learns the other
          workspace exists. */}
      {hasBoth && (
        <Link
          href="/"
          className="navitem mt-4 flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-[9px] text-sm font-semibold text-drift-text-secondary transition-colors"
        >
          <MaterialIcon name="swap_horiz" className="text-xl" />
          <span className="truncate">
            {memberships[0]?.clubName ?? "Club admin"}
          </span>
        </Link>
      )}

      <button
        type="button"
        onClick={logout}
        className="navitem mt-1 flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-[9px] text-left text-sm font-semibold text-drift-text-secondary transition-colors"
      >
        <MaterialIcon name="logout" className="text-xl" />
        <span>Log out</span>
      </button>
    </aside>
  );
}

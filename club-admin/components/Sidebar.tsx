"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClub } from "@/lib/club-context";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/members", label: "Members" },
  { href: "/leagues", label: "Leagues" },
  { href: "/disputes", label: "Disputes" },
  { href: "/courts", label: "Courts" },
  { href: "/announcements", label: "Announcements" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Club Settings" },
];

export function Sidebar({
  clubName,
  role,
}: {
  clubName: string | null;
  role: string | null;
}) {
  const pathname = usePathname();
  const { logout } = useClub();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-drift-border bg-drift-surface px-4 py-6 sm:flex">
      <div className="mb-8 px-2">
        <div className="font-display text-lg font-bold text-drift-text-primary">
          Drift
        </div>
        <div className="mt-1 truncate text-sm font-semibold text-drift-text-primary">
          {clubName ?? "—"}
        </div>
        {role && (
          <div className="text-xs text-drift-text-secondary">
            {role.replace(/_/g, " ")}
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-drift-primary-light text-drift-primary-dark"
                  : "text-drift-text-secondary hover:bg-drift-primary-light/60 hover:text-drift-text-primary"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={logout}
        className="mt-4 rounded-md px-3 py-2 text-left text-sm font-medium text-drift-text-secondary hover:bg-drift-primary-light/60 hover:text-drift-text-primary"
      >
        Log out
      </button>
    </aside>
  );
}

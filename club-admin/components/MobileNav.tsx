"use client";

import { useRouter, usePathname } from "next/navigation";
import { useClub } from "@/lib/club-context";

const NAV: { href: string; label: string; ownerOnly?: boolean; roles?: string[] }[] = [
  { href: "/", label: "Overview" },
  { href: "/members", label: "Members" },
  { href: "/coaches", label: "Coaches" },
  { href: "/leagues", label: "Leagues" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/ladders", label: "Ladders" },
  { href: "/seasons/archive", label: "Season Archive" },
  { href: "/events", label: "Events" },
  { href: "/disputes", label: "Disputes" },
  { href: "/courts", label: "Courts" },
  { href: "/announcements", label: "Announcements" },
  { href: "/media", label: "Media Library", roles: ["OWNER", "ADMIN", "CONTENT_MANAGER"] },
  { href: "/moderation", label: "Moderation", roles: ["OWNER", "ADMIN", "CONTENT_MANAGER"] },
  { href: "/reports", label: "Reports" },
  { href: "/team", label: "Team Roles", roles: ["OWNER", "ADMIN"] },
  { href: "/notifications", label: "Notifications", roles: ["OWNER", "ADMIN"] },
  { href: "/audit", label: "Audit Log", roles: ["OWNER", "ADMIN"] },
  { href: "/settings", label: "Club Settings" },
  { href: "/billing", label: "Billing", ownerOnly: true },
];

/** Doc 5 §5.4: genuine responsive layout down to tablet, not a stretched
 * mobile layout — below the persistent Sidebar's breakpoint, navigation
 * collapses into this select instead of hiding entirely. */
export function MobileNav({ clubName }: { clubName: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, role } = useClub();

  return (
    <div className="flex items-center justify-between gap-3 border-b border-drift-border bg-drift-surface px-4 py-3 sm:hidden">
      <div className="min-w-0">
        <div className="font-display text-sm font-bold text-drift-text-primary">
          Drift
        </div>
        <div className="truncate text-xs text-drift-text-secondary">
          {clubName ?? "—"}
        </div>
      </div>
      <select
        value={pathname}
        onChange={(e) => router.push(e.target.value)}
        className="rounded-md border border-drift-border bg-drift-surface px-2 py-1.5 text-sm text-drift-text-primary"
      >
        {NAV.filter((item) => (!item.ownerOnly || role === "OWNER") && (!item.roles || (role ? item.roles.includes(role) : false))).map((item) => (
          <option key={item.href} value={item.href}>
            {item.label}
          </option>
        ))}
      </select>
      <button
        onClick={logout}
        className="text-xs font-semibold text-drift-text-secondary"
      >
        Log out
      </button>
    </div>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
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
  { href: "/announcements", label: "Announcements" },
  { href: "/media", label: "Media Library", roles: ["OWNER", "ADMIN", "CONTENT_MANAGER"] },
  { href: "/moderation", label: "Moderation", roles: ["OWNER", "ADMIN", "CONTENT_MANAGER"] },
  { href: "/courts", label: "Courts" },
  { href: "/disputes", label: "Disputes" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Club Settings" },
  { href: "/team", label: "Team Roles", roles: ["OWNER", "ADMIN"] },
  { href: "/notifications", label: "Notifications", roles: ["OWNER", "ADMIN"] },
  { href: "/audit", label: "Audit Log", roles: ["OWNER", "ADMIN"] },
  { href: "/billing", label: "Billing", ownerOnly: true },
];

export function MobileNav({ clubName }: { clubName: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, role } = useClub();
  const visible = NAV.filter(
    (item) =>
      (!item.ownerOnly || role === "OWNER") &&
      (!item.roles || (role ? item.roles.includes(role) : false)),
  );
  const value = visible.some((item) => item.href === pathname) ? pathname : "/";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-drift-border bg-drift-surface px-4 py-3 sm:hidden">
      <div className="min-w-0">
        <div className="font-display text-sm font-extrabold tracking-[-0.2px] text-drift-text-primary">
          Drift
        </div>
        <div className="truncate text-xs font-medium text-drift-text-secondary">
          {clubName ?? "-"}
        </div>
      </div>
      <select
        value={value}
        onChange={(event) => router.push(event.target.value)}
        className="min-w-0 rounded-lg border border-drift-border bg-drift-surface px-2 py-1.5 text-sm font-semibold text-drift-text-primary"
      >
        {visible.map((item) => (
          <option key={item.href} value={item.href}>
            {item.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={logout}
        className="shrink-0 text-xs font-bold text-drift-text-secondary"
      >
        Log out
      </button>
    </div>
  );
}

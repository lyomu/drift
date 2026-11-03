"use client";

import { usePathname, useRouter } from "next/navigation";
import { useClub } from "@/lib/club-context";
import { BrandIcon } from "@/components/BrandIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n/i18n-context";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const NAV: { href: string; label: MessageKey; ownerOnly?: boolean; roles?: string[] }[] = [
  { href: "/", label: "nav.overview" },
  { href: "/members", label: "nav.members" },
  { href: "/coaches", label: "nav.coaches" },
  { href: "/leagues", label: "nav.leagues" },
  { href: "/tournaments", label: "nav.tournaments" },
  { href: "/ladders", label: "nav.ladders" },
  { href: "/leagues/archive", label: "nav.leagueArchive" },
  { href: "/events", label: "nav.events" },
  { href: "/announcements", label: "nav.announcements" },
  { href: "/media", label: "nav.media", roles: ["OWNER", "ADMIN", "CONTENT_MANAGER"] },
  { href: "/moderation", label: "nav.moderation", roles: ["OWNER", "ADMIN", "CONTENT_MANAGER"] },
  { href: "/courts", label: "nav.courts" },
  { href: "/disputes", label: "nav.disputes" },
  { href: "/reports", label: "nav.reports" },
  { href: "/settings", label: "nav.clubSettings" },
  { href: "/team", label: "nav.teamRoles", roles: ["OWNER", "ADMIN"] },
  { href: "/notifications", label: "nav.notifications", roles: ["OWNER", "ADMIN"] },
  { href: "/audit", label: "nav.auditLog", roles: ["OWNER", "ADMIN"] },
  { href: "/billing", label: "nav.billing", ownerOnly: true },
];

export function MobileNav({ clubName }: { clubName: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, role } = useClub();
  const t = useT();
  const visible = NAV.filter(
    (item) =>
      (!item.ownerOnly || role === "OWNER") &&
      (!item.roles || (role ? item.roles.includes(role) : false)),
  );
  const value = visible.some((item) => item.href === pathname) ? pathname : "/";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-drift-border bg-drift-surface px-4 py-3 sm:hidden">
      <div className="min-w-0">
        <BrandIcon className="h-5" />
        <div className="truncate text-xs font-medium text-drift-text-secondary">
          {clubName ?? "-"}
        </div>
      </div>
      <select
        value={value}
        onChange={(event) => router.push(event.target.value)}
        className="min-w-0 rounded-md border border-drift-border bg-drift-surface px-2 py-1.5 text-sm font-semibold text-drift-text-primary"
      >
        {visible.map((item) => (
          <option key={item.href} value={item.href}>
            {t(item.label)}
          </option>
        ))}
      </select>
      <LanguageSwitcher className="h-9 w-9" />
      <ThemeToggle className="h-9 w-9" />
      <button
        type="button"
        onClick={logout}
        className="shrink-0 text-xs font-bold text-drift-text-secondary"
      >
        {t("common.logOut")}
      </button>
    </div>
  );
}

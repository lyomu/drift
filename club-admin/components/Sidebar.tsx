"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClub } from "@/lib/club-context";
import { BrandIcon } from "@/components/BrandIcon";
import { MaterialIcon } from "@/components/dashboard-design";
import { useT } from "@/lib/i18n/i18n-context";
import type { MessageKey } from "@/lib/i18n/messages/en";

const NAV_GROUPS: {
  key: string;
  label: MessageKey;
  icon: string;
  items: { href: string; label: MessageKey; ownerOnly?: boolean; roles?: string[] }[];
}[] = [
  {
    key: "members",
    label: "nav.members",
    icon: "groups",
    items: [
      { href: "/members", label: "nav.members" },
      { href: "/coaches", label: "nav.coaches" },
    ],
  },
  {
    key: "competitions",
    label: "nav.competitions",
    icon: "emoji_events",
    items: [
      { href: "/leagues", label: "nav.leagues" },
      { href: "/tournaments", label: "nav.tournaments" },
      { href: "/ladders", label: "nav.ladders" },
      { href: "/leagues/archive", label: "nav.leagueArchive" },
    ],
  },
  {
    key: "community",
    label: "nav.community",
    icon: "campaign",
    items: [
      { href: "/community", label: "nav.clubCommunity" },
      { href: "/events", label: "nav.events" },
      { href: "/announcements", label: "nav.announcements" },
      {
        href: "/media",
        label: "nav.media",
        roles: ["OWNER", "ADMIN", "CONTENT_MANAGER"],
      },
      {
        href: "/moderation",
        label: "nav.moderation",
        roles: ["OWNER", "ADMIN", "CONTENT_MANAGER"],
      },
    ],
  },
  {
    key: "operations",
    label: "nav.operations",
    icon: "sports_tennis",
    items: [
      { href: "/courts", label: "nav.courts" },
      { href: "/disputes", label: "nav.disputes" },
      { href: "/reports", label: "nav.reports" },
    ],
  },
  {
    key: "settings",
    label: "nav.settings",
    icon: "settings",
    items: [
      { href: "/settings", label: "nav.clubSettings" },
      { href: "/team", label: "nav.teamRoles", roles: ["OWNER", "ADMIN"] },
      { href: "/notifications", label: "nav.notifications", roles: ["OWNER", "ADMIN"] },
      { href: "/audit", label: "nav.auditLog", roles: ["OWNER", "ADMIN"] },
      { href: "/billing", label: "nav.billing", ownerOnly: true },
    ],
  },
];

export function Sidebar({
  clubName,
  role,
}: {
  clubName: string | null;
  role: string | null;
}) {
  const pathname = usePathname();
  const t = useT();
  const { logout } = useClub();
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      NAV_GROUPS.map((group) => [
        group.key,
        group.items.some((item) => pathname.startsWith(item.href)),
      ]),
    ),
  );

  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((group) =>
      group.items.some((item) => pathname.startsWith(item.href)),
    );
    if (activeGroup) {
      setExpanded((prev) => ({ ...prev, [activeGroup.key]: true }));
    }
  }, [pathname]);

  const canSee = (item: { ownerOnly?: boolean; roles?: string[] }) =>
    (!item.ownerOnly || role === "OWNER") &&
    (!item.roles || (role ? item.roles.includes(role) : false));

  return (
    <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-drift-border bg-drift-surface px-4 py-6 sm:flex">
      <div className="flex flex-col px-2 pb-5">
        <BrandIcon className="h-6" />
        <div className="mt-2.5 truncate text-sm font-bold text-drift-text-primary">
          {clubName ?? "-"}
        </div>
        {role && (
          <div className="mt-1 inline-flex self-start rounded-full bg-drift-primary-light px-[9px] py-0.5 text-[11px] font-bold uppercase text-drift-primary-dark">
            {role.replace(/_/g, " ")}
          </div>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
        <Link
          href="/"
          className={`navitem flex items-center gap-2.5 rounded-md px-2.5 py-[9px] text-sm transition-colors ${
            pathname === "/"
              ? "bg-drift-primary-light font-bold text-drift-primary-dark"
              : "font-semibold text-drift-text-secondary"
          }`}
        >
          <MaterialIcon name="home" filled={pathname === "/"} className="text-xl" />
          <span>{t("nav.overview")}</span>
        </Link>

        {NAV_GROUPS.map((group) => {
          const items = group.items.filter(canSee);
          if (items.length === 0) return null;
          return (
            <div key={group.key} className="flex flex-col">
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [group.key]: !prev[group.key],
                  }))
                }
                className="navgroup flex items-center gap-2.5 rounded-md px-2.5 py-[9px] text-left transition-colors"
              >
                <MaterialIcon name={group.icon} className="text-xl text-drift-text-secondary" />
                <span className="flex-1 text-sm font-semibold text-drift-text-primary">
                  {t(group.label)}
                </span>
                <MaterialIcon
                  name="expand_more"
                  className={`text-lg text-drift-text-secondary transition-transform duration-150 ${
                    expanded[group.key] ? "rotate-180" : ""
                  }`}
                />
              </button>
              {expanded[group.key] && (
                <div className="flex flex-col gap-px pb-1 pl-10 pt-0.5">
                  {items.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`navitem rounded-md px-2.5 py-[7px] text-[13.5px] transition-colors ${
                          active
                            ? "bg-drift-primary-light font-bold text-drift-primary-dark"
                            : "font-normal text-drift-text-primary"
                        }`}
                      >
                        {t(item.label)}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={logout}
        className="navitem mt-4 flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-[9px] text-left text-sm font-semibold text-drift-text-secondary transition-colors"
      >
        <MaterialIcon name="logout" className="text-xl" />
        <span>{t("common.logOut")}</span>
      </button>
    </aside>
  );
}

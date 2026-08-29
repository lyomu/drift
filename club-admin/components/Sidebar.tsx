"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClub } from "@/lib/club-context";
import { MaterialIcon } from "@/components/dashboard-design";

const NAV_GROUPS: {
  key: string;
  label: string;
  icon: string;
  items: { href: string; label: string; ownerOnly?: boolean; roles?: string[] }[];
}[] = [
  {
    key: "members",
    label: "Members",
    icon: "groups",
    items: [
      { href: "/members", label: "Members" },
      { href: "/coaches", label: "Coaches" },
    ],
  },
  {
    key: "competitions",
    label: "Competitions",
    icon: "emoji_events",
    items: [
      { href: "/leagues", label: "Leagues" },
      { href: "/tournaments", label: "Tournaments" },
      { href: "/ladders", label: "Ladders" },
      { href: "/seasons/archive", label: "Season Archive" },
    ],
  },
  {
    key: "community",
    label: "Community",
    icon: "campaign",
    items: [
      { href: "/events", label: "Events" },
      { href: "/announcements", label: "Announcements" },
      {
        href: "/media",
        label: "Media Library",
        roles: ["OWNER", "ADMIN", "CONTENT_MANAGER"],
      },
      {
        href: "/moderation",
        label: "Moderation",
        roles: ["OWNER", "ADMIN", "CONTENT_MANAGER"],
      },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    icon: "sports_tennis",
    items: [
      { href: "/courts", label: "Courts" },
      { href: "/disputes", label: "Disputes" },
      { href: "/reports", label: "Reports" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings",
    items: [
      { href: "/settings", label: "Club Settings" },
      { href: "/team", label: "Team Roles", roles: ["OWNER", "ADMIN"] },
      { href: "/notifications", label: "Notifications", roles: ["OWNER", "ADMIN"] },
      { href: "/audit", label: "Audit Log", roles: ["OWNER", "ADMIN"] },
      { href: "/billing", label: "Billing", ownerOnly: true },
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
    <aside className="hidden w-[264px] shrink-0 flex-col border-r border-drift-border bg-drift-surface px-4 py-6 sm:flex">
      <div className="flex flex-col px-2 pb-5">
        <div className="font-display text-[19px] font-extrabold tracking-[-0.2px] text-drift-text-primary">
          Drift
        </div>
        <div className="mt-2.5 truncate text-sm font-bold text-drift-text-primary">
          {clubName ?? "-"}
        </div>
        {role && (
          <div className="mt-1 inline-flex self-start rounded-full bg-drift-primary-light px-[9px] py-0.5 text-[11px] font-bold uppercase tracking-[0.3px] text-drift-primary-dark">
            {role.replace(/_/g, " ")}
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        <Link
          href="/"
          className={`navitem flex items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-sm transition-colors ${
            pathname === "/"
              ? "bg-drift-primary-light font-bold text-drift-primary-dark"
              : "font-semibold text-drift-text-secondary"
          }`}
        >
          <MaterialIcon name="home" filled={pathname === "/"} className="text-xl" />
          <span>Overview</span>
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
                className="navgroup flex items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-left transition-colors"
              >
                <MaterialIcon name={group.icon} className="text-xl text-drift-text-secondary" />
                <span className="flex-1 text-sm font-semibold text-drift-text-primary">
                  {group.label}
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
                            : "font-semibold text-drift-text-secondary"
                        }`}
                      >
                        {item.label}
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
        className="navitem mt-4 flex items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-left text-sm font-semibold text-drift-text-secondary transition-colors"
      >
        <MaterialIcon name="logout" className="text-xl" />
        <span>Log out</span>
      </button>
    </aside>
  );
}

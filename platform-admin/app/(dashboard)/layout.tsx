"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { InitialsAvatar, MaterialIcon } from "@/components/dashboard-design";
import { Button } from "@/components/ui";
import type { CurrentPlatformAdmin, PlatformPermission } from "@/lib/access-types";
import { api, hasToken, setToken, setTwoFactorChallenge } from "@/lib/api-client";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  permissions: PlatformPermission[];
  exact?: boolean;
};

type NavGroup = {
  label: string;
  icon: string;
  items: NavItem[];
};

const OVERVIEW: NavItem = {
  href: "/",
  label: "Overview",
  icon: "home",
  permissions: ["ANALYTICS_READ"],
  exact: true,
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Access & Control",
    icon: "admin_panel_settings",
    items: [
      { href: "/access/roles", label: "Role Management", icon: "badge", permissions: ["ACCESS_MANAGE"] },
      { href: "/access/team", label: "Team Users", icon: "group", permissions: ["ACCESS_MANAGE"] },
      { href: "/access/permissions", label: "Permission Matrix", icon: "rule_settings", permissions: ["ACCESS_MANAGE"] },
      { href: "/audit-logs", label: "Audit Log", icon: "history", permissions: ["AUDIT_READ"] },
    ],
  },
  {
    label: "Analytics",
    icon: "monitoring",
    items: [
      { href: "/analytics/markets", label: "Markets / Cities", icon: "public", permissions: ["ANALYTICS_READ"] },
      { href: "/analytics/growth", label: "Growth Analytics", icon: "trending_up", permissions: ["ANALYTICS_READ"] },
      { href: "/analytics/revenue", label: "Revenue Dashboard", icon: "payments", permissions: ["ANALYTICS_READ"] },
      { href: "/analytics/system-health", label: "System Health", icon: "health_and_safety", permissions: ["ANALYTICS_READ"] },
    ],
  },
  {
    label: "Venues",
    icon: "stadium",
    items: [
      { href: "/venues", label: "Venue Database", icon: "database", permissions: ["VENUES_MANAGE"], exact: true },
      { href: "/venues/places-sync", label: "Places Sync", icon: "sync", permissions: ["VENUES_MANAGE"] },
      { href: "/venues/verifications", label: "Verifications", icon: "verified", permissions: ["VENUES_MANAGE"] },
      { href: "/venues/duplicates", label: "Duplicate Merge", icon: "merge", permissions: ["VENUES_MANAGE"] },
    ],
  },
  {
    label: "Organizations",
    icon: "corporate_fare",
    items: [
      { href: "/organizations", label: "Club List", icon: "apartment", permissions: ["ORGANIZATIONS_MANAGE"], exact: true },
      { href: "/organizations/approvals", label: "Admin Approvals", icon: "approval", permissions: ["ORGANIZATIONS_MANAGE"] },
      { href: "/organizations/subscriptions", label: "Subscription Status", icon: "workspace_premium", permissions: ["ORGANIZATIONS_MANAGE"] },
      { href: "/organizations/moderation", label: "Community Moderation", icon: "forum", permissions: ["ORGANIZATIONS_MANAGE"] },
    ],
  },
  {
    label: "Competitions",
    icon: "emoji_events",
    items: [
      { href: "/competitions", label: "Global Competitions", icon: "military_tech", permissions: ["COMPETITIONS_MANAGE"], exact: true },
      { href: "/competitions/rulesets", label: "Rulesets", icon: "rule", permissions: ["COMPETITIONS_MANAGE"] },
      { href: "/disputes", label: "Disputes", icon: "gavel", permissions: ["COMPETITIONS_MANAGE"] },
    ],
  },
  {
    label: "Content",
    icon: "school",
    items: [
      { href: "/content", label: "Content Library", icon: "library_books", permissions: ["CONTENT_MANAGE"], exact: true },
      { href: "/content/lessons/new", label: "Create Lesson", icon: "menu_book", permissions: ["CONTENT_MANAGE"] },
      { href: "/content/drills/new", label: "Create Drill", icon: "sports_tennis", permissions: ["CONTENT_MANAGE"] },
      { href: "/content/paths", label: "Learning Paths", icon: "conversion_path", permissions: ["CONTENT_MANAGE"] },
      { href: "/news/sources", label: "News Sources", icon: "rss_feed", permissions: ["CONTENT_MANAGE"] },
      { href: "/news/stories", label: "News Stories", icon: "newspaper", permissions: ["CONTENT_MANAGE"] },
    ],
  },
  {
    label: "Commercial",
    icon: "storefront",
    items: [
      { href: "/commercial/plans", label: "Plans", icon: "sell", permissions: ["COMMERCIAL_MANAGE"] },
      { href: "/commercial/payments", label: "Invoices / Payments", icon: "receipt_long", permissions: ["COMMERCIAL_MANAGE"] },
      { href: "/commercial/promotions", label: "Promotions", icon: "campaign", permissions: ["COMMERCIAL_MANAGE"] },
      { href: "/commercial/sponsors", label: "Sponsors / Ads", icon: "ads_click", permissions: ["COMMERCIAL_MANAGE"] },
    ],
  },
  {
    label: "Trust & Safety",
    icon: "shield",
    items: [
      { href: "/users", label: "Users", icon: "person_search", permissions: ["USERS_MANAGE"] },
      { href: "/reports", label: "Reported Content Queue", icon: "flag", permissions: ["TRUST_SAFETY_MANAGE"] },
      { href: "/abuse-cases", label: "Block / Abuse Cases", icon: "block", permissions: ["TRUST_SAFETY_MANAGE"] },
    ],
  },
  {
    label: "Platform Config",
    icon: "tune",
    items: [
      { href: "/platform/markets", label: "Countries / Cities", icon: "language", permissions: ["PLATFORM_CONFIG_MANAGE"] },
      { href: "/platform/feature-flags", label: "Feature Flags", icon: "toggle_on", permissions: ["PLATFORM_CONFIG_MANAGE"] },
      { href: "/platform/notification-templates", label: "Notification Templates", icon: "notifications", permissions: ["PLATFORM_CONFIG_MANAGE"] },
      { href: "/platform/system-settings", label: "System Settings", icon: "settings", permissions: ["PLATFORM_CONFIG_MANAGE"] },
      { href: "/platform/integrations", label: "API / Integration Settings", icon: "hub", permissions: ["PLATFORM_CONFIG_MANAGE"] },
    ],
  },
  {
    label: "Support",
    icon: "support_agent",
    items: [
      { href: "/support/tickets", label: "Support Tickets", icon: "confirmation_number", permissions: ["SUPPORT_MANAGE"] },
      { href: "/support/privacy-requests", label: "Privacy Requests", icon: "privacy_tip", permissions: ["SUPPORT_MANAGE"] },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/" || item.exact) return pathname === item.href;
  return pathname.startsWith(item.href);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<CurrentPlatformAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    api
      .get<CurrentPlatformAdmin>("/auth/me")
      .then(setAdmin)
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const overviewVisible = useMemo(() => {
    const granted = new Set(admin?.role.permissions ?? []);
    return OVERVIEW.permissions.every((permission) => granted.has(permission));
  }, [admin]);

  const groups = useMemo(() => {
    const granted = new Set(admin?.role.permissions ?? []);
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.permissions.every((permission) => granted.has(permission)),
      ),
    })).filter((group) => group.items.length > 0);
  }, [admin]);

  useEffect(() => {
    setExpanded(
      new Set(
        groups
          .filter((group) => group.items.some((item) => isActive(pathname, item)))
          .map((group) => group.label),
      ),
    );
  }, [groups, pathname]);

  const flatItems = useMemo(
    () => [...(overviewVisible ? [OVERVIEW] : []), ...groups.flatMap((group) => group.items)],
    [groups, overviewVisible],
  );
  const currentHref = flatItems.find((item) => isActive(pathname, item))?.href ?? "";

  function signOut() {
    setToken(null);
    setTwoFactorChallenge(null);
    router.replace("/login");
  }

  function toggleGroup(label: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-drift-background text-sm font-semibold text-drift-text-secondary">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-drift-background">
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-drift-border bg-drift-surface px-4 py-6 lg:flex">
        <div className="px-2">
          <div className="font-display text-[22px] font-bold leading-7 text-drift-primary">Drift</div>
          <div className="mt-1 text-sm font-bold text-drift-text-primary">Platform Admin</div>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-drift-border bg-drift-background p-2">
            <InitialsAvatar label={admin.name || admin.email} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-drift-text-primary">{admin.name || admin.email}</div>
              <div className="truncate text-xs font-semibold text-drift-text-secondary">{admin.role.name}</div>
            </div>
          </div>
        </div>

        <nav className="mt-7 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {overviewVisible && (
            <Link
              href="/"
              className={`navitem flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-bold transition ${
                pathname === "/" ? "bg-drift-primary-light text-drift-primary-dark" : "text-drift-text-secondary"
              }`}
            >
              <MaterialIcon name="home" filled={pathname === "/"} className="text-[20px]" />
              Overview
            </Link>
          )}

          {groups.map((group) => {
            const open = expanded.has(group.label);
            const groupActive = group.items.some((item) => isActive(pathname, item));
            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className={`navgroup flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-bold transition ${
                    groupActive ? "text-drift-primary-dark" : "text-drift-text-secondary"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <MaterialIcon name={group.icon} filled={groupActive} className="text-[20px]" />
                    <span className="truncate">{group.label}</span>
                  </span>
                  <MaterialIcon name="expand_more" className={`text-[19px] transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="mt-1 flex flex-col gap-1 pl-9">
                    {group.items.map((item) => {
                      const active = isActive(pathname, item);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`navitem flex min-h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-bold transition ${
                            active ? "bg-drift-primary-light text-drift-primary-dark" : "text-drift-text-secondary"
                          }`}
                        >
                          <MaterialIcon name={item.icon} filled={active} className="text-[18px]" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <Button variant="ghost" icon="logout" className="mt-5 justify-start" onClick={signOut}>
          Sign out
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-drift-border bg-drift-surface px-4 py-3 lg:hidden">
          <div className="font-display text-lg font-bold text-drift-primary">Drift</div>
          <div className="text-xs font-bold text-drift-text-secondary">Platform Admin / {admin.role.name}</div>
        </div>
        <div className="flex items-center gap-2 border-b border-drift-border bg-drift-surface px-3 py-2 lg:hidden">
          <select
            aria-label="Platform navigation"
            value={currentHref}
            onChange={(event) => router.push(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-drift-border bg-drift-surface px-3 py-2 text-sm font-semibold text-drift-text-primary"
          >
            {overviewVisible && <option value="/">Overview</option>}
            {groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((item) => (
                  <option key={item.href} value={item.href}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            className="actionbtn rounded-lg px-3 py-2 text-xs font-bold text-drift-error"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-[1180px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, hasToken, setToken, setTwoFactorChallenge } from "@/lib/api-client";
import type { CurrentPlatformAdmin, PlatformPermission } from "@/lib/access-types";
import { Button } from "@/components/ui";

type NavItem = {
  href: string;
  label: string;
  permissions: PlatformPermission[];
  exact?: boolean;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Access & Control",
    items: [
      { href: "/access/roles", label: "Role Management", permissions: ["ACCESS_MANAGE"] },
      { href: "/access/team", label: "Team Users", permissions: ["ACCESS_MANAGE"] },
      { href: "/access/permissions", label: "Permission Matrix", permissions: ["ACCESS_MANAGE"] },
      { href: "/audit-logs", label: "Audit Log", permissions: ["AUDIT_READ"] },
    ],
  },
  {
    label: "Overview / Analytics",
    items: [
      { href: "/", label: "Overview", permissions: ["ANALYTICS_READ"] },
      { href: "/analytics/markets", label: "Markets / Cities", permissions: ["ANALYTICS_READ"] },
      { href: "/analytics/growth", label: "Growth Analytics", permissions: ["ANALYTICS_READ"] },
      { href: "/analytics/revenue", label: "Revenue Dashboard", permissions: ["ANALYTICS_READ"] },
      { href: "/analytics/system-health", label: "System Health", permissions: ["ANALYTICS_READ"] },
    ],
  },
  {
    label: "Venues",
    items: [
      { href: "/venues", label: "Venue Database", permissions: ["VENUES_MANAGE"], exact: true },
      { href: "/venues/places-sync", label: "Places Sync", permissions: ["VENUES_MANAGE"] },
      { href: "/venues/verifications", label: "Verifications", permissions: ["VENUES_MANAGE"] },
      { href: "/venues/duplicates", label: "Duplicate Merge", permissions: ["VENUES_MANAGE"] },
    ],
  },
  {
    label: "Organizations",
    items: [
      { href: "/organizations", label: "Club List", permissions: ["ORGANIZATIONS_MANAGE"], exact: true },
      { href: "/organizations/approvals", label: "Admin Approvals", permissions: ["ORGANIZATIONS_MANAGE"] },
      { href: "/organizations/subscriptions", label: "Subscription Status", permissions: ["ORGANIZATIONS_MANAGE"] },
      { href: "/organizations/moderation", label: "Community Moderation", permissions: ["ORGANIZATIONS_MANAGE"] },
    ],
  },
  {
    label: "Competitions",
    items: [
      { href: "/competitions", label: "Global Competitions", permissions: ["COMPETITIONS_MANAGE"], exact: true },
      { href: "/competitions/rulesets", label: "Rulesets", permissions: ["COMPETITIONS_MANAGE"] },
      { href: "/disputes", label: "Disputes", permissions: ["COMPETITIONS_MANAGE"] },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/content", label: "Content Library", permissions: ["CONTENT_MANAGE"], exact: true },
      { href: "/content/lessons/new", label: "Create Lesson", permissions: ["CONTENT_MANAGE"] },
      { href: "/content/drills/new", label: "Create Drill", permissions: ["CONTENT_MANAGE"] },
      { href: "/content/paths", label: "Learning Paths", permissions: ["CONTENT_MANAGE"] },
      { href: "/news/sources", label: "News Sources", permissions: ["CONTENT_MANAGE"] },
      { href: "/news/stories", label: "News Stories", permissions: ["CONTENT_MANAGE"] },
    ],
  },
  {
    label: "Commercial",
    items: [
      { href: "/commercial/plans", label: "Plans", permissions: ["COMMERCIAL_MANAGE"] },
      { href: "/commercial/payments", label: "Invoices / Payments", permissions: ["COMMERCIAL_MANAGE"] },
      { href: "/commercial/promotions", label: "Promotions", permissions: ["COMMERCIAL_MANAGE"] },
      { href: "/commercial/sponsors", label: "Sponsors / Ads", permissions: ["COMMERCIAL_MANAGE"] },
    ],
  },
  {
    label: "Trust & Safety",
    items: [
      { href: "/users", label: "Users", permissions: ["USERS_MANAGE"] },
      { href: "/reports", label: "Reported Content", permissions: ["TRUST_SAFETY_MANAGE"] },
    ],
  },
  {
    label: "Platform config",
    items: [],
  },
  {
    label: "Support",
    items: [],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<CurrentPlatformAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    api.get<CurrentPlatformAdmin>("/auth/me")
      .then(setAdmin)
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const groups = useMemo(() => {
    const granted = new Set(admin?.role.permissions ?? []);
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.permissions.every((permission) => granted.has(permission))),
    })).filter((group) => group.items.length > 0);
  }, [admin]);

  function signOut() {
    setToken(null);
    setTwoFactorChallenge(null);
    router.replace("/login");
  }

  if (loading || !admin) {
    return <div className="flex min-h-screen items-center justify-center bg-drift-background text-sm text-drift-text-secondary">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen bg-drift-background">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-drift-border bg-drift-surface px-4 py-6 sm:flex">
        <div className="mb-7 px-2">
          <div className="font-display text-lg font-bold text-drift-text-primary">Drift</div>
          <div className="mt-1 text-sm font-semibold text-drift-text-secondary">Platform Admin</div>
          <div className="mt-3 text-xs text-drift-text-secondary">
            {admin.name || admin.email} · {admin.role.name}
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-1 px-3 text-xs font-bold text-drift-text-secondary">{group.label}</div>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = item.href === "/" || item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  return <Link key={item.href} href={item.href} className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${active ? "bg-drift-primary-light text-drift-primary-dark" : "text-drift-text-secondary hover:bg-drift-primary-light hover:text-drift-text-primary"}`}>{item.label}</Link>;
                })}
              </div>
            </div>
          ))}
        </nav>
        <Button variant="ghost" className="mt-6 justify-start" onClick={signOut}>Sign out</Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-drift-border bg-drift-surface px-4 py-3 sm:hidden">
          <div className="font-display text-base font-bold text-drift-text-primary">Drift Platform Admin</div>
          <div className="mt-1 text-xs text-drift-text-secondary">{admin.role.name}</div>
        </div>
        <div className="flex items-center gap-2 border-b border-drift-border bg-drift-surface px-3 py-2 sm:hidden">
          <select
            aria-label="Platform navigation"
            value={groups.flatMap((group) => group.items).find((item) => item.href === "/" || item.exact ? pathname === item.href : pathname.startsWith(item.href))?.href ?? ""}
            onChange={(e) => router.push(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-drift-border bg-drift-surface px-2 py-1.5 text-sm text-drift-text-primary"
          >
            {groups.map((group) => <optgroup key={group.label} label={group.label}>{group.items.map((item) => <option key={item.href} value={item.href}>{item.label}</option>)}</optgroup>)}
          </select>
          <button className="rounded-md px-3 py-1.5 text-xs font-semibold text-drift-error" onClick={signOut}>Sign out</button>
        </div>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}

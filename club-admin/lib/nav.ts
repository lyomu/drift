import type { ClubRole } from "@/lib/types";
import type { MessageKey } from "@/lib/i18n/messages/en";

/**
 * The club console's navigation, in one place. The sidebar, the mobile drawer
 * and the header's quick-jump all read this, so a route added (or a role
 * restriction changed) here shows up in all three and cannot drift.
 */
export type NavItem = {
  href: string;
  label: MessageKey;
  icon: string;
  /** Only the club owner sees this item. */
  ownerOnly?: boolean;
  /** Only these roles see this item; omitted means every club role. */
  roles?: ClubRole[];
  /** Match only this exact path (otherwise a prefix match marks it active). */
  exact?: boolean;
};

export type NavGroup = {
  key: string;
  label: MessageKey;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "workspace",
    label: "nav.workspace",
    items: [
      { href: "/", label: "nav.overview", icon: "home", exact: true },
      { href: "/members", label: "nav.members", icon: "groups" },
      { href: "/coaches", label: "nav.coaches", icon: "sports" },
    ],
  },
  {
    key: "competitions",
    label: "nav.competitions",
    items: [
      { href: "/leagues", label: "nav.leagues", icon: "emoji_events", exact: true },
      { href: "/tournaments", label: "nav.tournaments", icon: "account_tree" },
      { href: "/ladders", label: "nav.ladders", icon: "leaderboard" },
      { href: "/leagues/archive", label: "nav.leagueArchive", icon: "inventory_2" },
    ],
  },
  {
    key: "community",
    label: "nav.community",
    items: [
      { href: "/community", label: "nav.clubCommunity", icon: "forum" },
      { href: "/events", label: "nav.events", icon: "event" },
      { href: "/announcements", label: "nav.announcements", icon: "campaign" },
      {
        href: "/media",
        label: "nav.media",
        icon: "photo_library",
        roles: ["OWNER", "ADMIN", "CONTENT_MANAGER"],
      },
      {
        href: "/moderation",
        label: "nav.moderation",
        icon: "flag",
        roles: ["OWNER", "ADMIN", "CONTENT_MANAGER"],
      },
    ],
  },
  {
    key: "operations",
    label: "nav.operations",
    items: [
      { href: "/courts", label: "nav.courts", icon: "sports_tennis" },
      {
        href: "/bookings",
        label: "nav.bookings",
        icon: "event_available",
        roles: ["OWNER", "ADMIN"],
      },
      { href: "/disputes", label: "nav.disputes", icon: "gavel" },
      { href: "/reports", label: "nav.reports", icon: "analytics" },
    ],
  },
  {
    key: "settings",
    label: "nav.settings",
    items: [
      { href: "/settings", label: "nav.clubSettings", icon: "settings" },
      { href: "/team", label: "nav.teamRoles", icon: "badge", roles: ["OWNER", "ADMIN"] },
      {
        href: "/notifications",
        label: "nav.notifications",
        icon: "notifications",
        roles: ["OWNER", "ADMIN"],
      },
      { href: "/audit", label: "nav.auditLog", icon: "history", roles: ["OWNER", "ADMIN"] },
      { href: "/billing", label: "nav.billing", icon: "credit_card", ownerOnly: true },
    ],
  },
];

/** Whether `role` may see `item`; same rules the three nav surfaces always applied. */
export function canSeeNavItem(item: NavItem, role: ClubRole | null): boolean {
  if (item.ownerOnly && role !== "OWNER") return false;
  if (item.roles && !(role && item.roles.includes(role))) return false;
  return true;
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * The item that owns `pathname`. When two items match (`/leagues` and
 * `/leagues/archive`), the longest href wins, so only one is highlighted.
 */
export function activeNavHref(pathname: string): string | null {
  let best: NavItem | null = null;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isNavItemActive(item, pathname) && (!best || item.href.length > best.href.length)) {
        best = item;
      }
    }
  }
  return best?.href ?? null;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClub } from "@/lib/club-context";
import { useAttention, type Attention } from "@/lib/use-attention";
import { displayUserName, useWorkspace } from "@/lib/workspace-context";
import { BrandIcon } from "@/components/BrandIcon";
import { InitialsAvatar, MaterialIcon } from "@/components/dashboard-design";
import { IconButton } from "@/components/ui";
import { NAV_GROUPS, activeNavHref, canSeeNavItem } from "@/lib/nav";
import { useT } from "@/lib/i18n/i18n-context";

/** Which attention count each nav item shows as its badge. */
const BADGE_KEY: Record<string, keyof Attention> = {
  "/members": "pendingJoinRequests",
  "/bookings": "pendingBookings",
  "/disputes": "openDisputes",
  "/moderation": "pendingModeration",
};

export function Sidebar({
  clubName,
  role,
  open,
  onClose,
}: {
  clubName: string | null;
  role: string | null;
  /** Drawer state below 920px; the sidebar is always visible above it. */
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const t = useT();
  const { role: clubRole, logout } = useClub();
  const { user } = useWorkspace();
  const personName = displayUserName(user) ?? clubName ?? "Drift";
  // Real counts of work waiting on this role; refreshed on navigation.
  const attention = useAttention();

  const activeHref = activeNavHref(pathname);
  const roleLabel = role ? role.replace(/_/g, " ") : null;

  return (
    <>
      <button
        type="button"
        aria-label={t("header.closeMenu")}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity min-[920px]:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[258px] flex-col border-r border-drift-border bg-drift-surface-sunken transition-transform duration-200 min-[920px]:sticky min-[920px]:top-0 min-[920px]:z-auto min-[920px]:h-screen min-[920px]:shrink-0 min-[920px]:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[86px] shrink-0 items-center justify-between border-b border-drift-border px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandIcon className="h-[30px] shrink-0" />
            <div className="min-w-0">
              <strong className="block max-w-[150px] truncate text-[13px] font-extrabold text-drift-text-primary">
                {clubName ?? "-"}
              </strong>
              {roleLabel && (
                <span className="mt-[3px] block truncate text-[11px] font-medium capitalize text-drift-text-secondary">
                  {roleLabel.toLowerCase()}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("header.closeMenu")}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-drift-border bg-drift-surface text-drift-text-secondary min-[920px]:hidden"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        <nav
          aria-label={t("header.mainNavigation")}
          className="flex-1 overflow-y-auto px-3.5 py-[23px]"
        >
          {NAV_GROUPS.map((group, groupIndex) => {
            const items = group.items.filter((item) => canSeeNavItem(item, clubRole));
            if (items.length === 0) return null;
            return (
              <div key={group.key} className={groupIndex > 0 ? "mt-[25px]" : ""}>
                <p className="px-3 pb-2 text-[11px] font-bold uppercase text-drift-text-secondary/80">
                  {t(group.label)}
                </p>
                {items.map((item) => {
                  const active = item.href === activeHref;
                  const badgeKey = BADGE_KEY[item.href];
                  const badge = badgeKey && attention ? attention[badgeKey] : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`my-0.5 flex min-h-[43px] items-center gap-[11px] rounded-[10px] px-[11px] py-[5px] text-[13px] font-semibold transition-all active:scale-[0.985] ${
                        active
                          ? "bg-drift-primary-light text-drift-primary-dark"
                          : "text-drift-text-secondary hover:bg-drift-neutral-surface hover:text-drift-primary-dark"
                      }`}
                    >
                      <span
                        className={`flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-drift-surface text-drift-primary shadow-[0_1px_5px_rgb(0_0_0/8%)]"
                            : ""
                        }`}
                      >
                        <MaterialIcon name={item.icon} filled={active} className="text-[20px]" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
                      {badge > 0 && (
                        <span className="min-w-[22px] rounded-[10px] bg-drift-coral-surface px-1.5 py-[3px] text-center text-[11px] font-bold text-drift-coral">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-drift-border p-3.5">
          {clubRole === "OWNER" && (
            <Link
              href="/billing"
              onClick={onClose}
              className="mb-2.5 flex items-center gap-2.5 rounded-xl border border-drift-border bg-drift-surface p-[11px] transition-colors hover:bg-drift-primary-light"
            >
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-drift-lime-surface text-drift-lime">
                <MaterialIcon name="auto_awesome" className="text-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase text-drift-text-secondary">
                  {t("plan.label")}
                </span>
                <strong className="mt-0.5 block truncate text-[12px] font-bold text-drift-text-primary">
                  {t("plan.beta")}
                </strong>
              </span>
              <MaterialIcon name="chevron_right" className="text-[16px] text-drift-text-secondary" />
            </Link>
          )}
          <div className="flex items-center gap-2.5 rounded-[10px] p-[9px]">
            <InitialsAvatar name={personName} shape="round" size={34} />
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-[12px] font-bold text-drift-text-primary">
                {personName}
              </strong>
              {roleLabel && (
                <small className="mt-0.5 block truncate text-[11px] capitalize text-drift-text-secondary">
                  {roleLabel.toLowerCase()}
                </small>
              )}
            </div>
            <IconButton icon="logout" label={t("common.logOut")} onClick={logout} />
          </div>
        </div>
      </aside>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandIcon } from "@/components/BrandIcon";
import { InitialsAvatar, MaterialIcon } from "@/components/dashboard-design";
import { IconButton } from "@/components/ui";
import { APPLICATION_COPY } from "@/lib/coach-api";
import { displayUserName, useWorkspace } from "@/lib/workspace-context";
import { useT } from "@/lib/i18n/i18n-context";
import type { MessageKey } from "@/lib/i18n/messages/en";

/**
 * Flat by design. The club sidebar groups a large console; a coach has four
 * destinations, and collapsing them into accordions would hide the whole nav
 * behind a click. The chrome (258px rail, drawer below 920px) matches the club
 * sidebar so the two workspaces feel like one product.
 */
export const COACH_NAV: {
  href: string;
  label: MessageKey;
  icon: string;
  exact?: boolean;
}[] = [
  { href: "/coach", label: "nav.overview", icon: "home", exact: true },
  { href: "/coach/application", label: "nav.application", icon: "assignment" },
  { href: "/coach/profile", label: "nav.publicProfile", icon: "badge" },
  { href: "/coach/clubs", label: "nav.clubs", icon: "groups" },
];

export function CoachSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const pathname = usePathname();
  const { coach, memberships, hasBoth, logout, user } = useWorkspace();
  const personName = displayUserName(user) ?? t("coach.workspace");
  const status = coach?.applicationStatus ?? null;

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
                {t("coach.workspace")}
              </strong>
              {status && (
                <span className="mt-[3px] block truncate text-[11px] font-medium text-drift-text-secondary">
                  {t(APPLICATION_COPY[status].label)}
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
          {COACH_NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
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
              </Link>
            );
          })}

          {/* Only shown to someone who genuinely holds both -- a head coach who
              also administers their club. Everyone else never learns the other
              workspace exists. */}
          {hasBoth && (
            <Link
              href="/"
              className="my-0.5 mt-[25px] flex min-h-[43px] items-center gap-[11px] rounded-[10px] px-[11px] py-[5px] text-[13px] font-semibold text-drift-text-secondary transition-all hover:bg-drift-neutral-surface hover:text-drift-primary-dark"
            >
              <span className="flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-lg">
                <MaterialIcon name="swap_horiz" className="text-[20px]" />
              </span>
              <span className="min-w-0 flex-1 truncate">
                {memberships[0]?.clubName ?? t("coach.clubAdmin")}
              </span>
            </Link>
          )}
        </nav>

        <div className="shrink-0 border-t border-drift-border p-3.5">
          <div className="flex items-center gap-2.5 rounded-[10px] p-[9px]">
            <InitialsAvatar name={personName} shape="round" size={34} />
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-[12px] font-bold text-drift-text-primary">
                {personName}
              </strong>
              {status && (
                <small className="mt-0.5 block truncate text-[11px] text-drift-text-secondary">
                  {t(APPLICATION_COPY[status].label)}
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

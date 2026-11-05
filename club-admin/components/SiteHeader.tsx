"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useClub } from "@/lib/club-context";
import { displayUserName, useWorkspace } from "@/lib/workspace-context";
import { useAttention } from "@/lib/use-attention";
import { BrandIcon } from "@/components/BrandIcon";
import { HeaderIconButton, InitialsAvatar, MaterialIcon } from "@/components/dashboard-design";
import { NavSearch } from "@/components/NavSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n/i18n-context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/** Where the help button goes: the same support address the sign-in page shows. */
const SUPPORT_HREF = "mailto:support@drift.app";

/**
 * Persistent top bar for the console. Below 920px it carries the menu button
 * that opens the sidebar drawer, in place of the old stacked mobile nav.
 */
export function SiteHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { clubName, role, logout } = useClub();
  const { user } = useWorkspace();
  const attention = useAttention();
  const personName = displayUserName(user) ?? clubName ?? "Drift";
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const canManage = role === "OWNER" || role === "ADMIN";

  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-drift-border bg-drift-surface/90 px-4 backdrop-blur-[16px] sm:px-[34px]">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={t("header.openMenu")}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-drift-border bg-drift-surface text-drift-text-secondary min-[920px]:hidden"
        >
          <MaterialIcon name="menu" className="text-[20px]" />
        </button>
        <BrandIcon className="h-6 shrink-0 min-[920px]:hidden" />
        <div className="hidden min-w-0 sm:block">
          <NavSearch />
        </div>
      </div>

      <div className="flex items-center gap-[7px]">
        <LanguageSwitcher />
        <ThemeToggle />
        <a
          href={SUPPORT_HREF}
          aria-label={t("header.help")}
          title={t("header.help")}
          className="hidden sm:block"
        >
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-drift-border bg-drift-surface text-drift-text-secondary transition-all hover:-translate-y-px hover:bg-drift-surface-sunken hover:text-drift-text-primary">
            <MaterialIcon name="help" className="text-[19px]" />
          </span>
        </a>
        <HeaderIconButton
          icon="notifications"
          href="/notifications"
          dot={(attention?.total ?? 0) > 0}
          label={
            attention && attention.total > 0
              ? t("header.attention", { count: attention.total })
              : t("nav.notifications")
          }
        />

        <div ref={menuRef} className="relative ml-1">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t("header.accountMenu")}
            className="rounded-full shadow-[0_0_0_4px_var(--color-primary-light)] transition-shadow hover:shadow-[0_0_0_4px_var(--color-primary)]"
          >
            <InitialsAvatar name={personName} shape="round" size={37} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[52px] z-40 w-56 overflow-hidden rounded-xl border border-drift-border bg-drift-surface py-1 shadow-[0_16px_40px_rgb(0_0_0/16%)]"
            >
              <div className="px-3.5 py-2">
                <div className="truncate text-[13px] font-bold text-drift-text-primary">
                  {personName}
                </div>
                {user && clubName && (
                  <div className="truncate text-[11px] text-drift-text-secondary">{clubName}</div>
                )}
                {role && (
                  <div className="mt-0.5 text-[11px] font-bold uppercase text-drift-text-secondary">
                    {role.replace(/_/g, " ")}
                  </div>
                )}
              </div>
              <div className="my-1 h-px bg-drift-border" />
              <HeaderMenuLink
                href="/settings"
                icon="settings"
                label={t("header.clubSettings")}
                onNavigate={() => setMenuOpen(false)}
              />
              {canManage && (
                <HeaderMenuLink
                  href="/team"
                  icon="badge"
                  label={t("header.teamRoles")}
                  onNavigate={() => setMenuOpen(false)}
                />
              )}
              <HeaderMenuLink
                href="/notifications"
                icon="notifications"
                label={t("header.notificationSettings")}
                onNavigate={() => setMenuOpen(false)}
              />
              {canManage && (
                <HeaderMenuLink
                  href="/audit"
                  icon="history"
                  label={t("header.auditLog")}
                  onNavigate={() => setMenuOpen(false)}
                />
              )}
              <div className="my-1 h-px bg-drift-border" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold text-drift-text-secondary transition-colors hover:bg-drift-primary-light hover:text-drift-text-primary"
              >
                <MaterialIcon name="logout" className="text-[18px]" />
                {t("common.logOut")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderMenuLink({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-semibold text-drift-text-secondary transition-colors hover:bg-drift-primary-light hover:text-drift-text-primary"
    >
      <MaterialIcon name={icon} className="text-[18px]" />
      {label}
    </Link>
  );
}

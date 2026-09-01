"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { InitialsAvatar, MaterialIcon } from "@/components/dashboard-design";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { CurrentPlatformAdmin, PlatformPermission } from "@/lib/access-types";

/**
 * Persistent top bar for the console — sits above every page's own title.
 * Desktop only; on smaller widths the layout's own compact bar fills the slot.
 */
export function SiteHeader({
  admin,
  onSignOut,
}: {
  admin: CurrentPlatformAdmin;
  onSignOut: () => void;
}) {
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

  const granted = new Set<PlatformPermission>(admin.role.permissions);

  return (
    <header className="sticky top-0 z-30 hidden h-16 shrink-0 items-center justify-between gap-4 border-b border-drift-border bg-drift-surface px-6 lg:flex">
      <Link
        href="/"
        className="text-sm font-bold text-drift-text-primary transition-colors hover:text-drift-primary"
      >
        Platform Admin
      </Link>

      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        {granted.has("AUDIT_READ") && (
          <Link
            href="/audit-logs"
            aria-label="Audit log"
            title="Audit log"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-drift-border bg-drift-background text-drift-text-primary transition-colors hover:border-drift-primary"
          >
            <MaterialIcon name="history" className="text-[19px]" />
          </Link>
        )}
        {granted.has("PLATFORM_CONFIG_MANAGE") && (
          <Link
            href="/settings"
            aria-label="Platform settings"
            title="Platform settings"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-drift-border bg-drift-background text-drift-text-primary transition-colors hover:border-drift-primary"
          >
            <MaterialIcon name="settings" className="text-[19px]" />
          </Link>
        )}

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="flex items-center rounded-md ring-offset-2 ring-offset-drift-surface transition hover:ring-2 hover:ring-drift-primary"
          >
            <InitialsAvatar label={admin.name || admin.email} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-lg border border-drift-border bg-drift-surface py-1 shadow-lg"
            >
              <div className="px-3.5 py-2">
                <div className="truncate text-[13px] font-bold text-drift-text-primary">
                  {admin.name || admin.email}
                </div>
                <div className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.3px] text-drift-text-secondary">
                  {admin.role.name}
                </div>
              </div>
              <div className="my-1 h-px bg-drift-border" />
              {granted.has("ACCESS_MANAGE") && (
                <MenuLink
                  href="/access/team"
                  icon="group"
                  label="Team users"
                  onNavigate={() => setMenuOpen(false)}
                />
              )}
              {granted.has("AUDIT_READ") && (
                <MenuLink
                  href="/audit-logs"
                  icon="history"
                  label="Audit log"
                  onNavigate={() => setMenuOpen(false)}
                />
              )}
              {granted.has("PLATFORM_CONFIG_MANAGE") && (
                <MenuLink
                  href="/settings"
                  icon="tune"
                  label="Platform settings"
                  onNavigate={() => setMenuOpen(false)}
                />
              )}
              <div className="my-1 h-px bg-drift-border" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold text-drift-text-secondary transition-colors hover:bg-drift-primary-light hover:text-drift-text-primary"
              >
                <MaterialIcon name="logout" className="text-[18px]" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuLink({
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

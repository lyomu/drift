"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useClub } from "@/lib/club-context";
import { HeaderIconButton, MaterialIcon } from "@/components/dashboard-design";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Persistent top bar for the console — sits above every page's own title.
 * Desktop only; on mobile `MobileNav` already fills the header slot.
 */
export function SiteHeader() {
  const { clubName, role, logout } = useClub();
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
    <header className="sticky top-0 z-30 hidden h-16 shrink-0 items-center justify-between gap-4 border-b border-drift-border bg-drift-surface px-8 sm:flex">
      <Link
        href="/"
        className="min-w-0 truncate text-sm font-bold text-drift-text-primary transition-colors hover:text-drift-primary"
      >
        {clubName ?? "Drift"}
      </Link>

      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <HeaderIconButton
          icon="notifications"
          href="/notifications"
          label="Notifications"
        />
        <HeaderIconButton
          icon="settings"
          href="/settings"
          label="Club settings"
        />

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-drift-border bg-drift-primary-light text-drift-primary-dark transition-colors hover:border-drift-primary"
          >
            <MaterialIcon name="person" className="text-[20px]" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-12 z-40 w-56 overflow-hidden rounded-lg border border-drift-border bg-drift-surface py-1 shadow-lg"
            >
              <div className="px-3.5 py-2">
                <div className="truncate text-[13px] font-bold text-drift-text-primary">
                  {clubName ?? "Drift"}
                </div>
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
                label="Club settings"
                onNavigate={() => setMenuOpen(false)}
              />
              {canManage && (
                <HeaderMenuLink
                  href="/team"
                  icon="badge"
                  label="Team roles"
                  onNavigate={() => setMenuOpen(false)}
                />
              )}
              <HeaderMenuLink
                href="/notifications"
                icon="notifications"
                label="Notification settings"
                onNavigate={() => setMenuOpen(false)}
              />
              {canManage && (
                <HeaderMenuLink
                  href="/audit"
                  icon="history"
                  label="Audit log"
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
                Log out
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MaterialIcon } from "@/components/dashboard-design";
import { SETTINGS_SECTIONS } from "./sections";

/**
 * Shell shared by every Platform Settings screen: one persistent header and one
 * tab rail, so switching sections only swaps the panel underneath. Each tab is a
 * real route, which keeps deep links and the browser's back button working.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-6 flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-drift-primary-light text-drift-primary">
          <MaterialIcon name="tune" filled />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-bold leading-9 text-drift-text-primary">
            Platform Settings
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-drift-text-secondary">
            Global configuration for the whole Drift platform — markets, rollout,
            messaging copy, and provider connections.
          </p>
        </div>
      </div>

      <nav aria-label="Platform settings sections" className="mb-6 overflow-x-auto pb-1">
        <div className="inline-flex min-w-full gap-1 rounded-xl border border-drift-border bg-drift-surface p-1">
          <SettingsTab href="/settings" icon="grid_view" label="Overview" active={pathname === "/settings"} />
          {SETTINGS_SECTIONS.map((section) => (
            <SettingsTab
              key={section.href}
              href={section.href}
              icon={section.icon}
              label={section.tab}
              active={pathname.startsWith(section.href)}
            />
          ))}
        </div>
      </nav>

      {children}
    </div>
  );
}

function SettingsTab({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-1 ${
        active
          ? "bg-drift-primary text-white"
          : "text-drift-text-secondary hover:bg-drift-primary-light hover:text-drift-text-primary"
      }`}
    >
      <MaterialIcon name={icon} filled={active} className="text-[18px]" />
      {label}
    </Link>
  );
}

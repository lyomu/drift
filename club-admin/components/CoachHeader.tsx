"use client";

import Link from "next/link";
import { BrandIcon } from "@/components/BrandIcon";
import { MaterialIcon } from "@/components/dashboard-design";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useWorkspace } from "@/lib/workspace-context";
import { useT } from "@/lib/i18n/i18n-context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/**
 * The coach shell's top bar. Deliberately not `SiteHeader`: that one points at
 * /settings, /team, /audit and /notifications, which are club routes a coach
 * has no access to — reusing it would have filled the header with dead links.
 *
 * Below 920px it carries the menu button that opens `CoachSidebar`'s drawer.
 */
export function CoachHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const t = useT();
  const { logout } = useWorkspace();

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
        <Link href="/coach" className="flex min-w-0 items-center gap-2.5">
          <BrandIcon className="h-6 shrink-0 min-[920px]:hidden" />
          <span className="min-w-0 truncate text-[13px] font-extrabold text-drift-text-primary">
            {t("coach.workspace")}
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-[7px]">
        <LanguageSwitcher />
        <ThemeToggle />
        <button
          type="button"
          onClick={logout}
          className="ml-1 flex h-[38px] items-center gap-2 rounded-full border border-drift-border bg-drift-surface px-3.5 text-[12px] font-bold text-drift-text-secondary transition-all hover:-translate-y-px hover:bg-drift-surface-sunken hover:text-drift-text-primary"
        >
          <MaterialIcon name="logout" className="text-[18px]" />
          <span className="hidden sm:inline">{t("common.logOut")}</span>
        </button>
      </div>
    </header>
  );
}

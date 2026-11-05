"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClub } from "@/lib/club-context";
import { BrandIcon } from "@/components/BrandIcon";
import { MaterialIcon } from "@/components/dashboard-design";
import { NAV_GROUPS, canSeeNavItem } from "@/lib/nav";
import { useT } from "@/lib/i18n/i18n-context";
import type { MessageKey } from "@/lib/i18n/messages/en";

/** Same support address the sign-in page and the header help button use. */
const SUPPORT_HREF = "mailto:support@drift.app";

const DESCRIPTIONS: Record<string, MessageKey> = {
  "/settings": "set.descSettings",
  "/team": "set.descTeam",
  "/notifications": "set.descNotifications",
  "/audit": "set.descAudit",
  "/billing": "set.descBilling",
};

/**
 * The design's settings workspace: a left rail of sections with a short
 * description each, and the active page beside it. Everything under Settings
 * (club profile, team, notifications, audit, billing) shares this shell, so the
 * rail is built from the same nav config as the sidebar and respects the same
 * role restrictions.
 */
export default function SettingsWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const { clubName, role } = useClub();
  const group = NAV_GROUPS.find((g) => g.key === "settings");
  const items = (group?.items ?? []).filter((item) => canSeeNavItem(item, role));

  return (
    <div>
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase text-drift-text-secondary">
          <span className="h-[7px] w-[7px] rounded-full bg-drift-primary shadow-[0_0_0_4px_var(--color-primary-light)]" />
          {t("set.eyebrow")}
        </div>
        <h1 className="font-display text-[clamp(26px,3vw,38px)] font-extrabold leading-[1.1] text-drift-text-primary">
          {t("nav.settings")}
        </h1>
        <p className="mt-[7px] max-w-[590px] text-[13px] leading-[1.55] text-drift-text-secondary">
          {t("set.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-drift-border bg-drift-surface shadow-card lg:sticky lg:top-[90px]">
          <div className="flex items-center gap-3 border-b border-drift-border px-[18px] py-4">
            <BrandIcon className="h-[30px] shrink-0" />
            <div className="min-w-0">
              <strong className="block truncate text-[13px] font-extrabold text-drift-text-primary">
                {clubName ?? "-"}
              </strong>
              <span className="mt-0.5 block truncate text-[11px] text-drift-text-secondary">
                {t("set.workspace")}
              </span>
            </div>
          </div>

          <nav aria-label={t("nav.settings")} className="flex flex-col gap-1 p-2.5">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const description = DESCRIPTIONS[item.href];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors ${
                    active
                      ? "bg-drift-primary-light"
                      : "hover:bg-drift-surface-sunken"
                  }`}
                >
                  <span
                    className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${
                      active
                        ? "bg-drift-surface text-drift-primary shadow-[0_1px_5px_rgb(0_0_0/8%)]"
                        : "bg-drift-neutral-surface text-drift-text-secondary"
                    }`}
                  >
                    <MaterialIcon name={item.icon} filled={active} className="text-[19px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong
                      className={`block truncate text-[12px] font-bold ${
                        active ? "text-drift-primary-dark" : "text-drift-text-primary"
                      }`}
                    >
                      {t(item.label)}
                    </strong>
                    {description && (
                      <small className="mt-0.5 block truncate text-[11px] text-drift-text-secondary">
                        {t(description)}
                      </small>
                    )}
                  </span>
                  <MaterialIcon name="chevron_right" className="text-[17px] text-drift-text-secondary" />
                </Link>
              );
            })}
          </nav>

          <div className="m-2.5 mt-1 rounded-xl bg-drift-surface-sunken p-3.5">
            <div className="flex items-start gap-2.5">
              <MaterialIcon name="help" className="mt-px text-[20px] text-drift-text-secondary" />
              <div>
                <strong className="block text-[12px] font-bold text-drift-text-primary">
                  {t("set.helpTitle")}
                </strong>
                <p className="mt-0.5 text-[11px] leading-[1.45] text-drift-text-secondary">
                  {t("set.helpBody")}
                </p>
                <a
                  href={SUPPORT_HREF}
                  className="mt-2 inline-block text-[12px] font-bold text-drift-primary hover:text-drift-primary-dark"
                >
                  {t("set.helpLink")}
                </a>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

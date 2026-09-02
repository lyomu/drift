"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconChip, MaterialIcon } from "@/components/dashboard-design";
import { ErrorBanner } from "@/components/ui";
import { api } from "@/lib/api-client";
import type {
  FeatureFlag,
  IntegrationConfig,
  NotificationTemplate,
  SupportedMarket,
} from "@/lib/platform-config-types";
import { SETTINGS_SECTIONS } from "./sections";

/** "3 of 8 active" style summaries, keyed by section href. */
type Summaries = Record<string, string>;

function count<T>(rows: T[], predicate: (row: T) => boolean) {
  return rows.filter(predicate).length;
}

export default function SettingsOverviewPage() {
  const [summaries, setSummaries] = useState<Summaries>({});
  const [partial, setPartial] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Each section is summarised independently — one unreachable endpoint should
    // leave the other three cards showing their real numbers.
    async function load() {
      const results = await Promise.allSettled([
        api.get<{ markets: SupportedMarket[] }>("/platform-config/markets"),
        api.get<{ flags: FeatureFlag[] }>("/platform-config/feature-flags"),
        api.get<{ templates: NotificationTemplate[] }>("/platform-config/notification-templates"),
        api.get<{ integrations: IntegrationConfig[] }>("/platform-config/integrations"),
      ]);
      if (cancelled) return;

      const next: Summaries = {};
      const [markets, flags, templates, integrations] = results;

      if (markets.status === "fulfilled") {
        const rows = markets.value.markets;
        next["/settings/markets"] = `${rows.length} configured · ${count(rows, (m) => m.status === "ACTIVE")} active`;
      }
      if (flags.status === "fulfilled") {
        const rows = flags.value.flags;
        next["/settings/feature-flags"] = `${rows.length} flags · ${count(rows, (f) => f.status !== "OFF")} enabled`;
      }
      if (templates.status === "fulfilled") {
        const rows = templates.value.templates;
        next["/settings/notifications"] = `${rows.length} templates · ${count(rows, (t) => t.status === "LIVE")} live`;
      }
      if (integrations.status === "fulfilled") {
        const rows = integrations.value.integrations;
        next["/settings/integrations"] = `${rows.length} providers · ${count(rows, (i) => i.status === "CONNECTED")} connected`;
      }

      setSummaries(next);
      setPartial(results.some((result) => result.status === "rejected"));
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {partial && <ErrorBanner message="Some settings sections could not be summarised. Open a section for details." />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SETTINGS_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex flex-col rounded-lg border border-drift-border bg-drift-surface p-5 transition hover:border-drift-primary hover:bg-drift-primary-light/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between gap-3">
              <IconChip icon={section.icon} tone={section.tone} />
              <MaterialIcon
                name="arrow_forward"
                className="text-[20px] text-drift-text-secondary transition group-hover:translate-x-0.5 group-hover:text-drift-primary"
              />
            </div>
            <h2 className="mt-4 font-display text-lg font-bold leading-6 text-drift-text-primary">
              {section.title}
            </h2>
            <p className="mt-1 flex-1 text-sm leading-6 text-drift-text-secondary">
              {section.description}
            </p>
            <div className="mt-4 text-[12px] font-bold uppercase text-drift-text-secondary tabular">
              {summaries[section.href] ?? "—"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

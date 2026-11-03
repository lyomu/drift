"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, PageHeader } from "@/components/ui";
import { ToggleSwitch } from "@/components/dashboard-design";
import { useT } from "@/lib/i18n/i18n-context";

type Settings = {
  membershipChanges: boolean;
  competitionUpdates: boolean;
  eventRegistrations: boolean;
  moderationAlerts: boolean;
  weeklyDigest: boolean;
};

function options(t: ReturnType<typeof useT>): { key: keyof Settings; label: string; detail: string }[] { return [
  {
    key: "membershipChanges",
    label: t("a.membershipChanges"),
    detail: t("a.membershipChangesDetail"),
  },
  {
    key: "competitionUpdates",
    label: t("a.competitionUpdates"),
    detail: t("a.competitionUpdatesDetail"),
  },
  {
    key: "eventRegistrations",
    label: t("a.eventRegistrations"),
    detail: t("a.eventRegistrationsDetail"),
  },
  {
    key: "moderationAlerts",
    label: t("a.moderationAlerts"),
    detail: t("a.moderationAlertsDetail"),
  },
  {
    key: "weeklyDigest",
    label: t("a.weeklyDigest"),
    detail: t("a.weeklyDigestDetail"),
  },
]; }

export default function NotificationSettingsPage() {
  const t = useT();
  const OPTIONS = options(t);
  const { clubId } = useClub();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) return;
    api
      .get<{ settings: Settings }>(`/clubs/${clubId}/notification-settings`)
      .then((r) => setSettings(r.settings))
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : t("a.notificationDefaultsCouldNotBe"),
        ),
      );
  }, [clubId, t]);

  async function save() {
    if (!clubId || !settings) return;
    setBusy(true);
    try {
      setSettings(
        (
          await api.patch<{ settings: Settings }>(
            `/clubs/${clubId}/notification-settings`,
            settings,
          )
        ).settings,
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("a.notificationDefaultsCouldNotBe2"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("a.notificationSettings")}
        description={t("a.chooseTheDefaultOperationalAlerts")}
      />
      <ErrorBanner message={error} />
      {!settings ? (
        <EmptyState message={t("a.loading2")} />
      ) : (
        <Card>
          <div className="divide-y divide-drift-border">
            {OPTIONS.map((option) => (
              <div
                key={option.key}
                className="flex items-start justify-between gap-5 py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="text-[14px] font-bold text-drift-text-primary">
                    {option.label}
                  </div>
                  <div className="mt-1 text-[12.5px] leading-5 text-drift-text-secondary">
                    {option.detail}
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings[option.key]}
                  label={option.label}
                  onChange={(checked) =>
                    setSettings({ ...settings, [option.key]: checked })
                  }
                />
              </div>
            ))}
          </div>
          <Button className="mt-6" disabled={busy} onClick={() => void save()}>
            {busy ? t("common.saving") : t("a.saveDefaults")}
          </Button>
        </Card>
      )}
    </div>
  );
}

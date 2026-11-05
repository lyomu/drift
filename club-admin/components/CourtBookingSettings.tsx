"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button, Card, ErrorBanner, Field, Input, Select } from "@/components/ui";
import { MaterialIcon } from "@/components/dashboard-design";
import { useToast } from "@/components/Toast";
import { useI18n, useT } from "@/lib/i18n/i18n-context";
import { hhmmToMinute, minuteToHhmm } from "@/lib/tz";
import type { BookingSettings, OpeningInterval } from "@/lib/types";

const SLOT_OPTIONS = [30, 45, 60, 90, 120];
const DAYS = [1, 2, 3, 4, 5, 6, 0]; // Monday first

function timeZones(current: string): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  const all = supported ? supported("timeZone") : [];
  const base = all.length ? all : ["Africa/Nairobi", "Europe/London", "UTC"];
  return base.includes(current) ? base : [current, ...base];
}

/** Court detail "Booking" tab: enable switch, slot rules and the weekly-hours editor. */
export function CourtBookingSettings({ clubId, courtId }: { clubId: string; courtId: string }) {
  const t = useT();
  const { formatDate } = useI18n();
  const { notify } = useToast();
  const path = `/clubs/${clubId}/courts/${courtId}/booking-settings`;
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<BookingSettings>(path)
      .then((res) => {
        if (cancelled) return;
        // A fresh court starts with a usable default instead of an empty form.
        setSettings({ ...res, slotMinutes: res.slotMinutes ?? 60 });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
      });
    return () => {
      cancelled = true;
    };
  }, [path, t]);

  const zones = useMemo(() => timeZones(settings?.timezone ?? "UTC"), [settings?.timezone]);

  // 2024-01-01 is a Monday: a fixed anchor to get localized weekday names via Intl.
  const dayName = (dow: number) =>
    formatDate(new Date(Date.UTC(2024, 0, 7 + dow)), { weekday: "long", timeZone: "UTC" });

  if (!settings) {
    return error ? <ErrorBanner message={error} /> : <p className="text-sm text-drift-text-secondary">{t("a.loading")}</p>;
  }

  function update(patch: Partial<BookingSettings>) {
    setSettings((s) => (s ? { ...s, ...patch } : s));
  }

  function setInterval(dow: number, index: number, patch: Partial<OpeningInterval>) {
    setSettings((s) => {
      if (!s) return s;
      let seen = -1;
      return {
        ...s,
        hours: s.hours.map((h) => {
          if (h.dayOfWeek !== dow) return h;
          seen += 1;
          return seen === index ? { ...h, ...patch } : h;
        }),
      };
    });
  }

  function addInterval(dow: number) {
    setSettings((s) => {
      if (!s) return s;
      const day = s.hours.filter((h) => h.dayOfWeek === dow);
      const last = day[day.length - 1];
      const opens = last ? Math.min(last.closesMinute, 1380) : 8 * 60;
      return {
        ...s,
        hours: [...s.hours, { dayOfWeek: dow, opensMinute: opens, closesMinute: Math.min(opens + 4 * 60, 1440) }],
      };
    });
  }

  function removeInterval(dow: number, index: number) {
    setSettings((s) => {
      if (!s) return s;
      let seen = -1;
      return {
        ...s,
        hours: s.hours.filter((h) => {
          if (h.dayOfWeek !== dow) return true;
          seen += 1;
          return seen !== index;
        }),
      };
    });
  }

  async function save() {
    if (!settings) return;
    setError(null);
    if (settings.enabled && !settings.slotMinutes) {
      setError(t("bk.set.needsSlot"));
      return;
    }
    setSaving(true);
    try {
      const res = await api.put<BookingSettings>(path, settings);
      setSettings({ ...res, slotMinutes: res.slotMinutes ?? 60 });
      notify(t("bk.set.saved"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ErrorBanner message={error} />
      <Card className="flex flex-col gap-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
          />
          <span>
            <strong className="block text-[14px] font-bold text-drift-text-primary">{t("bk.set.enable")}</strong>
            <span className="block text-[12px] text-drift-text-secondary">{t("bk.set.enableHint")}</span>
            <span className="mt-1 block text-[12px] text-drift-text-secondary">{t("bk.set.externalNote")}</span>
          </span>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("bk.set.slot")}>
            <Select
              value={settings.slotMinutes ?? 60}
              onChange={(e) => update({ slotMinutes: Number(e.target.value) })}
            >
              {SLOT_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {t("bk.set.minutes", { count: m })}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("bk.set.timezone")}>
            <Select value={settings.timezone} onChange={(e) => update({ timezone: e.target.value })}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("bk.set.maxSlots")}>
            <Input
              type="number"
              min={1}
              max={12}
              value={settings.maxSlots}
              onChange={(e) => update({ maxSlots: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })}
            />
          </Field>
          <Field label={t("bk.set.advance")}>
            <Input
              type="number"
              min={1}
              max={180}
              value={settings.advanceDays}
              onChange={(e) => update({ advanceDays: Math.max(1, Math.min(180, Number(e.target.value) || 1)) })}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h3 className="text-[14px] font-extrabold text-drift-text-primary">{t("bk.set.hours")}</h3>
        <p className="mb-4 mt-0.5 text-[12px] text-drift-text-secondary">{t("bk.set.hoursHint")}</p>
        <div className="flex flex-col divide-y divide-drift-border">
          {DAYS.map((dow) => {
            const intervals = settings.hours
              .filter((h) => h.dayOfWeek === dow)
              .sort((a, b) => a.opensMinute - b.opensMinute);
            return (
              <div key={dow} className="flex flex-wrap items-start gap-3 py-3">
                <div className="w-28 pt-2 text-[13px] font-bold text-drift-text-primary">{dayName(dow)}</div>
                <div className="flex min-w-[240px] flex-1 flex-col gap-2">
                  {intervals.length === 0 && (
                    <span className="pt-2 text-[12px] text-drift-text-secondary">{t("bk.set.closed")}</span>
                  )}
                  {intervals.map((iv, index) => (
                    <div key={`${iv.opensMinute}-${index}`} className="flex flex-wrap items-center gap-2">
                      <Input
                        type="time"
                        aria-label={t("bk.set.opens")}
                        className="!w-[120px]"
                        value={minuteToHhmm(iv.opensMinute)}
                        onChange={(e) => e.target.value && setInterval(dow, index, { opensMinute: hhmmToMinute(e.target.value) })}
                      />
                      <span className="text-drift-text-secondary">–</span>
                      <Input
                        type="time"
                        aria-label={t("bk.set.closes")}
                        className="!w-[120px]"
                        value={iv.closesMinute >= 1440 ? "23:59" : minuteToHhmm(iv.closesMinute)}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const m = hhmmToMinute(e.target.value);
                          setInterval(dow, index, { closesMinute: m === 1439 ? 1440 : m });
                        }}
                      />
                      <button
                        type="button"
                        aria-label={t("bk.set.removeInterval")}
                        title={t("bk.set.removeInterval")}
                        onClick={() => removeInterval(dow, index)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-drift-text-secondary hover:bg-drift-surface-sunken"
                      >
                        <MaterialIcon name="close" className="text-[18px]" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => addInterval(dow)}>
                  <MaterialIcon name="add" className="text-[16px]" />
                  {t("bk.set.addInterval")}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Button type="button" onClick={() => void save()} disabled={saving} className="self-start">
        {saving ? t("common.saving") : t("bk.set.save")}
      </Button>
    </div>
  );
}

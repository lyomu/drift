"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, downloadBlob } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, Input, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { SelectEditControl } from "@/components/EditFieldModal";
import { IconChip, RowCard } from "@/components/dashboard-design";
import type { MessageKey } from "@/lib/i18n/messages/en";
import type { CourtReport, ReportStatus } from "@/lib/types";
import { useI18n, useT } from "@/lib/i18n/i18n-context";

const TABS = ["Engagement", "Court inquiries", "Events", "Members", "Listing reports"] as const;
type Tab = typeof TABS[number];
type Engagement = { newMembers: number; posts: number; reactions: number; eventRegistrations: number; competitionRegistrations: number };
type CourtMetric = {
  id: string;
  name: string;
  profileViews: number;
  contacts: number;
  bookings: number;
  bookingRequests: number;
  bookingsApproved: number;
  hoursBooked: number;
  utilisationPct: number | null;
};
type EventMetric = { id: string; name: string; startsAt: string; capacity: number | null; registrations: number; attended: number; noShows: number };
const STATUSES: ReportStatus[] = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"];

const TAB_KEYS: Record<Tab, MessageKey> = {
  Engagement: "rp.tabEngagement",
  "Court inquiries": "rp.tabCourts",
  Events: "rp.tabEvents",
  Members: "rp.tabMembers",
  "Listing reports": "rp.tabListing",
};

const ENGAGEMENT_KEYS: Record<string, MessageKey> = {
  newMembers: "ov.engNewMembers",
  posts: "ov.engPosts",
  reactions: "ov.engReactions",
  eventRegistrations: "ov.engEventSignups",
  competitionRegistrations: "ov.engCompetitionSignups",
};

const ENGAGEMENT_ICONS: Record<string, string> = {
  newMembers: "person_add",
  posts: "forum",
  reactions: "favorite",
  eventRegistrations: "event_available",
  competitionRegistrations: "emoji_events",
};

export default function ReportsPage() {
  const t = useT();
  const { formatDate } = useI18n();
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [tab, setTab] = useState<Tab>("Engagement");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [courts, setCourts] = useState<CourtMetric[] | null>(null);
  const [events, setEvents] = useState<EventMetric[] | null>(null);
  const [listingReports, setListingReports] = useState<CourtReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(`${from}T00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59`).toISOString());
    return params.toString();
  }, [from, to]);

  const load = useCallback(async () => {
    if (!clubId) return;
    setError(null);
    try {
      if (tab === "Engagement") setEngagement((await api.get<{ metrics: Engagement }>(`/clubs/${clubId}/analytics/engagement?${query()}`)).metrics);
      if (tab === "Court inquiries") setCourts((await api.get<{ courts: CourtMetric[] }>(`/clubs/${clubId}/analytics/courts?${query()}`)).courts);
      if (tab === "Events") setEvents((await api.get<{ events: EventMetric[] }>(`/clubs/${clubId}/analytics/events?${query()}`)).events);
      if (tab === "Listing reports") setListingReports((await api.get<{ reports: CourtReport[] }>(`/clubs/${clubId}/reports`)).reports);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.reportDataCouldNotBe"));
    }
  }, [clubId, tab, query, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function csv(filename: string, headers: string[], rows: unknown[][]) {
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    downloadBlob(new Blob([[headers.join(","), ...rows.map((row) => row.map(esc).join(","))].join("\n")], { type: "text/csv" }), filename);
  }

  function exportCurrent() {
    if (tab === "Engagement" && engagement) csv("engagement-report.csv", ["Metric", "Value"], Object.entries(engagement));
    if (tab === "Court inquiries" && courts) csv("court-inquiry-report.csv", ["Court", "Profile views", "Contacts", "Booking taps", "Booking requests", "Approved", "Hours booked", "Utilisation %"], courts.map((r) => [r.name, r.profileViews, r.contacts, r.bookings, r.bookingRequests, r.bookingsApproved, r.hoursBooked, r.utilisationPct ?? ""]));
    if (tab === "Events" && events) csv("event-report.csv", ["Event", "Date", "Registrations", "Attended", "No shows", "Capacity"], events.map((r) => [r.name, r.startsAt, r.registrations, r.attended, r.noShows, r.capacity]));
  }

  async function exportMembers() {
    if (!clubId) return;
    try { downloadBlob(await api.blob(`/clubs/${clubId}/members.csv`), "members.csv"); }
    catch (err) { setError(err instanceof ApiError ? err.message : t("a.memberExportFailedTryAgain")); }
  }

  async function updateStatus(id: string, status: ReportStatus) {
    if (!clubId) return;
    setError(null);
    await api.patch(`/clubs/${clubId}/reports/${id}`, { status });
    await load();
  }

  const hasExport = tab === "Engagement" || tab === "Court inquiries" || tab === "Events";

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.operations")}
        title={t("a.reports")}
        description={t("a.operationalPerformanceFacilityInterestEvent")}
        action={hasExport ? <Button variant="secondary" onClick={exportCurrent}>{t("a.exportReport")}</Button> : undefined}
      />
      <ErrorBanner message={error} />
      <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-drift-border">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-[13px] font-bold transition-colors ${
              tab === name
                ? "border-drift-primary text-drift-primary-dark"
                : "border-transparent text-drift-text-secondary hover:text-drift-text-primary"
            }`}
          >
            {t(TAB_KEYS[name])}
          </button>
        ))}
      </div>
      {hasExport && (
        <div className="mb-5 flex flex-wrap gap-3">
          <Input type="date" aria-label={t("a.reportStartDate")} value={from} onChange={(e) => setFrom(e.target.value)} className="max-w-52" />
          <Input type="date" aria-label={t("a.reportEndDate")} value={to} onChange={(e) => setTo(e.target.value)} className="max-w-52" />
        </div>
      )}

      {tab === "Engagement" && (
        engagement === null ? <EmptyState message={t("a.loading2")} /> :
        Object.values(engagement).every((v) => v === 0) ? <EmptyState message={t("a.reportsBuildUpAsActivity")} /> :
        <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(engagement).map(([label, value]) => (
            <Card key={label} className="flex items-center gap-3 px-[18px] py-4">
              <IconChip icon={ENGAGEMENT_ICONS[label] ?? "analytics"} tone="lime" />
              <div>
                <div className="text-[22px] font-extrabold text-drift-text-primary tabular">{value}</div>
                <div className="text-[11px] text-drift-text-secondary">{ENGAGEMENT_KEYS[label] ? t(ENGAGEMENT_KEYS[label]) : label}</div>
              </div>
            </Card>
          ))}
        </div>
          <div className="mt-[18px] overflow-hidden rounded-2xl border border-drift-border bg-drift-surface shadow-card">
            <div className="border-b border-drift-border px-5 py-4">
              <h2 className="text-[14px] font-extrabold text-drift-text-primary">{t("rp.chartTitle")}</h2>
              <p className="mt-[3px] text-[11px] text-drift-text-secondary">
                {t("rp.chartHint", { count: Object.values(engagement).reduce((sum, v) => sum + v, 0) })}
              </p>
            </div>
            <div className="flex h-[260px] items-end justify-around gap-3 px-6 pb-4 pt-8">
              {Object.entries(engagement).map(([key, value]) => {
                const max = Math.max(1, ...Object.values(engagement));
                return (
                  <div key={key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[13px] font-extrabold text-drift-text-primary tabular">{value}</span>
                    <div
                      className="w-full max-w-[64px] rounded-t-lg bg-gradient-to-t from-[#0077cc] to-[#38b6ff]"
                      style={{ height: `${Math.max(value > 0 ? 3 : 0, (value / max) * 100)}%`, minHeight: value > 0 ? 6 : 0 }}
                    />
                    <span className="w-full truncate text-center text-[11px] font-semibold text-drift-text-secondary">
                      {ENGAGEMENT_KEYS[key] ? t(ENGAGEMENT_KEYS[key]) : key}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {tab === "Court inquiries" && (
        courts === null ? <EmptyState message={t("a.loading2")} /> :
        courts.length === 0 ? <EmptyState message={t("a.noCourtsAreLinkedTo")} /> :
        <Card className="p-2">
          {courts.map((row) => (
            <RowCard key={row.id} className="flex flex-wrap items-center gap-4">
              <div className="min-w-[180px] flex-1 text-[14px] font-bold text-drift-text-primary">{row.name}</div>
              <Metric label={t("a.views")} value={row.profileViews} />
              <Metric label={t("a.contacts")} value={row.contacts} />
              <Metric label={t("a.bookings")} value={row.bookings} />
              <Metric label={t("bk.stat.requests")} value={row.bookingRequests} />
              <Metric label={t("bk.stat.approved")} value={row.bookingsApproved} />
              <Metric label={t("bk.stat.hours")} value={row.hoursBooked} />
              <Metric label={t("bk.stat.utilisation")} value={row.utilisationPct === null ? "-" : `${row.utilisationPct}%`} />
            </RowCard>
          ))}
        </Card>
      )}

      {tab === "Events" && (
        events === null ? <EmptyState message={t("a.loading2")} /> :
        events.length === 0 ? <EmptyState message={t("a.noEventActivityInThis")} /> :
        <Card className="p-2">
          {events.map((row) => (
            <RowCard key={row.id} className="flex flex-wrap items-center gap-4">
              <div className="min-w-[220px] flex-1">
                <div className="text-[14px] font-bold text-drift-text-primary">{row.name}</div>
                <div className="text-[12.5px] text-drift-text-secondary">{formatDate(row.startsAt)}</div>
              </div>
              <Metric label={t("a.registered")} value={row.registrations} />
              <Metric label={t("a.attended")} value={row.attended} />
              <Metric label={t("a.turnout")} value={row.registrations ? `${Math.round((row.attended / row.registrations) * 100)}%` : "-"} />
            </RowCard>
          ))}
        </Card>
      )}

      {tab === "Members" && (
        <Card>
          <h2 className="font-display text-[16px] font-extrabold text-drift-text-primary">{t("a.memberExport")}</h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-drift-text-secondary">{t("a.downloadTheCurrentMemberDirectory")}</p>
          <Button className="mt-5" onClick={() => void exportMembers()}>{t("a.exportMembersCsv")}</Button>
        </Card>
      )}

      {tab === "Listing reports" && (
        listingReports === null ? <EmptyState message={t("a.loading2")} /> :
        listingReports.length === 0 ? <EmptyState message={t("a.noCourtListingReports")} /> :
        <Card className="p-2">
          {listingReports.map((row) => (
            <RowCard key={row.id} className="flex flex-wrap items-center gap-4">
              <div className="min-w-[220px] flex-1">
                <div className="text-[14px] font-bold text-drift-text-primary">{row.courtName}</div>
                <div className="text-[12.5px] text-drift-text-secondary">{row.reason.replaceAll("_", " ")}</div>
              </div>
              <div className="min-w-[180px] flex-1 text-[12.5px] text-drift-text-secondary">{row.notes ?? "-"}</div>
              {canManage ? (
                <SelectEditControl
                  value={row.status}
                  options={STATUSES.map((status) => ({ value: status, label: status }))}
                  onSave={(next) => updateStatus(row.id, next as ReportStatus)}
                  title={t("a.updateReportStatus")}
                  description={`${row.courtName} · ${row.reason.replaceAll("_", " ")}`}
                  fieldLabel={t("a.status")}
                  confirmLabel={t("a.saveStatus")}
                />
              ) : (
                <StatusBadge status={row.status} />
              )}
            </RowCard>
          ))}
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-[92px]">
      <div className="text-[15px] font-extrabold text-drift-text-primary tabular">{value}</div>
      <div className="text-[11.5px] font-semibold text-drift-text-secondary">{label}</div>
    </div>
  );
}

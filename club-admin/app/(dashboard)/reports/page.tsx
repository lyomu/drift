"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, downloadBlob } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, Input, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { SelectEditControl } from "@/components/EditFieldModal";
import { IconChip, RowCard } from "@/components/dashboard-design";
import type { CourtReport, ReportStatus } from "@/lib/types";

const TABS = ["Engagement", "Court inquiries", "Events", "Members", "Listing reports"] as const;
type Tab = typeof TABS[number];
type Engagement = { newMembers: number; posts: number; reactions: number; eventRegistrations: number; competitionRegistrations: number };
type CourtMetric = { id: string; name: string; profileViews: number; contacts: number; bookings: number };
type EventMetric = { id: string; name: string; startsAt: string; capacity: number | null; registrations: number; attended: number; noShows: number };
const STATUSES: ReportStatus[] = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"];

const ENGAGEMENT_ICONS: Record<string, string> = {
  newMembers: "person_add",
  posts: "forum",
  reactions: "favorite",
  eventRegistrations: "event_available",
  competitionRegistrations: "emoji_events",
};

export default function ReportsPage() {
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
      setError(err instanceof ApiError ? err.message : "Report data could not be loaded.");
    }
  }, [clubId, tab, query]);

  useEffect(() => {
    void load();
  }, [load]);

  function csv(filename: string, headers: string[], rows: unknown[][]) {
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    downloadBlob(new Blob([[headers.join(","), ...rows.map((row) => row.map(esc).join(","))].join("\n")], { type: "text/csv" }), filename);
  }

  function exportCurrent() {
    if (tab === "Engagement" && engagement) csv("engagement-report.csv", ["Metric", "Value"], Object.entries(engagement));
    if (tab === "Court inquiries" && courts) csv("court-inquiry-report.csv", ["Court", "Profile views", "Contacts", "Bookings"], courts.map((r) => [r.name, r.profileViews, r.contacts, r.bookings]));
    if (tab === "Events" && events) csv("event-report.csv", ["Event", "Date", "Registrations", "Attended", "No shows", "Capacity"], events.map((r) => [r.name, r.startsAt, r.registrations, r.attended, r.noShows, r.capacity]));
  }

  async function exportMembers() {
    if (!clubId) return;
    try { downloadBlob(await api.blob(`/clubs/${clubId}/members.csv`), "members.csv"); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Member export failed. Try again."); }
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
        title="Reports"
        description="Operational performance, facility interest, event turnout, and portable club data."
        action={hasExport ? <Button variant="secondary" onClick={exportCurrent}>Export report</Button> : undefined}
      />
      <ErrorBanner message={error} />
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-drift-border">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-bold ${
              tab === name
                ? "border-drift-primary text-drift-primary"
                : "border-transparent text-drift-text-secondary hover:text-drift-text-primary"
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      {hasExport && (
        <div className="mb-5 flex flex-wrap gap-3">
          <Input type="date" aria-label="Report start date" value={from} onChange={(e) => setFrom(e.target.value)} className="max-w-52" />
          <Input type="date" aria-label="Report end date" value={to} onChange={(e) => setTo(e.target.value)} className="max-w-52" />
        </div>
      )}

      {tab === "Engagement" && (
        engagement === null ? <EmptyState message="Loading..." /> :
        Object.values(engagement).every((v) => v === 0) ? <EmptyState message="Reports build up as activity accrues." /> :
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(engagement).map(([label, value]) => (
            <Card key={label} className="flex items-center gap-3 px-[18px] py-4">
              <IconChip icon={ENGAGEMENT_ICONS[label] ?? "analytics"} tone="info" />
              <div>
                <div className="text-[22px] font-extrabold text-drift-text-primary tabular">{value}</div>
                <div className="text-xs text-drift-text-secondary">{label.replace(/([A-Z])/g, " $1").toLowerCase()}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "Court inquiries" && (
        courts === null ? <EmptyState message="Loading..." /> :
        courts.length === 0 ? <EmptyState message="No courts are linked to this club." /> :
        <Card className="p-2">
          {courts.map((row) => (
            <RowCard key={row.id} className="flex flex-wrap items-center gap-4">
              <div className="min-w-[180px] flex-1 text-[14px] font-bold text-drift-text-primary">{row.name}</div>
              <Metric label="Views" value={row.profileViews} />
              <Metric label="Contacts" value={row.contacts} />
              <Metric label="Bookings" value={row.bookings} />
            </RowCard>
          ))}
        </Card>
      )}

      {tab === "Events" && (
        events === null ? <EmptyState message="Loading..." /> :
        events.length === 0 ? <EmptyState message="No event activity in this period." /> :
        <Card className="p-2">
          {events.map((row) => (
            <RowCard key={row.id} className="flex flex-wrap items-center gap-4">
              <div className="min-w-[220px] flex-1">
                <div className="text-[14px] font-bold text-drift-text-primary">{row.name}</div>
                <div className="text-[12.5px] text-drift-text-secondary">{new Date(row.startsAt).toLocaleDateString()}</div>
              </div>
              <Metric label="Registered" value={row.registrations} />
              <Metric label="Attended" value={row.attended} />
              <Metric label="Turnout" value={row.registrations ? `${Math.round((row.attended / row.registrations) * 100)}%` : "-"} />
            </RowCard>
          ))}
        </Card>
      )}

      {tab === "Members" && (
        <Card>
          <h2 className="font-display text-lg font-extrabold text-drift-text-primary">Member export</h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-drift-text-secondary">
            Download the current member directory with role, status, and join date as a CSV file.
          </p>
          <Button className="mt-5" onClick={() => void exportMembers()}>Export members CSV</Button>
        </Card>
      )}

      {tab === "Listing reports" && (
        listingReports === null ? <EmptyState message="Loading..." /> :
        listingReports.length === 0 ? <EmptyState message="No court listing reports." /> :
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
                  title="Update report status"
                  description={`${row.courtName} · ${row.reason.replaceAll("_", " ")}`}
                  fieldLabel="Status"
                  confirmLabel="Save status"
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

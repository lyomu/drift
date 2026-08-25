"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, downloadBlob } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Select } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import type { CourtReport, ReportStatus } from "@/lib/types";

const TABS = ["Engagement", "Court inquiries", "Events", "Members", "Listing reports"] as const;
type Tab = typeof TABS[number];
type Engagement = { newMembers: number; posts: number; reactions: number; eventRegistrations: number; competitionRegistrations: number };
type CourtMetric = { id: string; name: string; profileViews: number; contacts: number; bookings: number };
type EventMetric = { id: string; name: string; startsAt: string; capacity: number | null; registrations: number; attended: number; noShows: number };
const STATUSES: ReportStatus[] = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"];

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

  useEffect(() => { void load(); }, [load]);

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
    try { await api.patch(`/clubs/${clubId}/reports/${id}`, { status }); await load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Report status could not be saved."); }
  }

  const hasExport = tab === "Engagement" || tab === "Court inquiries" || tab === "Events";
  return <div>
    <PageHeader title="Reports" description="Operational performance, facility interest, event turnout, and portable club data." action={hasExport ? <Button variant="secondary" onClick={exportCurrent}>Export report</Button> : undefined} />
    <ErrorBanner message={error} />
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-drift-border">{TABS.map((name) => <button key={name} onClick={() => setTab(name)} className={`whitespace-nowrap px-4 py-2 text-sm font-semibold ${tab === name ? "border-b-2 border-drift-primary text-drift-primary" : "text-drift-text-secondary hover:text-drift-text-primary"}`}>{name}</button>)}</div>
    {hasExport && <div className="mb-5 flex flex-wrap gap-3"><Input type="date" aria-label="Report start date" value={from} onChange={(e) => setFrom(e.target.value)} className="max-w-52" /><Input type="date" aria-label="Report end date" value={to} onChange={(e) => setTo(e.target.value)} className="max-w-52" /></div>}
    {tab === "Engagement" && (engagement === null ? <EmptyState message="Loading…" /> : Object.values(engagement).every((v) => v === 0) ? <EmptyState message="Reports build up as activity accrues." /> : <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Object.entries(engagement).map(([label, value]) => <Card key={label}><div className="font-display text-2xl font-bold text-drift-text-primary">{value}</div><div className="mt-1 text-sm text-drift-text-secondary">{label.replace(/([A-Z])/g, " $1").toLowerCase()}</div></Card>)}</div>)}
    {tab === "Court inquiries" && (courts === null ? <EmptyState message="Loading…" /> : <DataTable rows={courts} rowKey={(r) => r.id} emptyMessage="No courts are linked to this club." columns={[{ header: "Court", cell: (r) => r.name }, { header: "Profile views", cell: (r) => r.profileViews }, { header: "Contacts", cell: (r) => r.contacts }, { header: "Booking clicks", cell: (r) => r.bookings }]} />)}
    {tab === "Events" && (events === null ? <EmptyState message="Loading…" /> : <DataTable rows={events} rowKey={(r) => r.id} emptyMessage="No event activity in this period." columns={[{ header: "Event", cell: (r) => r.name }, { header: "Date", cell: (r) => new Date(r.startsAt).toLocaleDateString() }, { header: "Registered", cell: (r) => r.registrations }, { header: "Attended", cell: (r) => r.attended }, { header: "No shows", cell: (r) => r.noShows }, { header: "Turnout", cell: (r) => r.registrations ? `${Math.round((r.attended / r.registrations) * 100)}%` : "—" }]} />)}
    {tab === "Members" && <Card><h2 className="font-display text-lg font-bold text-drift-text-primary">Member export</h2><p className="mt-2 max-w-[65ch] text-sm leading-6 text-drift-text-secondary">Download the current member directory with role, status, and join date as a CSV file.</p><Button className="mt-5" onClick={() => void exportMembers()}>Export members CSV</Button></Card>}
    {tab === "Listing reports" && (listingReports === null ? <EmptyState message="Loading…" /> : <DataTable rows={listingReports} rowKey={(r) => r.id} emptyMessage="No court listing reports." columns={[{ header: "Court", cell: (r) => r.courtName }, { header: "Reason", cell: (r) => r.reason.replaceAll("_", " ") }, { header: "Notes", cell: (r) => r.notes ?? "—" }, { header: "Status", cell: (r) => canManage ? <Select value={r.status} onChange={(e) => void updateStatus(r.id, e.target.value as ReportStatus)} className="max-w-[160px]">{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</Select> : <StatusBadge status={r.status} /> }]} />)}
  </div>;
}

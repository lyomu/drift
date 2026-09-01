"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError, downloadBlob } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { EventForm } from "@/components/EventForm";
import { EventImage } from "@/components/EventImage";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { SelectEditControl } from "@/components/EditFieldModal";
import { DataTable } from "@/components/DataTable";
import type { ClubEvent, EventRegistration } from "@/lib/types";

const ATTENDANCE_OPTIONS = [
  { value: "REGISTERED", label: "Registered" },
  { value: "ATTENDED", label: "Attended" },
  { value: "NO_SHOW", label: "No show" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!clubId) return;
    try { const res = await api.get<{ event: ClubEvent }>(`/clubs/${clubId}/events/${id}`); setEvent(res.event); }
    catch (err) { setError(err instanceof ApiError ? err.message : "The event could not be loaded."); }
  }, [clubId, id]);
  useEffect(() => { void load(); }, [load]);

  async function register(e: React.FormEvent) {
    e.preventDefault(); if (!clubId) return;
    try { await api.post(`/clubs/${clubId}/events/${id}/registrations`, { email }); setEmail(""); await load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Registration could not be added."); }
  }

  async function attendance(registrationId: string, status: EventRegistration["status"]) {
    if (!clubId) return;
    setError(null);
    await api.patch(`/clubs/${clubId}/events/${id}/registrations/${registrationId}`, { status });
    await load();
  }

  async function exportList() {
    if (!clubId || !event) return;
    try { downloadBlob(await api.blob(`/clubs/${clubId}/events/${id}/registrations.csv`), `${event.name}-registrations.csv`); }
    catch (err) { setError(err instanceof ApiError ? err.message : "The registration list could not be exported. Try again."); }
  }

  if (!event) return <div><ErrorBanner message={error} /><EmptyState message="Loading…" /></div>;
  if (editing) return <div><PageHeader title={`Edit ${event.name}`} action={<Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>} /><EventForm event={event} /></div>;

  const registrations = event.registrations ?? [];
  return <div>
    <PageHeader title={event.name} description={`${new Date(event.startsAt).toLocaleString()}${event.capacity ? ` · ${registrations.length}/${event.capacity} places` : ""}`} action={<div className="flex gap-2"><StatusBadge status={event.status} />{canManage && <Button variant="secondary" onClick={() => setEditing(true)}>Edit event</Button>}</div>} />
    <ErrorBanner message={error} />
    {event.imageUrl && (
      <EventImage
        src={event.imageUrl}
        alt={event.name}
        className="mb-6 max-h-72 w-full rounded-lg border border-drift-border object-cover"
      />
    )}
    {event.description && <Card className="mb-6"><p className="max-w-[70ch] whitespace-pre-wrap text-sm leading-6 text-drift-text-secondary">{event.description}</p></Card>}
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-display text-lg font-bold text-drift-text-primary">Attendees & registrations</h2><p className="mt-1 text-sm text-drift-text-secondary">Mark attendance as people arrive.</p></div><Button variant="secondary" onClick={() => void exportList()}>Export list</Button></div>
    {canManage && <Card className="mb-5"><form onSubmit={register} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><Field label="Add a registered Drift member by email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div><Button type="submit">Add registration</Button></form></Card>}
    <DataTable rows={registrations} rowKey={(r) => r.id} emptyMessage="No registrations yet" columns={[
      { header: "Attendee", cell: (r) => `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || r.user.email || "—" },
      { header: "Email", cell: (r) => r.user.email ?? "—" },
      { header: "Status", cell: (r) => canManage ? <SelectEditControl value={r.status} options={ATTENDANCE_OPTIONS} onSave={(next) => attendance(r.id, next as EventRegistration["status"])} title="Update attendance" description={`${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || r.user.email || "Attendee"} fieldLabel="Status" confirmLabel="Save status" /> : <StatusBadge status={r.status} /> },
    ]} />
  </div>;
}

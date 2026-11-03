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
import { useI18n, useT } from "@/lib/i18n/i18n-context";

function attendanceOptions(t: ReturnType<typeof useT>) { return [
  { value: "REGISTERED", label: t("a.registered") },
  { value: "ATTENDED", label: t("a.attended") },
  { value: "NO_SHOW", label: t("a.noShow") },
  { value: "CANCELLED", label: t("a.cancelled") },
]; }

export default function EventDetailPage() {
  const t = useT();
  const { formatDate } = useI18n();
  const ATTENDANCE_OPTIONS = attendanceOptions(t);
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
    catch (err) { setError(err instanceof ApiError ? err.message : t("a.theEventCouldNotBe")); }
  }, [clubId, id, t]);
  useEffect(() => { void load(); }, [load]);

  async function register(e: React.FormEvent) {
    e.preventDefault(); if (!clubId) return;
    try { await api.post(`/clubs/${clubId}/events/${id}/registrations`, { email }); setEmail(""); await load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : t("a.registrationCouldNotBeAdded")); }
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
    catch (err) { setError(err instanceof ApiError ? err.message : t("a.theRegistrationListCouldNot")); }
  }

  if (!event) return <div><ErrorBanner message={error} /><EmptyState message={t("a.loading")} /></div>;
  if (editing) return <div><PageHeader title={t("a.editNamedEvent", { name: event.name })} action={<Button variant="ghost" onClick={() => setEditing(false)}>{t("a.cancel")}</Button>} /><EventForm event={event} /></div>;

  const registrations = event.registrations ?? [];
  return <div>
    <PageHeader title={event.name} description={`${formatDate(event.startsAt, { dateStyle: "medium", timeStyle: "short" })}${event.capacity ? ` · ${t("a.placesCount", { count: `${registrations.length}/${event.capacity}` })}` : ""}`} action={<div className="flex gap-2"><StatusBadge status={event.status} />{canManage && <Button variant="secondary" onClick={() => setEditing(true)}>{t("a.editEvent")}</Button>}</div>} />
    <ErrorBanner message={error} />
    {event.imageUrl && (
      <EventImage
        src={event.imageUrl}
        alt={event.name}
        className="mb-6 max-h-72 w-full rounded-lg border border-drift-border object-cover"
      />
    )}
    {event.description && <Card className="mb-6"><p className="max-w-[70ch] whitespace-pre-wrap text-sm leading-6 text-drift-text-secondary">{event.description}</p></Card>}
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-display text-lg font-bold text-drift-text-primary">{t("a.attendeesRegistrations")}</h2><p className="mt-1 text-sm text-drift-text-secondary">{t("a.markAttendanceAsPeopleArrive")}</p></div><Button variant="secondary" onClick={() => void exportList()}>{t("a.exportList")}</Button></div>
    {canManage && <Card className="mb-5"><form onSubmit={register} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><Field label={t("a.addARegisteredDriftMember")}><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div><Button type="submit">{t("a.addRegistration")}</Button></form></Card>}
    <DataTable rows={registrations} rowKey={(r) => r.id} emptyMessage={t("a.noRegistrationsYet")} columns={[
      { header: t("a.attendee"), cell: (r) => `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || r.user.email || "—" },
      { header: t("a.email"), cell: (r) => r.user.email ?? "—" },
      { header: t("a.status"), cell: (r) => canManage ? <SelectEditControl value={r.status} options={ATTENDANCE_OPTIONS} onSave={(next) => attendance(r.id, next as EventRegistration["status"])} title={t("a.updateAttendance")} description={`${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || r.user.email || t("a.attendee")} fieldLabel={t("a.status")} confirmLabel={t("a.saveStatus")} /> : <StatusBadge status={r.status} /> },
    ]} />
  </div>;
}

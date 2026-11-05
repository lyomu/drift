"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError, downloadBlob } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { EventForm } from "@/components/EventForm";
import { EventImage } from "@/components/EventImage";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Td, Th } from "@/components/ui";
import { BackButton, ManagementCard, SummaryStrip } from "@/components/redesign";
import { DateChip, InitialsAvatar, MaterialIcon } from "@/components/dashboard-design";
import { StatusBadge } from "@/components/StatusBadge";
import { SelectEditControl } from "@/components/EditFieldModal";
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
  const active = registrations.filter((r) => r.status !== "CANCELLED");
  const attended = registrations.filter((r) => r.status === "ATTENDED").length;
  const noShows = registrations.filter((r) => r.status === "NO_SHOW").length;
  const startsAt = new Date(event.startsAt);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <BackButton href="/events">{t("ev.backAll")}</BackButton>
        {canManage && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <MaterialIcon name="edit" className="text-[18px]" />
            {t("a.editEvent")}
          </Button>
        )}
      </div>
      <ErrorBanner message={error} />

      <section className="mb-[18px] flex flex-wrap items-center gap-5 overflow-hidden rounded-2xl border border-drift-border bg-drift-surface p-6 shadow-card">
        <DateChip value={startsAt} />
        <div className="min-w-0 flex-1">
          <StatusBadge status={event.status} />
          <h1 className="mt-2 truncate font-display text-[clamp(22px,2.4vw,30px)] font-extrabold leading-tight text-drift-text-primary">
            {event.name}
          </h1>
          <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-semibold text-drift-text-secondary">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-drift-neutral-surface px-2.5 py-1">
              <MaterialIcon name="schedule" className="text-[14px]" />
              {formatDate(event.startsAt, { dateStyle: "medium", timeStyle: "short" })}
            </span>
            {event.capacity ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-drift-neutral-surface px-2.5 py-1">
                <MaterialIcon name="groups" className="text-[14px]" />
                {t("a.placesCount", { count: `${active.length}/${event.capacity}` })}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {event.imageUrl && (
        <EventImage
          src={event.imageUrl}
          alt={event.name}
          className="mb-[18px] max-h-72 w-full rounded-2xl border border-drift-border object-cover"
        />
      )}

      <SummaryStrip
        items={[
          { icon: "how_to_reg", value: event.capacity ? `${active.length}/${event.capacity}` : active.length, label: t("ev.registered") },
          { icon: "check_circle", tone: "success", value: attended, label: t("ev.attended") },
          { icon: "person_off", tone: "coral", value: noShows, label: t("ev.noShows") },
        ]}
      />

      {event.description && (
        <Card className="mb-[18px]">
          <p className="max-w-[70ch] whitespace-pre-wrap text-[13px] leading-6 text-drift-text-secondary">{event.description}</p>
        </Card>
      )}

      <ManagementCard
        title={t("a.attendeesRegistrations")}
        subtitle={t("a.markAttendanceAsPeopleArrive")}
        actions={
          <Button variant="secondary" onClick={() => void exportList()}>
            <MaterialIcon name="download" className="text-[18px]" />
            {t("a.exportList")}
          </Button>
        }
      >
        {canManage && (
          <form
            onSubmit={register}
            className="flex flex-col gap-3 border-b border-drift-border bg-drift-surface-sunken px-5 py-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <Field label={t("a.addARegisteredDriftMember")}>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>
            <Button type="submit">{t("a.addRegistration")}</Button>
          </form>
        )}
        {registrations.length === 0 ? (
          <EmptyState bare compact icon="group" title={t("a.noRegistrationsYet")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr>
                  <Th>{t("a.attendee")}</Th>
                  <Th>{t("a.email")}</Th>
                  <Th>{t("a.status")}</Th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => {
                  const name = `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim() || r.user.email || "—";
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-drift-surface-sunken">
                      <Td>
                        <div className="flex items-center gap-[11px]">
                          <InitialsAvatar name={name} tone="auto" />
                          <strong className="text-[13px] font-bold">{name}</strong>
                        </div>
                      </Td>
                      <Td className="text-drift-text-secondary">{r.user.email ?? "—"}</Td>
                      <Td>
                        {canManage ? (
                          <SelectEditControl
                            value={r.status}
                            options={ATTENDANCE_OPTIONS}
                            onSave={(next) => attendance(r.id, next as EventRegistration["status"])}
                            title={t("a.updateAttendance")}
                            description={name === "—" ? t("a.attendee") : name}
                            fieldLabel={t("a.status")}
                            confirmLabel={t("a.saveStatus")}
                          />
                        ) : (
                          <StatusBadge status={r.status} />
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ManagementCard>
    </div>
  );
}

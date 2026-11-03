"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, ErrorBanner, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { IconChip, ModalShell } from "@/components/dashboard-design";
import { EventImage } from "@/components/EventImage";
import { EventImageUpload, uploadEventImage } from "@/components/EventImageUpload";
import { Listing } from "@/components/Listing";
import type { ClubEvent } from "@/lib/types";
import { useI18n, useT } from "@/lib/i18n/i18n-context";

export default function EventsPage() {
  const t = useT();
  const { formatDate } = useI18n();
  const { clubId } = useClub();
  const [events, setEvents] = useState<ClubEvent[] | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const query = date
        ? `?from=${new Date(`${date}T00:00`).toISOString()}&to=${new Date(`${date}T23:59`).toISOString()}`
        : "";
      const res = await api.get<{ events: ClubEvent[] }>(
        `/clubs/${clubId}/events${query}`,
      );
      setEvents(res.events);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.eventsCouldNotBeLoaded"));
    }
  }, [clubId, date, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(nextStatus: ClubEvent["status"]) {
    if (!clubId || !name.trim() || !startsAt) return;
    setBusy(true);
    setError(null);
    setImageError(null);
    try {
      const imageUrl = imageFile
        ? await uploadEventImage(clubId, imageFile, `${name.trim()} event image`)
        : undefined;
      await api.post<{ event: ClubEvent }>(`/clubs/${clubId}/events`, {
        name: name.trim(),
        description: description.trim() || undefined,
        imageUrl,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        capacity: capacity ? Number(capacity) : undefined,
        status: nextStatus,
      });
      setName("");
      setDescription("");
      setImageFile(null);
      setImageError(null);
      setStartsAt("");
      setEndsAt("");
      setCapacity("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.theEventCouldNotBe2"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("a.eventsCalendar")}
        description={t("a.planClubRunSessionsAnd")}
        action={<Button onClick={() => setShowForm(true)}>{t("a.createEvent")}</Button>}
      />
      <ErrorBanner message={error} />
      <div className="mb-5 max-w-xs">
        <Input
          type="date"
          aria-label={t("a.filterEventsByDate")}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <Listing
        title={t("a.events")}
        count={events?.length ?? null}
        loading={events === null}
        empty={{
          icon: "event",
          title: date ? t("a.noEventsOnDate") : t("a.noEventsScheduled"),
          description: t("a.createAnEventToPlan"),
          action: <Button onClick={() => setShowForm(true)}>{t("a.createEvent")}</Button>,
        }}
      >
        {events?.map((event) => (
          <Link href={`/events/${event.id}`} key={event.id}>
            <div className="rowcard flex flex-wrap items-center gap-4 rounded-lg border border-drift-border bg-drift-surface px-5 py-[18px] transition-colors">
              {event.imageUrl ? (
                <EventImage
                  src={event.imageUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-md object-cover"
                />
              ) : (
                <IconChip icon="event" tone="info" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-bold text-drift-text-primary">
                  {event.name}
                </div>
                <div className="mt-1 text-[12.5px] text-drift-text-secondary">
                  {formatDate(event.startsAt, { dateStyle: "medium", timeStyle: "short" })} / {event._count?.registrations ?? 0}
                  {event.capacity ? `/${event.capacity}` : ""} registered
                </div>
              </div>
              <StatusBadge status={event.status} />
            </div>
          </Link>
        ))}
      </Listing>

      {showForm && (
        <ModalShell title={t("a.createEvent")} onClose={() => setShowForm(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save("PUBLISHED");
            }}
            className="flex flex-col gap-4"
          >
            <Field label={t("a.eventName")}>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("a.starts")}>
                <Input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </Field>
              <Field label={t("a.ends")}>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </Field>
            </div>
            <Field label={t("a.capacity")}>
              <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </Field>
            <Field label={t("a.description")}>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <EventImageUpload
              file={imageFile}
              disabled={busy}
              onFileChange={setImageFile}
              onError={setImageError}
            />
            {imageError && (
              <p className="text-[13px] font-semibold text-drift-error" role="alert">
                {imageError}
              </p>
            )}
            <div className="mt-2 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void save("DRAFT")}
              >
                Save draft
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? t("common.saving") : t("a.savePublish")}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

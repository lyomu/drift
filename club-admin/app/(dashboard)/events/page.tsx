"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, EmptyState, ErrorBanner, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { ManagementCard, SegmentControl } from "@/components/redesign";
import { StatusBadge } from "@/components/StatusBadge";
import { DateChip, MaterialIcon, ModalShell } from "@/components/dashboard-design";
import { EventImage } from "@/components/EventImage";
import { EventImageUpload, uploadEventImage } from "@/components/EventImageUpload";
import type { ClubEvent } from "@/lib/types";
import { useI18n, useT } from "@/lib/i18n/i18n-context";

type EventWhen = "UPCOMING" | "PAST";

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
  const [when, setWhen] = useState<EventWhen>("UPCOMING");

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

  // Captured once so the Upcoming/Past split stays stable while the page is open.
  const [now] = useState(() => Date.now());
  const visibleEvents = useMemo(() => {
    const list = (events ?? []).filter((event) =>
      when === "UPCOMING" ? new Date(event.startsAt).getTime() >= now : new Date(event.startsAt).getTime() < now,
    );
    // Soonest first for what is coming; most recent first for what has passed.
    return list.sort((a, b) =>
      when === "UPCOMING"
        ? new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        : new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
    );
  }, [events, when, now]);
  const upcomingCount = (events ?? []).filter((event) => new Date(event.startsAt).getTime() >= now).length;
  // Seven days from today, marking the days that have an event.
  const weekStrip = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start.getTime() + i * 86400000);
      const next = new Date(day.getTime() + 86400000);
      return {
        key: day.toISOString(),
        weekday: formatDate(day, { weekday: "narrow" }),
        day: day.getDate(),
        hasEvent: (events ?? []).some((event) => {
          const at = new Date(event.startsAt).getTime();
          return at >= day.getTime() && at < next.getTime();
        }),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

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
        eyebrow={t("nav.community")}
        title={t("a.eventsCalendar")}
        description={t("a.planClubRunSessionsAnd")}
        action={
          <Button onClick={() => setShowForm(true)}>
            <MaterialIcon name="add" className="text-[19px]" />
            {t("a.createEvent")}
          </Button>
        }
      />
      <ErrorBanner message={error} />
      {events !== null && (
        <div className="mb-[18px] flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-drift-border bg-drift-surface px-5 py-4 shadow-card">
          <div className="min-w-[150px]">
            <span className="block text-[11px] font-bold uppercase text-drift-text-secondary">
              {formatDate(new Date(), { month: "long", year: "numeric" })}
            </span>
            <strong className="mt-0.5 block text-[14px] font-extrabold text-drift-text-primary">
              {t("ev.upcomingCount", { count: upcomingCount })}
            </strong>
          </div>
          <div className="flex flex-1 items-center justify-around gap-2" aria-hidden="true">
            {weekStrip.map((day) => (
              <div key={day.key} className="flex w-9 flex-col items-center gap-1">
                <span className="text-[11px] font-semibold uppercase text-drift-text-secondary">{day.weekday}</span>
                <span
                  className={`flex h-9 w-9 flex-col items-center justify-center rounded-[10px] text-[12px] font-bold ${
                    day.hasEvent
                      ? "bg-drift-primary text-white"
                      : "bg-drift-neutral-surface text-drift-text-secondary"
                  }`}
                >
                  {day.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ManagementCard
        title={t("ev.schedule")}
        subtitle={t("ev.count", { count: visibleEvents.length })}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              aria-label={t("a.filterEventsByDate")}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="!h-[38px] !w-auto !py-0"
            />
            <SegmentControl<EventWhen>
              value={when}
              onChange={setWhen}
              options={[
                { value: "UPCOMING", label: t("ev.upcoming") },
                { value: "PAST", label: t("ev.past") },
              ]}
            />
          </div>
        }
      >
        {events === null ? (
          <EmptyState bare compact message={t("common.loading")} />
        ) : visibleEvents.length === 0 ? (
          <EmptyState
            bare
            icon="event"
            title={date ? t("a.noEventsOnDate") : t("a.noEventsScheduled")}
            description={t("a.createAnEventToPlan")}
            action={<Button onClick={() => setShowForm(true)}>{t("a.createEvent")}</Button>}
          />
        ) : (
          <div className="flex flex-col px-3 py-1">
            {visibleEvents.map((event, index) => (
              <Link href={`/events/${event.id}`} key={event.id} className="block">
                <div
                  className={`flex flex-wrap items-center gap-4 rounded-xl px-2 py-4 transition-colors hover:bg-drift-surface-sunken ${
                    index < visibleEvents.length - 1 ? "border-b border-drift-border" : ""
                  }`}
                >
                  <DateChip value={new Date(event.startsAt)} tone="solid" />
                  {event.imageUrl && (
                    <EventImage
                      src={event.imageUrl}
                      alt=""
                      className="h-[43px] w-[43px] shrink-0 rounded-[10px] object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5">
                      <StatusBadge status={event.status} />
                    </div>
                    <div className="text-[14px] font-extrabold text-drift-text-primary">{event.name}</div>
                    <div className="mt-1 text-[12px] text-drift-text-secondary">
                      {formatDate(event.startsAt, { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                      {t("ov.registered", {
                        count: `${event._count?.registrations ?? 0}${event.capacity ? `/${event.capacity}` : ""}`,
                      })}
                    </div>
                  </div>
                  <span className="inline-flex h-[34px] items-center rounded-[9px] border border-drift-border bg-drift-surface px-3.5 text-[11px] font-bold text-drift-text-primary">
                    {t("ev.manage")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </ManagementCard>

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
                {t("a.saveDraft")}
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

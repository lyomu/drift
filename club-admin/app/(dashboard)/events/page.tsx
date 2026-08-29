"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, EmptyState, ErrorBanner, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { IconChip, ModalShell } from "@/components/dashboard-design";
import type { ClubEvent } from "@/lib/types";

export default function EventsPage() {
  const { clubId } = useClub();
  const [events, setEvents] = useState<ClubEvent[] | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
      setError(err instanceof ApiError ? err.message : "Events could not be loaded.");
    }
  }, [clubId, date]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(nextStatus: ClubEvent["status"]) {
    if (!clubId || !name.trim() || !startsAt) return;
    setBusy(true);
    setError(null);
    try {
      await api.post<{ event: ClubEvent }>(`/clubs/${clubId}/events`, {
        name: name.trim(),
        description: description.trim() || undefined,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        capacity: capacity ? Number(capacity) : undefined,
        status: nextStatus,
      });
      setName("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
      setCapacity("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The event could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Events calendar"
        description="Plan club-run sessions and manage turnout from one calendar."
        action={<Button onClick={() => setShowForm(true)}>Create event</Button>}
      />
      <ErrorBanner message={error} />
      <div className="mb-5 max-w-xs">
        <Input
          type="date"
          aria-label="Filter events by date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {events === null ? (
        <EmptyState message="Loading..." />
      ) : events.length === 0 ? (
        <EmptyState message="No events scheduled" />
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <Link href={`/events/${event.id}`} key={event.id}>
              <div className="rowcard flex flex-wrap items-center gap-4 rounded-2xl border border-drift-border bg-drift-surface px-5 py-[18px] transition-colors">
                <IconChip icon="event" tone="info" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-bold text-drift-text-primary">
                    {event.name}
                  </div>
                  <div className="mt-1 text-[12.5px] text-drift-text-secondary">
                    {new Date(event.startsAt).toLocaleString()} / {event._count?.registrations ?? 0}
                    {event.capacity ? `/${event.capacity}` : ""} registered
                  </div>
                </div>
                <StatusBadge status={event.status} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <ModalShell title="Create event" onClose={() => setShowForm(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save("PUBLISHED");
            }}
            className="flex flex-col gap-4"
          >
            <Field label="Event name">
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Starts">
                <Input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </Field>
              <Field label="Ends">
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </Field>
            </div>
            <Field label="Capacity">
              <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </Field>
            <Field label="Description">
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
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
                {busy ? "Saving..." : "Save & publish"}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, EmptyState, ErrorBanner, Input, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import type { ClubEvent } from "@/lib/types";

export default function EventsPage() {
  const { clubId } = useClub();
  const [events, setEvents] = useState<ClubEvent[] | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const query = date ? `?from=${new Date(`${date}T00:00`).toISOString()}&to=${new Date(`${date}T23:59`).toISOString()}` : "";
      const res = await api.get<{ events: ClubEvent[] }>(`/clubs/${clubId}/events${query}`);
      setEvents(res.events);
    } catch (err) { setError(err instanceof ApiError ? err.message : "Events could not be loaded."); }
  }, [clubId, date]);
  useEffect(() => { void load(); }, [load]);

  return <div>
    <PageHeader title="Events calendar" description="Plan club-run sessions and manage turnout from one calendar." action={<Link href="/events/new"><Button>Create event</Button></Link>} />
    <ErrorBanner message={error} />
    <div className="mb-5 max-w-xs"><Input type="date" aria-label="Filter events by date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
    {events === null ? <EmptyState message="Loading…" /> : events.length === 0 ? <EmptyState message="No events scheduled" /> : <div className="flex flex-col gap-3">{events.map((event) => <Link href={`/events/${event.id}`} key={event.id}><Card className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-drift-primary"><div><div className="font-semibold text-drift-text-primary">{event.name}</div><div className="mt-1 text-sm text-drift-text-secondary">{new Date(event.startsAt).toLocaleString()} · {event._count?.registrations ?? 0}{event.capacity ? `/${event.capacity}` : ""} registered</div></div><StatusBadge status={event.status} /></Card></Link>)}</div>}
  </div>;
}

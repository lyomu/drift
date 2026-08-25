"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, ErrorBanner, Field, Input, Select, Textarea } from "@/components/ui";
import type { ClubEvent } from "@/lib/types";

export function EventForm({ event }: { event?: ClubEvent }) {
  const router = useRouter();
  const { clubId } = useClub();
  const [name, setName] = useState(event?.name ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startsAt, setStartsAt] = useState(event ? event.startsAt.slice(0, 16) : "");
  const [endsAt, setEndsAt] = useState(event?.endsAt ? event.endsAt.slice(0, 16) : "");
  const [capacity, setCapacity] = useState(event?.capacity?.toString() ?? "");
  const [status, setStatus] = useState<ClubEvent["status"]>(event?.status ?? "DRAFT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(nextStatus: ClubEvent["status"]) {
    if (!clubId || !name.trim() || !startsAt) return;
    setBusy(true); setError(null);
    try {
      const body = { name: name.trim(), description: description.trim() || undefined, startsAt: new Date(startsAt).toISOString(), endsAt: endsAt ? new Date(endsAt).toISOString() : undefined, capacity: capacity ? Number(capacity) : undefined, status: nextStatus };
      const result = event
        ? await api.patch<{ event: ClubEvent }>(`/clubs/${clubId}/events/${event.id}`, body)
        : await api.post<{ event: ClubEvent }>(`/clubs/${clubId}/events`, body);
      router.push(`/events/${result.event.id}`);
    } catch (err) { setError(err instanceof ApiError ? err.message : "The event could not be saved."); }
    finally { setBusy(false); }
  }

  return <Card>
    <ErrorBanner message={error} />
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field label="Event name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field></div>
      <div><Field label="Starts"><Input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></Field></div>
      <div><Field label="Ends (optional)"><Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></Field></div>
      <div><Field label="Capacity (optional)"><Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></Field></div>
      {event && <div><Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value as ClubEvent["status"])}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></Select></Field></div>}
      <div className="sm:col-span-2"><Field label="Description"><Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} /></Field></div>
    </div>
    <div className="mt-6 flex flex-wrap gap-3">
      <Button disabled={busy} onClick={() => void save(event ? status : "PUBLISHED")}>{busy ? "Saving…" : event ? "Save changes" : "Save & publish"}</Button>
      {!event && <Button variant="secondary" disabled={busy} onClick={() => void save("DRAFT")}>Save draft</Button>}
    </div>
  </Card>;
}

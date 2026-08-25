"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { DuplicateCandidate, DuplicateVenue } from "@/lib/venue-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, statusTone } from "@/components/ui";

function VenueSide({ venue, selected, onSelect }: { venue: DuplicateVenue; selected: boolean; onSelect: () => void }) {
  return (
    <label className={`block cursor-pointer rounded-md border p-4 ${selected ? "border-drift-primary bg-drift-primary-light" : "border-drift-border bg-drift-background"}`}>
      <div className="flex items-start gap-3">
        <input className="mt-1" type="radio" checked={selected} onChange={onSelect} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-drift-text-primary">{venue.name}</span><Badge tone={statusTone(venue.verificationStatus)}>{venue.verificationStatus}</Badge></div>
          <div className="mt-1 text-sm text-drift-text-secondary">{venue.address ?? "Address unknown"}</div>
          <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 text-xs">
            <div><dt className="font-semibold text-drift-text-secondary">Club</dt><dd className="mt-0.5 text-drift-text-primary">{venue.club?.name ?? "Independent"}</dd></div>
            <div><dt className="font-semibold text-drift-text-secondary">Phone</dt><dd className="mt-0.5 text-drift-text-primary">{venue.phone ?? "Unknown"}</dd></div>
            <div><dt className="font-semibold text-drift-text-secondary">Place ID</dt><dd className="mt-0.5 truncate text-drift-text-primary" title={venue.googlePlacesRef ?? undefined}>{venue.googlePlacesRef ?? "Not linked"}</dd></div>
            <div><dt className="font-semibold text-drift-text-secondary">Linked use</dt><dd className="mt-0.5 text-drift-text-primary">{venue.counts.matches} matches · {venue.counts.inquiries} inquiries</dd></div>
          </dl>
          <Link href={`/venues/${venue.id}`} className="mt-4 inline-block text-sm font-semibold text-drift-primary hover:underline" onClick={(event) => event.stopPropagation()}>Open full record</Link>
        </div>
      </div>
    </label>
  );
}

export default function DuplicateMergePage() {
  const [candidates, setCandidates] = useState<DuplicateCandidate[] | null>(null);
  const [survivors, setSurvivors] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await api.get<{ candidates: DuplicateCandidate[]; scanned: number; capped: boolean }>("/venues/duplicates");
      setCandidates(response.candidates);
      setScanNote(`${response.scanned} venue records scanned${response.capped ? " (scan capped at 1,000)" : ""}.`);
      setSurvivors(Object.fromEntries(response.candidates.map((candidate) => [candidate.pairKey, candidate.first.id])));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Duplicate candidates could not be loaded.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function markDistinct(candidate: DuplicateCandidate) {
    if (!window.confirm(`Mark ${candidate.first.name} and ${candidate.second.name} as two distinct venues?`)) return;
    setBusyKey(candidate.pairKey);
    setError(null);
    try {
      await api.post("/venues/duplicates/distinct", { firstCourtId: candidate.first.id, secondCourtId: candidate.second.id });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The distinct decision could not be saved.");
    } finally {
      setBusyKey(null);
    }
  }

  async function merge(candidate: DuplicateCandidate) {
    const survivorCourtId = survivors[candidate.pairKey] ?? candidate.first.id;
    const survivor = survivorCourtId === candidate.first.id ? candidate.first : candidate.second;
    const duplicate = survivorCourtId === candidate.first.id ? candidate.second : candidate.first;
    if (!window.confirm(`Merge “${duplicate.name}” into “${survivor.name}”? The duplicate record will be deleted after its matches, inquiries, and reports move to the survivor. This cannot be undone from this screen.`)) return;
    setBusyKey(candidate.pairKey);
    setError(null);
    try {
      await api.post("/venues/duplicates/merge", { survivorCourtId: survivor.id, duplicateCourtId: duplicate.id });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The venue records could not be merged.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div>
      <PageHeader title="Duplicate merge" description="Resolve likely duplicate court records without losing linked matches, inquiries, or reports." action={<Button variant="secondary" onClick={() => void load()}>Run detection</Button>} />
      <ErrorBanner message={error} />
      {scanNote && <p className="mb-4 text-xs text-drift-text-secondary">{scanNote} Candidates require a strong match across name, address, provider identity, contact, or proximity.</p>}
      {candidates === null && !error && <EmptyState message="Detecting duplicate venues…" />}
      {candidates?.length === 0 && <EmptyState message="No duplicates detected" />}

      {candidates && candidates.length > 0 && (
        <div className="flex flex-col gap-5">
          {candidates.map((candidate) => (
            <Card key={candidate.pairKey}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-display text-xl font-semibold text-drift-text-primary">Possible duplicate</h2><p className="mt-1 text-sm text-drift-text-secondary">{candidate.reasons.join(" · ")}</p></div>
                <Badge tone={candidate.confidence >= 80 ? "error" : "warning"}>{candidate.confidence}% confidence</Badge>
              </div>
              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-semibold text-drift-text-secondary">Choose the surviving record</legend>
                <div className="grid gap-3 lg:grid-cols-2">
                  <VenueSide venue={candidate.first} selected={(survivors[candidate.pairKey] ?? candidate.first.id) === candidate.first.id} onSelect={() => setSurvivors((current) => ({ ...current, [candidate.pairKey]: candidate.first.id }))} />
                  <VenueSide venue={candidate.second} selected={survivors[candidate.pairKey] === candidate.second.id} onSelect={() => setSurvivors((current) => ({ ...current, [candidate.pairKey]: candidate.second.id }))} />
                </div>
              </fieldset>
              <div className="mt-4 flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={busyKey === candidate.pairKey} onClick={() => void markDistinct(candidate)}>Mark as distinct</Button><Button variant="destructive" disabled={busyKey === candidate.pairKey} onClick={() => void merge(candidate)}>{busyKey === candidate.pairKey ? "Working…" : "Merge records"}</Button></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

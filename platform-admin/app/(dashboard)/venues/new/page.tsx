"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import type { ClubOption, Venue, VenueFormValue } from "@/lib/venue-types";
import { emptyVenue, VenueForm } from "@/components/VenueForm";
import { EmptyState, ErrorBanner, PageHeader } from "@/components/ui";

export default function NewVenuePage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<ClubOption[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ clubs: ClubOption[] }>("/venues/clubs")
      .then((response) => setClubs(response.clubs))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Club options could not be loaded."));
  }, []);

  async function create(value: VenueFormValue) {
    setBusy(true);
    setError(null);
    try {
      const response = await api.post<{ venue: Venue }>("/venues", value);
      router.push(`/venues/${response.venue.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The venue could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Add venue" description="Create the full court record used by discovery and match operations." action={<Link href="/venues" className="text-sm font-semibold text-drift-primary hover:underline">Back to venues</Link>} />
      <ErrorBanner message={error} />
      {clubs === null && !error ? <EmptyState message="Loading venue form…" /> : clubs && <VenueForm initial={emptyVenue} clubs={clubs} busy={busy} submitLabel="Create venue" onSubmit={create} />}
    </div>
  );
}

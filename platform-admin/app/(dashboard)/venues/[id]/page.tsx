"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import type { ClubOption, Venue, VenueFormValue } from "@/lib/venue-types";
import { VenueForm } from "@/components/VenueForm";
import { Badge, EmptyState, ErrorBanner, PageHeader, statusTone } from "@/components/ui";

function toFormValue(venue: Venue): VenueFormValue {
  return {
    name: venue.name,
    address: venue.address,
    latitude: venue.latitude,
    longitude: venue.longitude,
    clubId: venue.clubId,
    phone: venue.phone,
    website: venue.website,
    bookingType: venue.bookingType,
    bookingUrl: venue.bookingUrl,
    amenities: venue.amenities,
    openingHoursNote: venue.openingHoursNote,
    isPublic: venue.isPublic,
    photoUrls: venue.photoUrls,
    googlePlacesRef: venue.googlePlacesRef,
    verificationStatus: venue.verificationStatus,
    courtGroups: venue.courtGroups.map(({ sport, surface, indoor, lighting, count }) => ({ sport, surface, indoor, lighting, count })),
  };
}

export default function EditVenuePage() {
  const params = useParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [clubs, setClubs] = useState<ClubOption[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ venue: Venue }>(`/venues/${params.id}`),
      api.get<{ clubs: ClubOption[] }>("/venues/clubs"),
    ])
      .then(([venueResponse, clubResponse]) => { setVenue(venueResponse.venue); setClubs(clubResponse.clubs); })
      .catch((err) => setError(err instanceof ApiError ? err.message : "The venue could not be loaded."));
  }, [params.id]);

  async function update(value: VenueFormValue) {
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const response = await api.patch<{ venue: Venue }>(`/venues/${params.id}`, value);
      setVenue(response.venue);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The venue could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={venue?.name ?? "Edit venue"}
        description="Edit the platform record. Changes affect discovery and future venue selections immediately."
        action={<Link href="/venues" className="text-sm font-semibold text-drift-primary hover:underline">Back to venues</Link>}
      />
      <ErrorBanner message={error} />
      {saved && <div className="mb-4 rounded-md border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm text-drift-success">Venue saved.</div>}
      {venue && <div className="mb-4 flex flex-wrap items-center gap-2"><Badge tone={statusTone(venue.verificationStatus)}>{venue.verificationStatus}</Badge><Link href="/venues/places-sync" aria-label="Open Google Places sync status"><Badge tone={statusTone(venue.placesSyncStatus)}>Places {venue.placesSyncStatus}</Badge></Link><span className="text-sm text-drift-text-secondary">{venue._count.matches} linked matches · {venue._count.inquiries} inquiries · {venue._count.reports} reports</span></div>}
      {(!venue || !clubs) && !error ? <EmptyState message="Loading venue…" /> : venue && clubs && <VenueForm key={venue.updatedAt} initial={toFormValue(venue)} clubs={clubs} busy={busy} submitLabel="Save venue" onSubmit={update} />}
    </div>
  );
}

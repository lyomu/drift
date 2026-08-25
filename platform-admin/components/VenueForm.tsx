"use client";

import { FormEvent, useState } from "react";
import type { ClubOption, VenueFormValue } from "@/lib/venue-types";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

const emptyGroup: VenueFormValue["courtGroups"][number] = {
  sport: "TENNIS",
  surface: "HARD",
  indoor: false,
  lighting: false,
  count: 1,
};

export const emptyVenue: VenueFormValue = {
  name: "",
  address: null,
  latitude: null,
  longitude: null,
  clubId: null,
  phone: null,
  website: null,
  bookingType: "UNKNOWN",
  bookingUrl: null,
  amenities: [],
  openingHoursNote: null,
  isPublic: null,
  photoUrls: [],
  googlePlacesRef: null,
  verificationStatus: "UNVERIFIED",
  courtGroups: [],
};

export function VenueForm({
  initial,
  clubs,
  busy,
  submitLabel,
  onSubmit,
}: {
  initial: VenueFormValue;
  clubs: ClubOption[];
  busy: boolean;
  submitLabel: string;
  onSubmit: (value: VenueFormValue) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [amenities, setAmenities] = useState(initial.amenities.join(", "));
  const [photoUrls, setPhotoUrls] = useState(initial.photoUrls.join("\n"));

  function nullableText(input: string) {
    return input.trim() || null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      ...value,
      name: value.name.trim(),
      address: nullableText(value.address ?? ""),
      phone: nullableText(value.phone ?? ""),
      website: nullableText(value.website ?? ""),
      bookingUrl: nullableText(value.bookingUrl ?? ""),
      openingHoursNote: nullableText(value.openingHoursNote ?? ""),
      googlePlacesRef: nullableText(value.googlePlacesRef ?? ""),
      amenities: amenities.split(",").map((item) => item.trim()).filter(Boolean),
      photoUrls: photoUrls.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    });
  }

  function updateGroup(index: number, patch: Partial<VenueFormValue["courtGroups"][number]>) {
    setValue((current) => ({
      ...current,
      courtGroups: current.courtGroups.map((group, groupIndex) => groupIndex === index ? { ...group, ...patch } : group),
    }));
  }

  return (
    <form onSubmit={submit} className="flex max-w-5xl flex-col gap-6">
      <Card>
        <h2 className="font-display text-xl font-semibold text-drift-text-primary">Identity and ownership</h2>
        <p className="mt-1 text-sm text-drift-text-secondary">The public name, map position, club relationship, and verification state.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Venue name"><Input required maxLength={200} value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} /></Field>
          <Field label="Owned by club"><Select value={value.clubId ?? ""} onChange={(event) => setValue({ ...value, clubId: event.target.value || null })}><option value="">Independent venue</option>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name} · {club.verificationStatus.toLowerCase()}</option>)}</Select></Field>
          <div className="md:col-span-2"><Field label="Address"><Input value={value.address ?? ""} onChange={(event) => setValue({ ...value, address: event.target.value })} /></Field></div>
          <Field label="Latitude"><Input type="number" step="any" min={-90} max={90} value={value.latitude ?? ""} onChange={(event) => setValue({ ...value, latitude: event.target.value === "" ? null : Number(event.target.value) })} /></Field>
          <Field label="Longitude"><Input type="number" step="any" min={-180} max={180} value={value.longitude ?? ""} onChange={(event) => setValue({ ...value, longitude: event.target.value === "" ? null : Number(event.target.value) })} /></Field>
          <Field label="Verification status"><Select value={value.verificationStatus} onChange={(event) => setValue({ ...value, verificationStatus: event.target.value as VenueFormValue["verificationStatus"] })}><option value="UNVERIFIED">Unverified</option><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option></Select></Field>
          <Field label="Public access"><Select value={value.isPublic === null ? "UNKNOWN" : value.isPublic ? "PUBLIC" : "PRIVATE"} onChange={(event) => setValue({ ...value, isPublic: event.target.value === "UNKNOWN" ? null : event.target.value === "PUBLIC" })}><option value="UNKNOWN">Unknown</option><option value="PUBLIC">Public</option><option value="PRIVATE">Private</option></Select></Field>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-semibold text-drift-text-primary">Contact and booking</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Phone"><Input value={value.phone ?? ""} onChange={(event) => setValue({ ...value, phone: event.target.value })} /></Field>
          <Field label="Website"><Input type="url" value={value.website ?? ""} onChange={(event) => setValue({ ...value, website: event.target.value })} /></Field>
          <Field label="Booking type"><Select value={value.bookingType} onChange={(event) => setValue({ ...value, bookingType: event.target.value as VenueFormValue["bookingType"] })}><option value="UNKNOWN">Unknown</option><option value="CONTACT_ONLY">Contact only</option><option value="EXTERNAL_LINK">External link</option><option value="NATIVE_PARTNER">Native partner</option></Select></Field>
          <Field label="Booking URL"><Input type="url" disabled={value.bookingType !== "EXTERNAL_LINK"} required={value.bookingType === "EXTERNAL_LINK"} value={value.bookingUrl ?? ""} onChange={(event) => setValue({ ...value, bookingUrl: event.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="Opening hours note"><Textarea rows={4} value={value.openingHoursNote ?? ""} onChange={(event) => setValue({ ...value, openingHoursNote: event.target.value })} /></Field></div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-display text-xl font-semibold text-drift-text-primary">Court groups</h2><p className="mt-1 text-sm text-drift-text-secondary">Represent each sport, surface, indoor, and lighting combination separately.</p></div>
          <Button type="button" variant="secondary" onClick={() => setValue({ ...value, courtGroups: [...value.courtGroups, { ...emptyGroup }] })}>Add court group</Button>
        </div>
        {value.courtGroups.length === 0 ? (
          <div className="mt-5 rounded-md border border-dashed border-drift-border px-4 py-8 text-center text-sm text-drift-text-secondary">No court groups yet. The venue can still be saved, but surface filtering will treat its courts as unknown.</div>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            {value.courtGroups.map((group, index) => (
              <div key={index} className="grid gap-3 rounded-md border border-drift-border bg-drift-background p-4 md:grid-cols-[1fr_1fr_120px_auto_auto_auto] md:items-end">
                <Field label="Sport"><Select value={group.sport} onChange={(event) => updateGroup(index, { sport: event.target.value as "TENNIS" | "PADEL" })}><option value="TENNIS">Tennis</option><option value="PADEL">Padel</option></Select></Field>
                <Field label="Surface"><Select value={group.surface} onChange={(event) => updateGroup(index, { surface: event.target.value as VenueFormValue["courtGroups"][number]["surface"] })}><option value="HARD">Hard</option><option value="CLAY">Clay</option><option value="GRASS">Grass</option><option value="ARTIFICIAL_GRASS">Artificial grass</option></Select></Field>
                <Field label="Count"><Input type="number" min={1} max={100} required value={group.count} onChange={(event) => updateGroup(index, { count: Number(event.target.value) })} /></Field>
                <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-drift-text-secondary"><input type="checkbox" checked={group.indoor} onChange={(event) => updateGroup(index, { indoor: event.target.checked })} /> Indoor</label>
                <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-drift-text-secondary"><input type="checkbox" checked={group.lighting} onChange={(event) => updateGroup(index, { lighting: event.target.checked })} /> Lighting</label>
                <Button type="button" variant="ghost" onClick={() => setValue({ ...value, courtGroups: value.courtGroups.filter((_, groupIndex) => groupIndex !== index) })}>Remove</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-xl font-semibold text-drift-text-primary">Enrichment</h2>
        <p className="mt-1 text-sm text-drift-text-secondary">A Places reference enables audited provider refreshes. Manual fields remain honest when no provider is configured.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Google Places reference"><Input value={value.googlePlacesRef ?? ""} onChange={(event) => setValue({ ...value, googlePlacesRef: event.target.value })} placeholder="Place ID" /></Field>
          <Field label="Amenities (comma-separated)"><Input value={amenities} onChange={(event) => setAmenities(event.target.value)} placeholder="Changing rooms, parking" /></Field>
          <div className="md:col-span-2"><Field label="Photo URLs (one per line)"><Textarea rows={4} value={photoUrls} onChange={(event) => setPhotoUrls(event.target.value)} /></Field></div>
        </div>
      </Card>

      <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button></div>
    </form>
  );
}

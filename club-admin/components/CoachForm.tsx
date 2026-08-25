"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import type { CoachAdmin, CoachLevel } from "@/lib/types";

const LEVELS: { value: CoachLevel; label: string }[] = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "COMPETITIVE", label: "Competitive" },
];

export type CoachFormPayload = {
  accountEmail?: string;
  bio: string | null;
  qualifications: string[];
  yearsExperience: number | null;
  specialisations: string[];
  levels: CoachLevel[];
  availabilityNote: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  bookingUrl: string | null;
};

export function CoachForm({
  coach,
  saving,
  onSubmit,
}: {
  coach?: CoachAdmin;
  saving: boolean;
  onSubmit: (payload: CoachFormPayload) => Promise<void>;
}) {
  const [accountEmail, setAccountEmail] = useState(coach?.accountEmail ?? "");
  const [bio, setBio] = useState(coach?.bio ?? "");
  const [qualifications, setQualifications] = useState(
    coach?.qualifications.join("\n") ?? "",
  );
  const [yearsExperience, setYearsExperience] = useState(
    coach?.yearsExperience?.toString() ?? "",
  );
  const [specialisations, setSpecialisations] = useState(
    coach?.specialisations.join(", ") ?? "",
  );
  const [levels, setLevels] = useState<CoachLevel[]>(coach?.levels ?? []);
  const [availabilityNote, setAvailabilityNote] = useState(
    coach?.availabilityNote ?? "",
  );
  const [publicEmail, setPublicEmail] = useState(
    coach?.publicContact.email ?? "",
  );
  const [publicPhone, setPublicPhone] = useState(
    coach?.publicContact.phone ?? "",
  );
  const [bookingUrl, setBookingUrl] = useState(
    coach?.publicContact.bookingUrl ?? "",
  );
  const [contactError, setContactError] = useState<string | null>(null);

  function toggleLevel(level: CoachLevel) {
    setLevels((current) =>
      current.includes(level)
        ? current.filter((item) => item !== level)
        : [...current, level],
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!publicEmail.trim() && !publicPhone.trim() && !bookingUrl.trim()) {
      setContactError("Add at least one public contact method.");
      return;
    }
    setContactError(null);
    const cleanLines = (value: string) =>
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    const cleanCommaList = (value: string) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    await onSubmit({
      ...(!coach ? { accountEmail: accountEmail.trim() } : {}),
      bio: bio.trim() || null,
      qualifications: cleanLines(qualifications),
      yearsExperience: yearsExperience ? Number(yearsExperience) : null,
      specialisations: cleanCommaList(specialisations),
      levels,
      availabilityNote: availabilityNote.trim() || null,
      publicEmail: publicEmail.trim() || null,
      publicPhone: publicPhone.trim() || null,
      bookingUrl: bookingUrl.trim() || null,
    });
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Drift account email">
            <Input
              type="email"
              required
              disabled={Boolean(coach)}
              value={accountEmail}
              onChange={(event) => setAccountEmail(event.target.value)}
            />
          </Field>
          <Field label="Years of coaching experience">
            <Input
              type="number"
              min={0}
              max={80}
              value={yearsExperience}
              onChange={(event) => setYearsExperience(event.target.value)}
            />
          </Field>
        </div>

        <Field label="Bio">
          <Textarea
            rows={5}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Coaching background and approach"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Qualifications — one per line">
            <Textarea
              rows={5}
              value={qualifications}
              onChange={(event) => setQualifications(event.target.value)}
            />
          </Field>
          <Field label="Specialisations — comma separated">
            <Textarea
              rows={5}
              value={specialisations}
              onChange={(event) => setSpecialisations(event.target.value)}
              placeholder="Juniors, serve technique, match play"
            />
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-drift-text-secondary">
            Player levels coached
          </legend>
          <div className="flex flex-wrap gap-3">
            {LEVELS.map((level) => (
              <label
                key={level.value}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-drift-border px-3 py-2 text-sm text-drift-text-primary"
              >
                <input
                  type="checkbox"
                  checked={levels.includes(level.value)}
                  onChange={() => toggleLevel(level.value)}
                  className="h-4 w-4 accent-drift-primary"
                />
                {level.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Availability">
          <Textarea
            rows={3}
            value={availabilityNote}
            onChange={(event) => setAvailabilityNote(event.target.value)}
            placeholder="e.g. Weekday evenings and Saturday mornings"
          />
        </Field>

        <div>
          <h2 className="font-display text-lg font-bold text-drift-text-primary">
            Public contact
          </h2>
          <p className="mt-1 text-sm text-drift-text-secondary">
            Only these details appear in the player app. Private account contact
            information is never exposed.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Public email">
            <Input
              type="email"
              value={publicEmail}
              onChange={(event) => setPublicEmail(event.target.value)}
            />
          </Field>
          <Field label="Public phone">
            <Input
              type="tel"
              value={publicPhone}
              onChange={(event) => setPublicPhone(event.target.value)}
            />
          </Field>
          <Field label="Booking URL">
            <Input
              type="url"
              placeholder="https://"
              value={bookingUrl}
              onChange={(event) => setBookingUrl(event.target.value)}
            />
          </Field>
        </div>
        {contactError && (
          <p className="text-sm font-medium text-drift-error" role="alert">
            {contactError}
          </p>
        )}

        <Button type="submit" disabled={saving} className="self-start">
          {saving ? "Saving…" : coach ? "Save coach" : "Add coach"}
        </Button>
      </form>
    </Card>
  );
}

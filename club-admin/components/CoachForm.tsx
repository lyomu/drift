"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { CoachPhotoUpload } from "@/components/CoachPhotoUpload";
import { PhoneNumberField } from "@/components/PhoneNumberField";
import { coachApi } from "@/lib/coach-api";
import { useClub } from "@/lib/club-context";
import type { CoachAdmin, CoachLevel } from "@/lib/types";
import { useT } from "@/lib/i18n/i18n-context";

function coachLevelOptions(t: ReturnType<typeof useT>): { value: CoachLevel; label: string }[] { return [
  { value: "BEGINNER", label: t("a.beginner") },
  { value: "INTERMEDIATE", label: t("a.intermediate") },
  { value: "ADVANCED", label: t("a.advanced") },
  { value: "COMPETITIVE", label: t("a.competitive") },
]; }

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

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-4">
        <h2 className="font-display text-base font-bold text-drift-text-primary">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[13px] text-drift-text-secondary">
            {description}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </Card>
  );
}

/**
 * Shared by the club console ("add a coach to my club", by account email) and
 * the coach workspace ("this is me"). The only structural difference is the
 * Drift-account field, which is meaningless when a coach is describing
 * themselves -- they are already signed in.
 */
export function CoachForm({
  coach,
  saving,
  onSubmit,
  mode = "club",
  submitLabel,
}: {
  coach?: CoachAdmin;
  saving: boolean;
  onSubmit: (payload: CoachFormPayload) => Promise<void>;
  mode?: "club" | "self";
  submitLabel?: string;
}) {
  const t = useT();
  const LEVELS = coachLevelOptions(t);
  const self = mode === "self";
  const { clubId } = useClub();
  const [photoUrl, setPhotoUrl] = useState(coach?.photoUrl ?? null);
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

  async function uploadPhoto(file: File) {
    if (self) {
      const res = await coachApi.uploadMyPhoto(file);
      setPhotoUrl(res.photoUrl);
    } else if (coach && clubId) {
      const res = await coachApi.uploadCoachPhoto(clubId, coach.id, file);
      setPhotoUrl(res.photoUrl);
    }
  }

  async function removePhoto() {
    if (self) {
      const res = await coachApi.deleteMyPhoto();
      setPhotoUrl(res.photoUrl);
    } else if (coach && clubId) {
      const res = await coachApi.deleteCoachPhoto(clubId, coach.id);
      setPhotoUrl(res.photoUrl);
    }
  }

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
      ...(!self && !coach ? { accountEmail: accountEmail.trim() } : {}),
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
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Section
        title={t("a.profile")}
        description={
          self
            ? t("a.coachIntroSelf")
            : t("a.coachIntroClub")
        }
      >
        {(self || coach) && (
          <CoachPhotoUpload
            photoUrl={photoUrl}
            onUpload={uploadPhoto}
            onRemove={removePhoto}
          />
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {!self && (
            <Field label={t("a.driftAccountEmail")}>
              <Input
                type="email"
                required
                disabled={Boolean(coach)}
                value={accountEmail}
                onChange={(event) => setAccountEmail(event.target.value)}
              />
            </Field>
          )}
          <Field label={t("a.yearsOfCoachingExperience")}>
            <Input
              type="number"
              min={0}
              max={80}
              value={yearsExperience}
              onChange={(event) => setYearsExperience(event.target.value)}
            />
          </Field>
        </div>
        <Field label={t("a.bio")}>
          <Textarea
            rows={5}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder={t("a.coachingBackgroundAndApproach")}
          />
        </Field>
      </Section>

      <Section
        title={t("a.coaching")}
        description={
          self
            ? t("a.coachTeachSelf")
            : t("a.coachTeachClub")
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t("a.qualificationsOnePerLine")}>
            <Textarea
              rows={5}
              value={qualifications}
              onChange={(event) => setQualifications(event.target.value)}
            />
          </Field>
          <Field label={t("a.specialisationsCommaSeparated")}>
            <Textarea
              rows={5}
              value={specialisations}
              onChange={(event) => setSpecialisations(event.target.value)}
              placeholder={t("a.juniorsServeTechniqueMatchPlay")}
            />
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-drift-text-secondary">{t("a.playerLevelsCoached")}</legend>
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
      </Section>

      <Section
        title={t("a.publicContact")}
        description={
          self
            ? t("a.coachContactSelf")
            : t("a.coachContactClub")
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label={t("a.publicEmail")}>
            <Input
              type="email"
              value={publicEmail}
              onChange={(event) => setPublicEmail(event.target.value)}
            />
          </Field>
          <Field label={t("a.publicPhone")}>
            <PhoneNumberField
              value={publicPhone}
              onChange={setPublicPhone}
              label={t("a.publicPhone")}
            />
          </Field>
          <Field label={t("a.bookingUrl")}>
            <Input
              type="url"
              placeholder="https://"
              value={bookingUrl}
              onChange={(event) => setBookingUrl(event.target.value)}
            />
          </Field>
        </div>
        <Field label={t("a.availability")}>
          <Textarea
            rows={3}
            value={availabilityNote}
            onChange={(event) => setAvailabilityNote(event.target.value)}
            placeholder={t("a.eGWeekdayEveningsAnd")}
          />
        </Field>
        {contactError && (
          <p className="text-sm font-medium text-drift-error" role="alert">
            {contactError}
          </p>
        )}
      </Section>

      <Button type="submit" disabled={saving} className="self-start">
        {saving
          ? t("common.saving")
          : (submitLabel ?? (coach ? t("a.saveCoach") : t("a.addCoach")))}
      </Button>
    </form>
  );
}

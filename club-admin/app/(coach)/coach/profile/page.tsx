"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  statusTone,
} from "@/components/ui";
import { CoachForm, type CoachFormPayload } from "@/components/CoachForm";
import { ApiError } from "@/lib/api-client";
import { coachApi } from "@/lib/coach-api";
import type { CoachAdmin } from "@/lib/types";

/**
 * The live listing, which only exists once an application is approved. Edits
 * here take effect immediately rather than re-entering review: an approved
 * coach correcting a phone number should not go dark for a day.
 */
export default function CoachProfilePage() {
  const [coach, setCoach] = useState<CoachAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setCoach(await coachApi.getProfile());
      } catch (err) {
        // A 404 is the ordinary state for an unapproved coach, not an error.
        if (err instanceof ApiError && err.status === 404) setMissing(true);
        else {
          setError(
            err instanceof ApiError ? err.message : "Something went wrong.",
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save(payload: CoachFormPayload) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      setCoach(
        await coachApi.updateProfile({
          bio: payload.bio,
          qualifications: payload.qualifications,
          yearsExperience: payload.yearsExperience,
          specialisations: payload.specialisations,
          levels: payload.levels,
          availabilityNote: payload.availabilityNote,
          publicEmail: payload.publicEmail,
          publicPhone: payload.publicPhone,
          bookingUrl: payload.bookingUrl,
        }),
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Public profile" />
        <EmptyState message="Loading…" />
      </>
    );
  }

  if (missing || !coach) {
    return (
      <>
        <PageHeader title="Public profile" />
        <ErrorBanner message={error} />
        <EmptyState
          icon="badge"
          title="No public profile yet"
          description="Your profile is created when your application is approved. Until then, your application is the place to edit your details."
          action={
            <Link href="/coach/application">
              <Button>Go to application</Button>
            </Link>
          }
        />
      </>
    );
  }

  const name =
    [coach.firstName, coach.lastName].filter(Boolean).join(" ") || "Your profile";

  return (
    <>
      <PageHeader
        title="Public profile"
        description="This is what players see in the Drift app. Changes take effect straight away."
        action={
          <Badge tone={statusTone(coach.verificationStatus)}>
            {coach.verificationStatus}
          </Badge>
        }
      />
      <ErrorBanner message={error} />

      <div className="mb-5">
        <Card>
          <h2 className="font-display text-base font-bold text-drift-text-primary">
            {name}
          </h2>
          <p className="mt-1 text-[13px] text-drift-text-secondary">
            {coach.clubs.length > 0
              ? `Listed at ${coach.clubs.map((club) => club.name).join(", ")}.`
              : "Not linked to a club."}
          </p>
          {saved && (
            <p className="mt-2 text-[13px] font-semibold text-drift-success">
              Profile saved. Players will see the update immediately.
            </p>
          )}
        </Card>
      </div>

      <CoachForm
        mode="self"
        coach={coach}
        saving={saving}
        onSubmit={save}
        submitLabel="Save profile"
      />
    </>
  );
}

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
import { useT } from "@/lib/i18n/i18n-context";

/**
 * The live listing, which only exists once an application is approved. Edits
 * here take effect immediately rather than re-entering review: an approved
 * coach correcting a phone number should not go dark for a day.
 */
export default function CoachProfilePage() {
  const t = useT();
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
            err instanceof ApiError ? err.message : t("a.somethingWentWrong"),
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

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
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title={t("a.publicProfile")} />
        <EmptyState message={t("a.loading")} />
      </>
    );
  }

  if (missing || !coach) {
    return (
      <>
        <PageHeader title={t("a.publicProfile")} />
        <ErrorBanner message={error} />
        <EmptyState
          icon="badge"
          title={t("a.noPublicProfileYet")}
          description={t("a.yourProfileIsCreatedWhen")}
          action={
            <Link href="/coach/application">
              <Button>{t("a.goToApplication")}</Button>
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
        title={t("a.publicProfile")}
        description={t("a.thisIsWhatPlayersSee")}
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
              : t("a.notLinkedClub")}
          </p>
          {saved && (
            <p className="mt-2 text-[13px] font-semibold text-drift-success">{t("a.profileSavedPlayersWillSee")}</p>
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { APPLICATION_COPY, coachApi } from "@/lib/coach-api";
import { useWorkspace } from "@/lib/workspace-context";
import type { CoachAdmin, CoachApplication } from "@/lib/types";

/**
 * The application draft is stored separately from the live profile, so this
 * page adapts it into the shape `CoachForm` already takes. Nothing about the
 * form needed to change beyond dropping the Drift-account field.
 */
function asFormValue(application: CoachApplication): CoachAdmin {
  return {
    id: application.id,
    userId: "",
    accountEmail: null,
    firstName: null,
    lastName: null,
    photoUrl: null,
    bio: application.bio,
    qualifications: application.qualifications,
    yearsExperience: application.yearsExperience,
    specialisations: application.specialisations,
    levels: application.levels,
    availabilityNote: application.availabilityNote,
    verificationStatus: "UNVERIFIED",
    clubs: [],
    publicContact: application.publicContact,
  };
}

export default function CoachApplicationPage() {
  const router = useRouter();
  const { refresh } = useWorkspace();
  const [application, setApplication] = useState<CoachApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await coachApi.getApplication();
        setApplication(res.application);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Something went wrong.",
        );
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
      const res = await coachApi.saveApplication({
        bio: payload.bio,
        qualifications: payload.qualifications,
        yearsExperience: payload.yearsExperience,
        specialisations: payload.specialisations,
        levels: payload.levels,
        availabilityNote: payload.availabilityNote,
        publicEmail: payload.publicEmail,
        publicPhone: payload.publicPhone,
        bookingUrl: payload.bookingUrl,
      });
      setApplication(res.application);
      setSaved(true);
      // A first save is what creates the coach context, so the shell needs to
      // hear about it or the sidebar stays blank until a reload.
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await coachApi.submitApplication();
      setApplication(res.application);
      await refresh();
      router.push("/coach");
    } catch (err) {
      // The completeness check lives on the server, so a missing-field message
      // arrives here as a 400 and is shown verbatim.
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Coach application" />
        <EmptyState message="Loading…" />
      </>
    );
  }

  const status = application?.status ?? "DRAFT";
  const copy = APPLICATION_COPY[status];
  const locked = status === "PENDING_REVIEW" || status === "APPROVED";

  return (
    <>
      <PageHeader
        title="Coach application"
        description="Players see this once your application is approved."
        action={<Badge tone={statusTone(status)}>{copy.label}</Badge>}
      />
      <ErrorBanner message={error} />

      <div className="mb-5">
        <Card>
          <p className="text-sm text-drift-text-secondary">{copy.blurb}</p>
          {application?.decisionReason && (
            <div className="mt-3 rounded-md border border-drift-border bg-drift-background px-4 py-3">
              <p className="text-[12px] font-bold uppercase tracking-wide text-drift-text-secondary">
                From the review team
              </p>
              <p className="mt-1 text-sm text-drift-text-primary">
                {application.decisionReason}
              </p>
            </div>
          )}
        </Card>
      </div>

      {locked ? (
        <EmptyState
          icon={status === "APPROVED" ? "verified" : "hourglass_top"}
          title={
            status === "APPROVED"
              ? "Your application is approved"
              : "Your application is with our review team"
          }
          description={
            status === "APPROVED"
              ? "Edit your live details on the public profile page instead — changes there take effect straight away."
              : "You will be able to edit it again once a reviewer responds."
          }
          action={
            status === "APPROVED" ? (
              <Button onClick={() => router.push("/coach/profile")}>
                Edit public profile
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          <CoachForm
            mode="self"
            coach={application ? asFormValue(application) : undefined}
            saving={saving}
            onSubmit={save}
            submitLabel="Save draft"
          />

          <Card>
            <h2 className="font-display text-base font-bold text-drift-text-primary">
              Submit for review
            </h2>
            <p className="mt-1 text-[13px] text-drift-text-secondary">
              Save your draft first. Once submitted you cannot edit it until a
              reviewer responds, and your profile stays hidden from players
              until it is approved.
            </p>
            {saved && (
              <p className="mt-2 text-[13px] font-semibold text-drift-success">
                Draft saved.
              </p>
            )}
            <Button
              className="mt-4 self-start"
              disabled={submitting || !application}
              onClick={submit}
            >
              {submitting ? "Submitting…" : "Submit for review"}
            </Button>
          </Card>
        </div>
      )}
    </>
  );
}

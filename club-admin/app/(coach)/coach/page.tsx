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
import { MaterialIcon } from "@/components/dashboard-design";
import { ApiError } from "@/lib/api-client";
import { APPLICATION_COPY, coachApi } from "@/lib/coach-api";
import { useWorkspace } from "@/lib/workspace-context";
import type { CoachApplication, CoachClub } from "@/lib/types";

export default function CoachOverviewPage() {
  const { refresh } = useWorkspace();
  const [application, setApplication] = useState<CoachApplication | null>(null);
  const [clubs, setClubs] = useState<CoachClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [app, mine] = await Promise.all([
          coachApi.getApplication(),
          // An unapproved coach has no profile yet, and the endpoint answers
          // with an empty list rather than a 404 — so this never needs to be
          // conditional on the application state.
          coachApi.myClubs(),
        ]);
        setApplication(app.application);
        setClubs(mine.clubs);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Something went wrong.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Keep the sidebar badge honest if the status moved since login.
    if (!loading) refresh();
  }, [loading, refresh]);

  if (loading) {
    return (
      <>
        <PageHeader title="Coach workspace" />
        <EmptyState message="Loading…" />
      </>
    );
  }

  if (!application) {
    return (
      <>
        <PageHeader
          title="Coach workspace"
          description="Apply once, and players can find you in the Drift app."
        />
        <ErrorBanner message={error} />
        <EmptyState
          icon="sports_tennis"
          title="Start your coach application"
          description="Tell players about your background, what you teach, and how to reach you. Our team reviews every application before a profile goes live."
          action={
            <Link href="/coach/application">
              <Button>Start application</Button>
            </Link>
          }
        />
      </>
    );
  }

  const copy = APPLICATION_COPY[application.status];
  const approved = application.status === "APPROVED";
  const editable =
    application.status === "DRAFT" ||
    application.status === "CHANGES_REQUESTED" ||
    application.status === "REJECTED";

  return (
    <>
      <PageHeader
        title="Coach workspace"
        description="Your application, your public profile, and the clubs you coach at."
        action={
          approved ? (
            <Link href="/coach/profile">
              <Button>Edit public profile</Button>
            </Link>
          ) : editable ? (
            <Link href="/coach/application">
              <Button>
                {application.status === "DRAFT"
                  ? "Continue application"
                  : "Update application"}
              </Button>
            </Link>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />

      <div className="flex flex-col gap-5">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-drift-text-primary">
                Application status
              </h2>
              <p className="mt-1 max-w-[560px] text-[13px] text-drift-text-secondary">
                {copy.blurb}
              </p>
            </div>
            <Badge tone={statusTone(application.status)}>{copy.label}</Badge>
          </div>

          {/* The reviewer's own words. A coach whose application came back
              cannot act on "changes requested" alone. */}
          {application.decisionReason && (
            <div className="mt-4 rounded-md border border-drift-border bg-drift-background px-4 py-3">
              <p className="text-[12px] font-bold uppercase tracking-wide text-drift-text-secondary">
                From the review team
              </p>
              <p className="mt-1 text-sm text-drift-text-primary">
                {application.decisionReason}
              </p>
            </div>
          )}

          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[12px] font-bold uppercase tracking-wide text-drift-text-secondary">
                Submitted
              </dt>
              <dd className="mt-0.5 text-sm text-drift-text-primary">
                {application.submittedAt
                  ? new Date(application.submittedAt).toLocaleDateString()
                  : "Not submitted yet"}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-bold uppercase tracking-wide text-drift-text-secondary">
                Reviewed
              </dt>
              <dd className="mt-0.5 text-sm text-drift-text-primary">
                {application.reviewedAt
                  ? new Date(application.reviewedAt).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="font-display text-base font-bold text-drift-text-primary">
            Visibility in the Drift app
          </h2>
          <div className="mt-3 flex items-start gap-2.5">
            <MaterialIcon
              name={approved ? "visibility" : "visibility_off"}
              className={`text-xl ${
                approved ? "text-drift-success" : "text-drift-text-secondary"
              }`}
            />
            <p className="text-sm text-drift-text-secondary">
              {approved
                ? "Players can find you under Coaches in Discover."
                : "Your profile is hidden from players until an application is approved."}
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-display text-base font-bold text-drift-text-primary">
              Clubs
            </h2>
            <Link
              href="/coach/clubs"
              className="text-[13px] font-extrabold text-drift-primary-dark hover:underline"
            >
              View all
            </Link>
          </div>
          {clubs.length === 0 ? (
            <p className="mt-2 text-sm text-drift-text-secondary">
              You are not linked to a club yet. A club administrator adds you
              from their own console.
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {clubs.map((club) => (
                <li
                  key={club.id}
                  className="rounded-full border border-drift-border px-3 py-1 text-[13px] font-semibold text-drift-text-primary"
                >
                  {club.name}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

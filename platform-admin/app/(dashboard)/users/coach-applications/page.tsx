"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Select,
  statusTone,
} from "@/components/ui";
import type {
  CoachApplicationDecision,
  CoachApplicationDetail,
  CoachApplicationStatus,
  CoachApplicationSummary,
} from "@/lib/coach-application-types";

type Filter = CoachApplicationStatus | "ALL";

function fullName(row: { firstName: string | null; lastName: string | null }) {
  return [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unnamed";
}

/**
 * The gate on public coach visibility. `GET /coaches` returns only VERIFIED
 * profiles, and the only thing that sets VERIFIED is an approval here — so
 * nothing reaches players in the app without passing through this page.
 */
export default function CoachApplicationsPage() {
  const [status, setStatus] = useState<Filter>("PENDING_REVIEW");
  const [rows, setRows] = useState<CoachApplicationSummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CoachApplicationDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const query = status === "ALL" ? "" : `?status=${status}`;
      const res = await api.get<{
        total: number;
        applications: CoachApplicationSummary[];
      }>(`/coach-applications${query}`);
      setRows(res.applications);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Coach applications could not be loaded.",
      );
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function open(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setError(null);
    try {
      const res = await api.get<{ application: CoachApplicationDetail }>(
        `/coach-applications/${id}`,
      );
      setDetail(res.application);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The application could not be loaded.",
      );
    }
  }

  async function decide(id: string, decision: CoachApplicationDecision) {
    let reason: string | undefined;
    if (decision !== "APPROVE") {
      // The coach reads this verbatim in their workspace, so it is required —
      // the server rejects a non-approval without one anyway.
      const entered = window.prompt(
        decision === "REJECT"
          ? "Why is this application being rejected? The coach sees this."
          : "What does the coach need to change? The coach sees this.",
      );
      if (entered === null) return;
      if (!entered.trim()) {
        setError("A reason is required for this decision.");
        return;
      }
      reason = entered.trim();
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ application: CoachApplicationDetail }>(
        `/coach-applications/${id}/decision`,
        { decision, reason },
      );
      setDetail(res.application);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The decision could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Coach applications"
        description="Coaches applying to be listed publicly. A profile only appears in the player app once it is approved here."
      />
      <ErrorBanner message={error} />

      <Card className="mb-5 max-w-sm p-4">
        <Select
          aria-label="Application status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as Filter);
            setRows(null);
            setOpenId(null);
            setDetail(null);
          }}
        >
          <option value="PENDING_REVIEW">Awaiting review</option>
          <option value="CHANGES_REQUESTED">Changes requested</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="DRAFT">Draft (not submitted)</option>
          <option value="ALL">All submitted</option>
        </Select>
      </Card>

      {rows === null && !error && (
        <EmptyState message="Loading coach applications..." />
      )}
      {rows?.length === 0 && (
        <EmptyState
          message={
            status === "PENDING_REVIEW"
              ? "No applications awaiting review"
              : "No applications match this status."
          }
        />
      )}

      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-4">
          {rows.map((row) => {
            const expanded = openId === row.id;
            return (
              <Card key={row.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold text-drift-text-primary">
                        {fullName(row)}
                      </h2>
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-drift-text-secondary">
                      {row.accountEmail ?? "no account email"}
                      {row.yearsExperience !== null &&
                        ` · ${row.yearsExperience} yrs experience`}
                    </p>
                    <p className="mt-2 text-sm text-drift-text-secondary">
                      {row.submittedAt
                        ? `Submitted ${new Date(row.submittedAt).toLocaleString()}`
                        : "Not submitted"}
                      {row.reviewedAt &&
                        ` · reviewed ${new Date(row.reviewedAt).toLocaleString()}`}
                    </p>
                    {row.specialisations.length > 0 && (
                      <p className="mt-2 text-sm text-drift-text-secondary">
                        {row.specialisations.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void open(row.id)}>
                      {expanded ? "Hide" : "Review"}
                    </Button>
                  </div>
                </div>

                {expanded && !detail && !error && (
                  <p className="mt-4 text-sm text-drift-text-secondary">
                    Loading application…
                  </p>
                )}

                {expanded && detail && detail.id === row.id && (
                  <div className="mt-5 border-t border-drift-border pt-5">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Detail label="Bio" value={detail.bio} />
                      <Detail
                        label="Qualifications"
                        value={detail.qualifications.join("\n")}
                      />
                      <Detail
                        label="Levels coached"
                        value={detail.levels.join(", ")}
                      />
                      <Detail
                        label="Availability"
                        value={detail.availabilityNote}
                      />
                      <Detail
                        label="Public contact"
                        value={[
                          detail.publicContact.email,
                          detail.publicContact.phone,
                          detail.publicContact.bookingUrl,
                        ]
                          .filter(Boolean)
                          .join("\n")}
                      />
                      <Detail
                        label="Account"
                        value={`${detail.accountStatus} · onboarding ${detail.onboardingStep}`}
                      />
                    </dl>

                    {detail.history.length > 0 && (
                      <div className="mt-5">
                        <h3 className="text-[12px] font-bold uppercase tracking-wide text-drift-text-secondary">
                          Decision history
                        </h3>
                        <ul className="mt-2 flex flex-col gap-1.5">
                          {detail.history.map((event) => (
                            <li
                              key={event.id}
                              className="text-[13px] text-drift-text-secondary"
                            >
                              {new Date(event.createdAt).toLocaleString()} ·{" "}
                              {event.previousStatus ?? "—"} → {event.nextStatus}
                              {event.actorAdminId ? " (admin)" : " (coach)"}
                              {event.note && ` · ${event.note}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {detail.status === "PENDING_REVIEW" ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button
                          variant="destructive"
                          disabled={busy}
                          onClick={() => void decide(detail.id, "REJECT")}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            void decide(detail.id, "REQUEST_CHANGES")
                          }
                        >
                          Request changes
                        </Button>
                        <Button
                          disabled={busy}
                          onClick={() => void decide(detail.id, "APPROVE")}
                        >
                          {busy ? "Saving..." : "Approve and publish"}
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-5 text-sm text-drift-text-secondary">
                        Already decided. Only an application awaiting review can
                        be actioned.
                        {detail.decisionReason &&
                          ` Reason given: ${detail.decisionReason}`}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[12px] font-bold uppercase tracking-wide text-drift-text-secondary">
        {label}
      </dt>
      <dd className="mt-0.5 whitespace-pre-line text-sm text-drift-text-primary">
        {value?.trim() ? value : "—"}
      </dd>
    </div>
  );
}

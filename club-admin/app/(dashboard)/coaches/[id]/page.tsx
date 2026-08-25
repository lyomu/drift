"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CoachForm, type CoachFormPayload } from "@/components/CoachForm";
import { ErrorBanner, PageHeader } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import type { CoachAdmin } from "@/lib/types";

export default function EditCoachPage() {
  const { id } = useParams<{ id: string }>();
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [coach, setCoach] = useState<CoachAdmin | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    api
      .get<CoachAdmin>(`/clubs/${clubId}/coaches/${id}`)
      .then((response) => {
        if (!cancelled) setCoach(response);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof ApiError ? reason.message : "Failed to load coach.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, id]);

  async function update(payload: CoachFormPayload) {
    if (!clubId || !canManage) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await api.patch<CoachAdmin>(
        `/clubs/${clubId}/coaches/${id}`,
        payload,
      );
      setCoach(response);
      setSaved(true);
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "Failed to save coach.",
      );
    } finally {
      setSaving(false);
    }
  }

  const name = coach
    ? [coach.firstName, coach.lastName].filter(Boolean).join(" ") || "Coach"
    : "Coach";

  return (
    <div>
      <PageHeader
        title={name}
        description={
          canManage
            ? "Edit the public coaching profile and contact details."
            : "Public coaching profile — read-only for your role."
        }
      />
      <ErrorBanner message={error} />
      {saved && (
        <p
          role="status"
          className="mb-4 rounded-md border border-drift-success/30 bg-drift-success/10 px-4 py-3 text-sm font-medium text-drift-success"
        >
          Coach profile saved.
        </p>
      )}
      {!coach ? (
        !error && <p className="text-sm text-drift-text-secondary">Loading…</p>
      ) : canManage ? (
        <CoachForm coach={coach} saving={saving} onSubmit={update} />
      ) : (
        <div className="rounded-lg border border-drift-border bg-drift-surface p-6">
          <p className="text-sm text-drift-text-secondary">
            {coach.bio || "No bio has been added."}
          </p>
          <dl className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="font-semibold text-drift-text-primary">Specialisations</dt>
              <dd className="text-drift-text-secondary">
                {coach.specialisations.join(", ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-drift-text-primary">Availability</dt>
              <dd className="text-drift-text-secondary">
                {coach.availabilityNote || "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CoachForm, type CoachFormPayload } from "@/components/CoachForm";
import { Button, Card, ErrorBanner, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { InitialsAvatar, MaterialIcon } from "@/components/dashboard-design";
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

  const contact = coach
    ? [
        coach.publicContact.email,
        coach.publicContact.phone,
        coach.publicContact.bookingUrl,
      ].filter(Boolean)
    : [];

  return (
    <div>
      <PageHeader
        title={name}
        description={
          canManage
            ? "Edit the public coaching profile and contact details."
            : "Public coaching profile — read-only for your role."
        }
        action={
          <Link href="/coaches">
            <Button variant="secondary">
              <MaterialIcon name="arrow_back" className="text-[16px]" />
              All coaches
            </Button>
          </Link>
        }
      />
      <ErrorBanner message={error} />
      {saved && (
        <p
          role="status"
          className="mb-4 rounded-md border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm font-medium text-drift-success"
        >
          Coach profile saved.
        </p>
      )}

      {!coach ? (
        !error && <p className="text-sm text-drift-text-secondary">Loading…</p>
      ) : (
        <div className="flex flex-col gap-5">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <InitialsAvatar name={name} className="h-14 w-14 text-[16px]" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="truncate text-xl font-extrabold text-drift-text-primary">
                      {name}
                    </h2>
                    <StatusBadge status={coach.verificationStatus} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-drift-text-secondary">
                    {coach.accountEmail ?? "No linked account email"}
                    {coach.yearsExperience != null &&
                      ` · ${coach.yearsExperience} yrs coaching`}
                  </p>
                  {coach.clubs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {coach.clubs.map((c) => (
                        <span
                          key={c.id}
                          className="rounded-full bg-drift-neutral-surface px-2.5 py-[3px] text-[11.5px] font-semibold text-drift-text-secondary"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {contact.length > 0 && (
                <div className="text-right text-[12.5px] text-drift-text-secondary">
                  <div className="font-bold uppercase">
                    Public contact
                  </div>
                  {contact.map((line) => (
                    <div key={line} className="mt-0.5 break-all">
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {canManage ? (
            <CoachForm coach={coach} saving={saving} onSubmit={update} />
          ) : (
            <Card>
              <p className="text-sm text-drift-text-secondary">
                {coach.bio || "No bio has been added."}
              </p>
              <dl className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="font-semibold text-drift-text-primary">
                    Specialisations
                  </dt>
                  <dd className="text-drift-text-secondary">
                    {coach.specialisations.join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-drift-text-primary">
                    Availability
                  </dt>
                  <dd className="text-drift-text-secondary">
                    {coach.availabilityNote || "—"}
                  </dd>
                </div>
              </dl>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

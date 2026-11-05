"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CoachForm, type CoachFormPayload } from "@/components/CoachForm";
import { Card, ErrorBanner } from "@/components/ui";
import { CoachHero } from "@/components/CoachHero";
import { BackButton } from "@/components/redesign";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import type { CoachAdmin } from "@/lib/types";
import { useT } from "@/lib/i18n/i18n-context";

export default function EditCoachPage() {
  const t = useT();
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
            reason instanceof ApiError ? reason.message : t("a.failedToLoadCoach"),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clubId, id, t]);

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
        reason instanceof ApiError ? reason.message : t("a.failedToSaveCoach"),
      );
    } finally {
      setSaving(false);
    }
  }

  const name = coach
    ? [coach.firstName, coach.lastName].filter(Boolean).join(" ") || t("a.coach")
    : t("a.coach");

  const contact = coach
    ? [
        coach.publicContact.email,
        coach.publicContact.phone,
        coach.publicContact.bookingUrl,
      ].filter(Boolean)
    : [];

  return (
    <div>
      <div className="mb-5">
        <BackButton href="/coaches">{t("a.allCoaches")}</BackButton>
      </div>
      <p className="mb-5 max-w-[590px] text-[13px] leading-[1.55] text-drift-text-secondary">
        {canManage ? t("a.editCoachDescription") : t("a.readOnlyCoachDescription")}
      </p>
      <ErrorBanner message={error} />
      {saved && (
        <p
          role="status"
          className="mb-4 rounded-md border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm font-medium text-drift-success"
        >{t("a.coachProfileSaved")}</p>
      )}

      {!coach ? (
        !error && <p className="text-sm text-drift-text-secondary">{t("a.loading")}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <CoachHero
            name={name}
            verification={coach.verificationStatus}
            subtitle={[
              coach.accountEmail ?? t("a.noLinkedAccountEmail"),
              coach.yearsExperience != null ? t("cch.years", { count: coach.yearsExperience }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            tags={[...coach.clubs.map((c) => c.name), ...coach.specialisations].slice(0, 5)}
            aside={
              contact.length > 0 ? (
                <div className="max-w-[240px]">
                  <div className="text-[11px] font-bold uppercase text-white/80">{t("a.publicContact")}</div>
                  {contact.map((line) => (
                    <div key={line} className="mt-0.5 break-all font-semibold">
                      {line}
                    </div>
                  ))}
                </div>
              ) : undefined
            }
          />

          {canManage ? (
            <CoachForm coach={coach} saving={saving} onSubmit={update} />
          ) : (
            <Card>
              <p className="text-sm text-drift-text-secondary">
                {coach.bio || t("cch.noBio")}
              </p>
              <dl className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="font-semibold text-drift-text-primary">{t("a.specialisations")}</dt>
                  <dd className="text-drift-text-secondary">
                    {coach.specialisations.join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-drift-text-primary">{t("a.availability")}</dt>
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

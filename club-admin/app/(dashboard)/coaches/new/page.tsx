"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CoachForm, type CoachFormPayload } from "@/components/CoachForm";
import { ErrorBanner, PageHeader } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { useT } from "@/lib/i18n/i18n-context";

export default function NewCoachPage() {
  const t = useT();
  const router = useRouter();
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(payload: CoachFormPayload) {
    if (!clubId || !canManage) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/clubs/${clubId}/coaches`, payload);
      router.push("/coaches");
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : t("a.failedToAddCoach"),
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <div>
        <PageHeader title={t("a.addCoach")} />
        <ErrorBanner message={t("a.onlyClubOwnersAndAdmins")} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("a.addCoach")}
        description={t("a.linkAnExistingOnboardedDrift")}
      />
      <ErrorBanner message={error} />
      <CoachForm saving={saving} onSubmit={create} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CoachForm, type CoachFormPayload } from "@/components/CoachForm";
import { ErrorBanner, PageHeader } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";

export default function NewCoachPage() {
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
        reason instanceof ApiError ? reason.message : "Failed to add coach.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Add coach" />
        <ErrorBanner message="Only club owners and admins can add coaches." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Add coach"
        description="Link an existing, onboarded Drift account and publish its coaching profile."
      />
      <ErrorBanner message={error} />
      <CoachForm saving={saving} onSubmit={create} />
    </div>
  );
}

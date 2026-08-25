"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import type { ClubProfile } from "@/lib/types";

export default function SettingsPage() {
  const { clubId, role: myRole, refresh } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [club, setClub] = useState<ClubProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    website: "",
    openingHoursNote: "",
  });

  useEffect(() => {
    if (!clubId) return;
    api.get<ClubProfile>(`/clubs/${clubId}`).then((res) => {
      setClub(res);
      setForm({
        name: res.name ?? "",
        description: res.description ?? "",
        address: res.address ?? "",
        phone: res.phone ?? "",
        website: res.website ?? "",
        openingHoursNote: res.openingHoursNote ?? "",
      });
      setLoading(false);
    });
  }, [clubId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/clubs/${clubId}`, form);
      const refreshed = await api.get<ClubProfile>(`/clubs/${clubId}`);
      setClub(refreshed);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVerificationRequest() {
    if (!clubId) return;
    setError(null);
    setRequesting(true);
    try {
      const res = await api.post<{ verificationStatus: string }>(
        `/clubs/${clubId}/verification-request`,
      );
      setClub((prev) =>
        prev ? { ...prev, verificationStatus: res.verificationStatus as ClubProfile["verificationStatus"] } : prev,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setRequesting(false);
    }
  }

  if (loading) return <p className="text-sm text-drift-text-secondary">Loading…</p>;

  return (
    <div>
      <PageHeader
        title="Club Settings"
        description="Your club's public profile."
        action={
          myRole === "OWNER" ? (
            <Link href="/billing">
              <Button variant="secondary">Manage billing</Button>
            </Link>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-drift-text-secondary">
            Verification
          </div>
          <div className="mt-1">
            {club && <StatusBadge status={club.verificationStatus} />}
          </div>
        </div>
        {canManage && club?.verificationStatus === "UNVERIFIED" && (
          <Button
            variant="secondary"
            onClick={handleVerificationRequest}
            disabled={requesting}
          >
            {requesting ? "Submitting…" : "Submit verification request"}
          </Button>
        )}
      </Card>

      <Card>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Field label="Club name">
            <Input
              disabled={!canManage}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              disabled={!canManage}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Address">
            <Input
              disabled={!canManage}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <Input
                disabled={!canManage}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Website">
              <Input
                disabled={!canManage}
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Opening hours note">
            <Input
              disabled={!canManage}
              value={form.openingHoursNote}
              onChange={(e) =>
                setForm({ ...form, openingHoursNote: e.target.value })
              }
            />
          </Field>
          {canManage && (
            <Button type="submit" disabled={saving} className="mt-2 self-start">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          )}
        </form>
      </Card>
    </div>
  );
}

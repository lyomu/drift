"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconChip, MaterialIcon, Panel, SectionTitle } from "@/components/dashboard-design";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
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
      const res = await api.post<{ verificationStatus: string }>(`/clubs/${clubId}/verification-request`);
      setClub((prev) =>
        prev ? { ...prev, verificationStatus: res.verificationStatus as ClubProfile["verificationStatus"] } : prev,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setRequesting(false);
    }
  }

  if (loading) return <EmptyState message="Loading..." />;

  return (
    <div>
      <PageHeader
        title="Club settings"
        description="Maintain your public club profile and verification details."
        action={
          myRole === "OWNER" ? (
            <Link href="/billing">
              <Button variant="secondary">
                <MaterialIcon name="credit_card" className="text-[18px]" />
                Manage billing
              </Button>
            </Link>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Panel>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <SectionTitle title="Public profile" />
            <Field label="Club name">
              <Input
                disabled={!canManage}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={4}
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
                onChange={(e) => setForm({ ...form, openingHoursNote: e.target.value })}
              />
            </Field>
            {canManage && (
              <Button type="submit" disabled={saving} className="mt-2 self-start">
                <MaterialIcon name="save" className="text-[18px]" />
                {saving ? "Saving..." : "Save changes"}
              </Button>
            )}
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <div className="flex items-start gap-3">
              <IconChip
                icon={club?.verificationStatus === "VERIFIED" ? "verified" : "domain_verification"}
                tone={club?.verificationStatus === "VERIFIED" ? "success" : "warning"}
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold uppercase tracking-[0.4px] text-drift-text-secondary">
                  Verification
                </div>
                <div className="mt-2">
                  {club && <StatusBadge status={club.verificationStatus} />}
                </div>
                <p className="mt-3 text-sm leading-6 text-drift-text-secondary">
                  Verified clubs receive stronger trust signals across public Drift surfaces.
                </p>
              </div>
            </div>
            {canManage && club?.verificationStatus === "UNVERIFIED" && (
              <Button
                variant="secondary"
                onClick={handleVerificationRequest}
                disabled={requesting}
                className="mt-5 w-full"
              >
                {requesting ? "Submitting..." : "Submit verification request"}
              </Button>
            )}
          </Panel>

          <Panel>
            <SectionTitle title="Access level" />
            <div className="mt-4 flex items-center gap-3">
              <IconChip icon="admin_panel_settings" tone="neutral" />
              <div>
                <div className="text-sm font-bold text-drift-text-primary">
                  {myRole?.replaceAll("_", " ") ?? "No role assigned"}
                </div>
                <div className="mt-1 text-xs text-drift-text-secondary">
                  {canManage ? "Profile editing is enabled." : "Profile editing is read-only."}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

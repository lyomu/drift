"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, ErrorBanner, Field, Input, PageHeader } from "@/components/ui";
import { CourtGroupsEditor } from "@/components/CourtGroupsEditor";
import type { CourtGroup, CourtProfile } from "@/lib/types";

export default function EditCourtPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { clubId } = useClub();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    address: "",
    mapsUrl: "",
    phone: "",
    website: "",
  });
  const [groups, setGroups] = useState<CourtGroup[]>([]);

  useEffect(() => {
    api.get<CourtProfile>(`/courts/${id}`).then((res) => {
      setForm({
        name: res.name,
        address: res.address ?? "",
        mapsUrl: res.mapsUrl ?? "",
        phone: res.phone ?? "",
        website: res.website ?? "",
      });
      setGroups(res.courtGroups);
      setLoading(false);
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/clubs/${clubId}/courts/${id}`, {
        ...form,
        courtGroups: groups,
      });
      router.push("/courts");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-drift-text-secondary">Loading…</p>;

  return (
    <div>
      <PageHeader title="Edit court" />
      <ErrorBanner message={error} />
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Name">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Address / Location">
            <Input
              value={form.address}
              placeholder="Street, area, city"
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <Field label="Google Maps link (optional)">
            <Input
              type="url"
              inputMode="url"
              placeholder="https://maps.google.com/…"
              value={form.mapsUrl}
              onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Website">
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </Field>
          </div>
          <CourtGroupsEditor groups={groups} onChange={setGroups} />
          <Button type="submit" disabled={saving} className="self-start">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

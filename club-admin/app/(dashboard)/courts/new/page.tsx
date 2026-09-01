"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, ErrorBanner, Field, Input, PageHeader } from "@/components/ui";
import { CourtGroupsEditor } from "@/components/CourtGroupsEditor";
import type { CourtGroup } from "@/lib/types";

export default function NewCourtPage() {
  const router = useRouter();
  const { clubId } = useClub();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [groups, setGroups] = useState<CourtGroup[]>([
    { surface: "HARD", indoor: false, lighting: false, count: 1 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    setError(null);
    setSaving(true);
    try {
      await api.post(`/clubs/${clubId}/courts`, {
        name,
        address: address || undefined,
        mapsUrl: mapsUrl.trim() || undefined,
        courtGroups: groups,
      });
      router.push("/courts");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="New court" />
      <ErrorBanner message={error} />
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Address / Location">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, city" />
          </Field>
          <Field label="Google Maps link (optional)">
            <Input type="url" inputMode="url" placeholder="https://maps.google.com/…" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} />
          </Field>
          <CourtGroupsEditor groups={groups} onChange={setGroups} />
          <Button type="submit" disabled={saving} className="self-start">
            {saving ? "Creating…" : "Create court"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

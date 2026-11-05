"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, ErrorBanner, Field, Input, PageHeader } from "@/components/ui";
import { BackButton, SegmentControl } from "@/components/redesign";
import { CourtBookingSettings } from "@/components/CourtBookingSettings";
import { CourtGroupsEditor } from "@/components/CourtGroupsEditor";
import { CourtPhotoUpload } from "@/components/CourtPhotoUpload";
import type { CourtGroup, CourtProfile } from "@/lib/types";
import { useT } from "@/lib/i18n/i18n-context";

export default function EditCourtPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { clubId } = useClub();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"details" | "booking">("details");

  const [form, setForm] = useState({
    name: "",
    address: "",
    mapsUrl: "",
    phone: "",
    website: "",
  });
  const [groups, setGroups] = useState<CourtGroup[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

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
      setPhotoUrls(res.photoUrls ?? []);
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
        photoUrls,
        courtGroups: groups,
      });
      router.push("/courts");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-drift-text-secondary">{t("a.loading")}</p>;

  return (
    <div>
      <div className="mb-5">
        <BackButton href="/courts">{t("ct.backAll")}</BackButton>
      </div>
      <PageHeader eyebrow={t("nav.operations")} title={t("a.editCourt")} />
      <div className="mb-5">
        <SegmentControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "details", label: t("bk.tabDetails") },
            { value: "booking", label: t("bk.tabBooking") },
          ]}
        />
      </div>
      <ErrorBanner message={error} />
      {tab === "booking" && clubId && <CourtBookingSettings clubId={clubId} courtId={id} />}
      {tab === "details" && (
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label={t("a.name")}>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label={t("a.addressLocation")}>
            <Input
              value={form.address}
              placeholder={t("a.streetAreaCity")}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <Field label={t("a.googleMapsLinkOptional")}>
            <Input
              type="url"
              inputMode="url"
              placeholder="https://maps.google.com/…"
              value={form.mapsUrl}
              onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("a.phone")}>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label={t("a.website")}>
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </Field>
          </div>
          {clubId && (
            <CourtPhotoUpload clubId={clubId} photoUrls={photoUrls} onChange={setPhotoUrls} />
          )}
          <CourtGroupsEditor groups={groups} onChange={setGroups} />
          <Button type="submit" disabled={saving} className="self-start">
            {saving ? t("common.saving") : t("a.saveChanges")}
          </Button>
        </form>
      </Card>
      )}
    </div>
  );
}

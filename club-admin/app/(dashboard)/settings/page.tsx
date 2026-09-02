"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SectionTitle } from "@/components/dashboard-design";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import type { ClubProfile, MatchSport, MediaAsset } from "@/lib/types";

const TABS = ["Profile", "Branding", "Booking & Policies", "Danger zone"] as const;
type Tab = (typeof TABS)[number];

const SPORTS: { value: MatchSport; label: string }[] = [
  { value: "TENNIS", label: "Tennis" },
  { value: "PADEL", label: "Padel" },
];

export default function SettingsPage() {
  const { clubId, role: myRole, refresh } = useClub();
  const router = useRouter();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  const [club, setClub] = useState<ClubProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [tab, setTab] = useState<Tab>("Profile");

  const [form, setForm] = useState({
    name: "",
    sports: ["TENNIS"] as MatchSport[],
    description: "",
    address: "",
    phone: "",
    website: "",
    openingHoursNote: "",
    amenities: [] as string[],
    photoUrls: [] as string[],
  });
  const [amenityDraft, setAmenityDraft] = useState("");

  // Branding tab — club photos are uploaded into the club's media store.
  const [media, setMedia] = useState<MediaAsset[] | null>(null);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const mediaUrlsRef = useRef<Record<string, string>>({});
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async () => {
    if (!clubId) return;
    try {
      const res = await api.get<{ assets: MediaAsset[] }>(`/clubs/${clubId}/media`);
      setMedia(res.assets);
      const pairs = await Promise.all(
        res.assets.map(
          async (a) =>
            [
              a.id,
              URL.createObjectURL(
                await api.blob(`/clubs/${clubId}/media/${a.id}/content`),
              ),
            ] as const,
        ),
      );
      Object.values(mediaUrlsRef.current).forEach(URL.revokeObjectURL);
      const next = Object.fromEntries(pairs);
      mediaUrlsRef.current = next;
      setMediaUrls(next);
    } catch (err) {
      setMediaError(
        err instanceof ApiError ? err.message : "Photos could not be loaded.",
      );
    }
  }, [clubId]);

  useEffect(() => {
    void loadMedia();
    return () => {
      Object.values(mediaUrlsRef.current).forEach(URL.revokeObjectURL);
    };
  }, [loadMedia]);

  async function uploadPhoto(file: File | null | undefined) {
    if (!clubId || !file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setMediaError("Choose a PNG or JPG image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMediaError("That image is over 5MB.");
      return;
    }
    setMediaBusy(true);
    setMediaError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.upload(`/clubs/${clubId}/media`, fd);
      await loadMedia();
    } catch (err) {
      setMediaError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setMediaBusy(false);
    }
  }

  async function deletePhoto(id: string) {
    if (!clubId) return;
    try {
      await api.delete(`/clubs/${clubId}/media/${id}`);
      await loadMedia();
    } catch (err) {
      setMediaError(
        err instanceof ApiError ? err.message : "The photo could not be deleted.",
      );
    }
  }

  function hydrate(res: ClubProfile) {
    setClub(res);
    setForm({
      name: res.name ?? "",
      sports: res.sports?.length ? res.sports : ["TENNIS"],
      description: res.description ?? "",
      address: res.address ?? "",
      phone: res.phone ?? "",
      website: res.website ?? "",
      openingHoursNote: res.openingHoursNote ?? "",
      amenities: res.amenities ?? [],
      photoUrls: res.photoUrls ?? [],
    });
  }

  useEffect(() => {
    if (!clubId) return;
    api
      .get<ClubProfile>(`/clubs/${clubId}`)
      .then((res) => {
        hydrate(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Club could not be loaded.");
        setLoading(false);
      });
  }, [clubId]);

  async function save(patch: Partial<typeof form>) {
    if (!clubId) return;
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await api.patch(`/clubs/${clubId}`, patch);
      const refreshed = await api.get<ClubProfile>(`/clubs/${clubId}`);
      hydrate(refreshed);
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    await save({
      name: form.name,
      sports: form.sports,
      description: form.description,
      address: form.address,
      phone: form.phone,
      website: form.website,
      openingHoursNote: form.openingHoursNote,
    });
  }

  async function requestVerification() {
    if (!clubId) return;
    setError(null);
    setRequesting(true);
    try {
      const res = await api.post<{ verificationStatus: string }>(
        `/clubs/${clubId}/verification-request`,
      );
      setClub((prev) =>
        prev
          ? {
              ...prev,
              verificationStatus: res.verificationStatus as ClubProfile["verificationStatus"],
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setRequesting(false);
    }
  }

  async function leaveClub() {
    if (!clubId) return;
    if (!window.confirm("Leave this club? You'll lose admin access immediately.")) {
      return;
    }
    setError(null);
    setLeaving(true);
    try {
      await api.delete(`/clubs/${clubId}/join`);
      await refresh();
      router.push("/");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "You could not leave this club.",
      );
      setLeaving(false);
    }
  }

  function toggleSport(sport: MatchSport) {
    setForm((f) => ({
      ...f,
      sports: f.sports.includes(sport)
        ? f.sports.filter((s) => s !== sport)
        : [...f.sports, sport],
    }));
  }

  if (loading) return <EmptyState message="Loading..." />;

  return (
    <div>
      <PageHeader
        title="Club Settings"
        description="Your club's public profile."
        action={
          myRole === "OWNER" ? (
            <Link href="/billing">
              <Button>Manage billing</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap gap-1 border-b border-drift-border">
        {TABS.map((t) => {
          const active = tab === t;
          const danger = t === "Danger zone";
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-bold transition-colors ${
                active
                  ? danger
                    ? "border-b-2 border-drift-error text-drift-error"
                    : "border-b-2 border-drift-primary text-drift-primary"
                  : danger
                    ? "text-drift-error/70 hover:text-drift-error"
                    : "text-drift-text-secondary hover:text-drift-text-primary"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      <ErrorBanner message={error} />
      {saved && (
        <p
          role="status"
          className="mb-4 rounded-md border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm font-medium text-drift-success"
        >
          Changes saved.
        </p>
      )}

      {tab === "Profile" && (
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase text-drift-text-secondary">
                  Verification
                </div>
                <div className="mt-2">
                  {club && (
                    <Badge
                      tone={
                        club.verificationStatus === "VERIFIED"
                          ? "success"
                          : club.verificationStatus === "PENDING"
                            ? "info"
                            : "warning"
                      }
                    >
                      {club.verificationStatus}
                    </Badge>
                  )}
                </div>
              </div>
              {canManage && club?.verificationStatus === "UNVERIFIED" && (
                <Button
                  variant="secondary"
                  onClick={requestVerification}
                  disabled={requesting}
                >
                  {requesting ? "Submitting..." : "Submit verification request"}
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <form onSubmit={saveProfile} className="flex flex-col gap-5">
              <SectionTitle title="Club identity" />

              <Field label="Club name">
                <Input
                  disabled={!canManage}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>

              <div>
                <span className="mb-1.5 block text-[13px] font-semibold text-drift-text-secondary">
                  Sports offered
                </span>
                <div className="flex flex-wrap gap-3">
                  {SPORTS.map((sport) => {
                    const on = form.sports.includes(sport.value);
                    return (
                      <label
                        key={sport.value}
                        className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors ${
                          on
                            ? "border-drift-primary bg-drift-primary-light text-drift-primary"
                            : "border-drift-border text-drift-text-primary"
                        } ${!canManage ? "pointer-events-none opacity-60" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-drift-primary"
                          checked={on}
                          disabled={!canManage}
                          onChange={() => toggleSport(sport.value)}
                        />
                        {sport.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <Field label="Description">
                <Textarea
                  rows={4}
                  disabled={!canManage}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </Field>

              <Field label="Address">
                <Input
                  disabled={!canManage}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                    onChange={(e) =>
                      setForm({ ...form, website: e.target.value })
                    }
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
                <Button type="submit" disabled={saving} className="self-start">
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              )}
            </form>
          </Card>
        </div>
      )}

      {tab === "Branding" && (
        <Card>
          <SectionTitle title="Club photos" />
          <p className="mt-1 max-w-[560px] text-sm text-drift-text-secondary">
            Public imagery shown on your club profile. These are the same
            images as your{" "}
            <Link
              href="/media"
              className="font-semibold text-drift-primary hover:underline"
            >
              Media library
            </Link>
            .
          </p>

          <ErrorBanner message={mediaError} />

          {canManage && (
            <input
              ref={photoInput}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                void uploadPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          )}

          {canManage && (
            <div
              onClick={() => !mediaBusy && photoInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void uploadPhoto(e.dataTransfer.files?.[0]);
              }}
              className={`mt-5 flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
                dragging
                  ? "border-drift-primary bg-drift-primary-light"
                  : "border-drift-border bg-drift-primary-light/40"
              }`}
            >
              <span className="text-sm font-bold text-drift-text-primary">
                {mediaBusy ? "Uploading…" : "Drop an image or click to browse"}
              </span>
              <span className="text-[12.5px] text-drift-text-secondary">
                PNG or JPG, up to 5MB
              </span>
            </div>
          )}

          {media === null ? (
            <p className="mt-5 text-sm text-drift-text-secondary">Loading…</p>
          ) : media.length === 0 ? (
            <p className="mt-5 text-sm text-drift-text-secondary">
              No photos yet.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {media.map((asset) => (
                <div
                  key={asset.id}
                  className="relative overflow-hidden rounded-xl border border-drift-border bg-drift-primary-light"
                >
                  <div className="aspect-[4/3]">
                    {mediaUrls[asset.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrls[asset.id]}
                        alt={asset.caption ?? asset.filename}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      aria-label={`Delete ${asset.caption || asset.filename}`}
                      onClick={() => void deletePhoto(asset.id)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-drift-surface text-drift-error shadow-[0_1px_4px_rgba(15,23,42,0.15)] hover:bg-drift-error-surface"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "Booking & Policies" && (
        <div className="flex flex-col gap-6">
          <Card>
            <SectionTitle title="Facilities & amenities" />
            <p className="mt-1 text-sm text-drift-text-secondary">
              Shown on your public profile so players know what to expect on site.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {form.amenities.length === 0 && (
                <p className="text-sm text-drift-text-secondary">
                  No amenities listed.
                </p>
              )}
              {form.amenities.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-2 rounded-full bg-drift-neutral-surface px-3 py-1.5 text-[13px] font-semibold text-drift-text-primary"
                >
                  {a}
                  {canManage && (
                    <button
                      type="button"
                      aria-label={`Remove ${a}`}
                      onClick={() =>
                        save({ amenities: form.amenities.filter((x) => x !== a) })
                      }
                      className="text-drift-text-secondary hover:text-drift-error"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            {canManage && (
              <form
                className="mt-4 flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = amenityDraft.trim();
                  if (!value || form.amenities.includes(value)) return;
                  setAmenityDraft("");
                  void save({ amenities: [...form.amenities, value] });
                }}
              >
                <Field label="Add an amenity">
                  <Input
                    placeholder="e.g. Floodlights, Parking, Café"
                    value={amenityDraft}
                    onChange={(e) => setAmenityDraft(e.target.value)}
                    className="sm:w-[320px]"
                  />
                </Field>
                <Button type="submit" variant="secondary" disabled={saving}>
                  Add
                </Button>
              </form>
            )}
          </Card>

          <Card>
            <SectionTitle title="Court booking" />
            <p className="mt-1 text-sm text-drift-text-secondary">
              Booking links and policies are configured per court. Manage them on
              the{" "}
              <Link
                href="/courts"
                className="font-semibold text-drift-primary hover:underline"
              >
                Courts
              </Link>{" "}
              page.
            </p>
          </Card>
        </div>
      )}

      {tab === "Danger zone" && (
        <Card className="border-drift-error/30">
          <SectionTitle title="Danger zone" />
          {myRole === "OWNER" ? (
            <p className="mt-2 text-sm text-drift-text-secondary">
              You&apos;re the club owner. Closing a club or transferring
              ownership is handled by Drift support — contact us from the{" "}
              <Link
                href="/settings/contact-support"
                className="font-semibold text-drift-primary hover:underline"
              >
                support
              </Link>{" "}
              page.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-drift-text-secondary">
                Leaving removes your admin access to this club immediately. An
                owner or admin would need to re-invite you.
              </p>
              <Button
                variant="destructive"
                onClick={leaveClub}
                disabled={leaving}
                className="mt-4"
              >
                {leaving ? "Leaving…" : "Leave this club"}
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

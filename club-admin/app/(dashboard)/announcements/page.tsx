"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { IconChip, MaterialIcon, ModalShell } from "@/components/dashboard-design";
import { ManagementCard } from "@/components/redesign";
import type { Announcement, AnnouncementAudience } from "@/lib/types";
import { useT } from "@/lib/i18n/i18n-context";

function audiences(t: ReturnType<typeof useT>): { value: AnnouncementAudience; label: string; hint: string }[] { return [
  { value: "EVERYONE", label: t("a.everyone"), hint: t("a.allActiveMembers") },
  { value: "MEMBERS", label: t("a.members"), hint: t("a.regularMembersOnly") },
  { value: "COACHES", label: t("a.coaches"), hint: t("a.membersWithTheCoachRole") },
  { value: "ADMINS", label: t("a.adminsManagers"), hint: t("a.ownerAdminAndManagerRoles") },
]; }

export default function AnnouncementsPage() {
  const t = useT();
  const AUDIENCES = audiences(t);
  const audienceLabel = (a: AnnouncementAudience) => AUDIENCES.find((x) => x.value === a)?.label ?? a;
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    body: string;
    pinned: boolean;
    audience: AnnouncementAudience;
  }>({ title: "", body: "", pinned: false, audience: "EVERYONE" });
  const publishIntent = useRef(false);

  async function load() {
    if (!clubId) return;
    const res = await api.get<{ announcements: Announcement[] }>(
      `/clubs/${clubId}/announcements`,
    );
    setAnnouncements(res.announcements);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  async function handleCreate(e: React.FormEvent, publish: boolean) {
    e.preventDefault();
    if (!clubId) return;
    setError(null);
    setCreating(true);
    try {
      await api.post(`/clubs/${clubId}/announcements`, {
        title: form.title,
        body: form.body,
        pinned: form.pinned,
        audience: form.audience,
        status: publish ? "PUBLISHED" : "DRAFT",
      });
      setForm({ title: "", body: "", pinned: false, audience: "EVERYONE" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    } finally {
      setCreating(false);
    }
  }

  async function handlePublish(a: Announcement) {
    if (!clubId) return;
    setError(null);
    try {
      await api.patch(`/clubs/${clubId}/announcements/${a.id}`, {
        status: a.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    }
  }

  async function handlePin(a: Announcement) {
    if (!clubId) return;
    setError(null);
    try {
      await api.patch(`/clubs/${clubId}/announcements/${a.id}`, {
        pinned: !a.pinned,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("a.somethingWentWrong"));
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={t("nav.community")}
        title={t("a.announcements")}
        description={t("a.publishedAnnouncementsSurfaceOnMembers")}
        action={
          canManage && (
            <Button onClick={() => setShowForm(true)}>
              <MaterialIcon name="add" className="text-[19px]" />
              {t("a.newAnnouncement")}
            </Button>
          )
        }
      />
      <ErrorBanner message={error} />

      {loading ? (
        <EmptyState message={t("a.loading2")} />
      ) : announcements.length === 0 ? (
        <EmptyState message={t("a.noAnnouncementsYet")} />
      ) : (
        <ManagementCard
          title={t("an.latest")}
          subtitle={t("an.count", { count: announcements.length })}
        >
          <div className="flex flex-col px-3 py-2">
            {announcements.map((a, index) => (
              <article
                key={a.id}
                className={`rounded-xl px-3 py-4 ${
                  a.pinned
                    ? "border border-drift-primary/25 bg-drift-primary-light/60"
                    : index < announcements.length - 1
                      ? "border-b border-drift-border"
                      : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <IconChip icon={a.pinned ? "push_pin" : "campaign"} tone={a.status === "PUBLISHED" ? "lime" : "neutral"} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[14px] font-extrabold text-drift-text-primary">{a.title}</h2>
                        <StatusBadge status={a.status} />
                        <span className="inline-flex items-center gap-1 rounded-full bg-drift-neutral-surface px-2.5 py-1 text-[11px] font-semibold text-drift-text-secondary">
                          <MaterialIcon name="group" className="text-[13px]" />
                          {audienceLabel(a.audience)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-6 text-drift-text-secondary">{a.body}</p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => void handlePin(a)}>
                        <MaterialIcon name="push_pin" className="text-[15px]" />
                        {a.pinned ? t("a.unpin") : t("a.pin")}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => void handlePublish(a)}>
                        {a.status === "PUBLISHED" ? t("a.unpublish") : t("a.publish")}
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </ManagementCard>
      )}

      {showForm && (
        <ModalShell title={t("a.newAnnouncement")} onClose={() => setShowForm(false)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => handleCreate(e, publishIntent.current)}
          >
            <Field label={t("a.title")}>
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label={t("a.body")}>
              <Textarea
                required
                rows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </Field>
            <Field label={t("a.sendTo")}>
              <Select
                value={form.audience}
                onChange={(e) =>
                  setForm({
                    ...form,
                    audience: e.target.value as AnnouncementAudience,
                  })
                }
              >
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label} — {a.hint}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-drift-text-primary">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
              />
              {t("an.pinToTop")}
            </label>
            <div className="mt-2 flex justify-end gap-3">
              <Button
                type="submit"
                disabled={creating}
                onClick={() => {
                  publishIntent.current = false;
                }}
                variant="secondary"
              >
                {t("a.saveDraft")}
              </Button>
              <Button
                type="submit"
                disabled={creating}
                onClick={() => {
                  publishIntent.current = true;
                }}
              >
                {creating ? t("a.publishing") : t("a.publish")}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

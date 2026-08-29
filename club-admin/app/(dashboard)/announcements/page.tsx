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
  Textarea,
} from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { MaterialIcon, ModalShell, Panel } from "@/components/dashboard-design";
import type { Announcement } from "@/lib/types";

export default function AnnouncementsPage() {
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });
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
        status: publish ? "PUBLISHED" : "DRAFT",
      });
      setForm({ title: "", body: "", pinned: false });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
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
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
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
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Published announcements surface on members' mobile Home feed."
        action={
          canManage && (
            <Button onClick={() => setShowForm(true)}>New announcement</Button>
          )
        }
      />
      <ErrorBanner message={error} />

      {loading ? (
        <EmptyState message="Loading..." />
      ) : announcements.length === 0 ? (
        <EmptyState message="No announcements yet." />
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <Panel key={a.id}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[14.5px] font-bold text-drift-text-primary">
                      {a.title}
                    </h2>
                    {a.pinned && (
                      <MaterialIcon name="push_pin" filled className="text-[17px] text-drift-primary" />
                    )}
                    <StatusBadge status={a.status} />
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => void handlePin(a)}
                      className="text-[13px] font-semibold text-drift-text-secondary hover:text-drift-text-primary"
                    >
                      {a.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handlePublish(a)}
                      className="text-[13px] font-semibold text-drift-primary hover:text-drift-primary-dark"
                    >
                      {a.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm leading-6 text-drift-text-secondary">{a.body}</p>
            </Panel>
          ))}
        </div>
      )}

      {showForm && (
        <ModalShell title="New announcement" onClose={() => setShowForm(false)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => handleCreate(e, publishIntent.current)}
          >
            <Field label="Title">
              <Input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Body">
              <Textarea
                required
                rows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-drift-text-primary">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
              />
              Pin to top
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
                Save as draft
              </Button>
              <Button
                type="submit"
                disabled={creating}
                onClick={() => {
                  publishIntent.current = true;
                }}
              >
                {creating ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

"use client";

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
import { EmptyState } from "@/components/ui";
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

  async function load() {
    if (!clubId) return;
    const res = await api.get<{ announcements: Announcement[] }>(
      `/clubs/${clubId}/announcements`,
    );
    setAnnouncements(res.announcements);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        description="Authored here; there's no Club Feed in the mobile app yet to display these."
        action={
          canManage && (
            <Button onClick={() => setShowForm((s) => !s)}>
              {showForm ? "Cancel" : "New announcement"}
            </Button>
          )
        }
      />
      <ErrorBanner message={error} />

      {showForm && (
        <Card className="mb-6">
          <form className="flex flex-col gap-4">
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
            <label className="flex items-center gap-2 text-sm text-drift-text-primary">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
              />
              Pin to top
            </label>
            <div className="flex gap-3">
              <Button
                disabled={creating}
                onClick={(e) => handleCreate(e, false)}
                variant="secondary"
              >
                Save as draft
              </Button>
              <Button disabled={creating} onClick={(e) => handleCreate(e, true)}>
                Publish
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-drift-text-secondary">Loading…</p>
      ) : announcements.length === 0 ? (
        <EmptyState message="No announcements yet." />
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-drift-text-primary">
                      {a.title}
                    </span>
                    {a.pinned && <StatusBadge status="PINNED" />}
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-3">
                    <button
                      onClick={() => handlePin(a)}
                      className="text-sm font-semibold text-drift-text-secondary hover:underline"
                    >
                      {a.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      onClick={() => handlePublish(a)}
                      className="text-sm font-semibold text-drift-primary hover:underline"
                    >
                      {a.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-drift-text-secondary">{a.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

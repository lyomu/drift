"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Select,
  statusTone,
} from "@/components/ui";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  drawSize: number;
  state: string;
  registrationClosesAt: string;
  _count?: { entries: number };
}

export default function TournamentsPage() {
  const [rows, setRows] = useState<Tournament[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [drawSize, setDrawSize] = useState(8);
  const [closesAt, setClosesAt] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ tournaments: Tournament[] }>(
        "/clubs/tournaments?clubId=current",
      );
      setRows(res.tournaments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load tournaments.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !closesAt) return;
    setBusy(true);
    try {
      await api.post("/clubs/tournaments", {
        name: name.trim(),
        description: description.trim() || undefined,
        drawSize,
        registrationClosesAt: new Date(closesAt).toISOString(),
      });
      setName(""); setDescription(""); setClosesAt("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  async function generateDraw(id: string) {
    setBusy(true);
    try {
      await api.post(`/clubs/tournaments/${id}/generate-draw`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Draw generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (!window.confirm("Cancel this tournament?")) return;
    setBusy(true);
    try {
      await api.patch(`/clubs/tournaments/${id}/cancel`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cancel failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Tournaments"
        description="Single-elimination knockout draws. Generate the draw once registration closes; results advance automatically."
        action={
          <Button onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "New tournament"}
          </Button>
        }
      />
      <ErrorBanner message={error} />

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={create} className="flex flex-wrap items-end gap-3">
            <Field label="Name">
              <Input required value={name} onChange={(e) => setName(e.target.value)} className="min-w-[200px]" />
            </Field>
            <Field label="Description">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="min-w-[240px]" />
            </Field>
            <Field label="Draw size">
              <Select value={drawSize} onChange={(e) => setDrawSize(Number(e.target.value))} className="w-28">
                <option value={4}>4</option>
                <option value={8}>8</option>
                <option value={16}>16</option>
                <option value={32}>32</option>
              </Select>
            </Field>
            <Field label="Registration closes">
              <Input type="datetime-local" required value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
            </Field>
            <Button type="submit" disabled={busy}>Create</Button>
          </form>
        </Card>
      )}

      {rows === null && !error && <EmptyState message="Loading…" />}
      {rows?.length === 0 && <EmptyState message="No tournaments yet." />}

      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-3">
          {rows.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-drift-text-primary">{t.name}</span>
                  <Badge tone={statusTone(t.state)}>{t.state}</Badge>
                </div>
                <div className="mt-0.5 text-xs text-drift-text-secondary">
                  {t._count?.entries ?? 0}/{t.drawSize} entries · closes{" "}
                  {new Date(t.registrationClosesAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                {(t.state === "REGISTRATION_OPEN" || t.state === "DRAFT") && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => generateDraw(t.id)}
                  >
                    Generate draw
                  </Button>
                )}
                {t.state !== "COMPLETED" && t.state !== "CANCELLED" && (
                  <Button variant="ghost" disabled={busy} onClick={() => cancel(t.id)}>
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

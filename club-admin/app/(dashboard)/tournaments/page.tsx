"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, ErrorBanner, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { IconChip, ModalShell } from "@/components/dashboard-design";
import { Listing } from "@/components/Listing";

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
  const { clubId } = useClub();
  const [rows, setRows] = useState<Tournament[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [drawSize, setDrawSize] = useState(8);
  const [closesAt, setClosesAt] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      setError(null);
      const res = await api.get<{ tournaments: Tournament[] }>(
        `/clubs/${clubId}/tournaments`,
      );
      setRows(res.tournaments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load tournaments.");
    }
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId || !name.trim() || !closesAt) return;
    setBusy(true);
    try {
      await api.post(`/clubs/${clubId}/tournaments`, {
        name: name.trim(),
        description: description.trim() || undefined,
        drawSize,
        registrationClosesAt: new Date(closesAt).toISOString(),
      });
      setName("");
      setDescription("");
      setClosesAt("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  async function generateDraw(id: string) {
    if (!clubId) return;
    setBusy(true);
    try {
      await api.post(`/clubs/${clubId}/tournaments/${id}/generate-draw`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Draw generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (!clubId || !window.confirm("Cancel this tournament?")) return;
    setBusy(true);
    try {
      await api.patch(`/clubs/${clubId}/tournaments/${id}/cancel`);
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
        description="Single-elimination knockout draws. Generate the draw once registration closes."
        action={<Button onClick={() => setShowForm(true)}>New tournament</Button>}
      />
      <ErrorBanner message={error} />

      <Listing
        title="Tournaments"
        count={rows?.length ?? null}
        loading={rows === null && !error}
        empty={{
          icon: "grid_view",
          title: "No tournaments yet",
          description:
            "Set up a single-elimination knockout draw and generate the bracket once registration closes.",
          action: <Button onClick={() => setShowForm(true)}>New tournament</Button>,
        }}
      >
        {rows?.map((tournament) => (
            <div
              key={tournament.id}
              className="rowcard flex flex-wrap items-center gap-4 rounded-lg border border-drift-border bg-drift-surface px-5 py-[18px] transition-colors"
            >
              <IconChip icon="grid_view" tone="success" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14.5px] font-bold text-drift-text-primary">
                    {tournament.name}
                  </span>
                  <StatusBadge status={tournament.state} />
                </div>
                <div className="mt-1 text-[12.5px] text-drift-text-secondary">
                  {tournament._count?.entries ?? 0}/{tournament.drawSize} entries / closes{" "}
                  {new Date(tournament.registrationClosesAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/tournaments/${tournament.id}`}>
                  <Button variant="secondary">Manage draw</Button>
                </Link>
                {(tournament.state === "REGISTRATION_OPEN" ||
                  tournament.state === "DRAFT") && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void generateDraw(tournament.id)}
                  >
                    Generate draw
                  </Button>
                )}
                {tournament.state !== "COMPLETED" &&
                  tournament.state !== "CANCELLED" && (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void cancel(tournament.id)}
                    >
                      Cancel
                    </Button>
                  )}
              </div>
            </div>
        ))}
      </Listing>

      {showForm && (
        <ModalShell title="New tournament" onClose={() => setShowForm(false)}>
          <form onSubmit={create} className="flex flex-col gap-4">
            <Field label="Name">
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Description">
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Draw size">
                <Select value={drawSize} onChange={(e) => setDrawSize(Number(e.target.value))}>
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                </Select>
              </Field>
              <Field label="Registration closes">
                <Input
                  type="datetime-local"
                  required
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                />
              </Field>
            </div>
            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Creating..." : "Create tournament"}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

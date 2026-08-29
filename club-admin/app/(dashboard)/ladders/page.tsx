"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, EmptyState, ErrorBanner, Field, Input, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { MaterialIcon, ModalShell, Panel } from "@/components/dashboard-design";
import type { LadderAdmin } from "@/lib/types";

export default function LaddersPage() {
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [ladders, setLadders] = useState<LadderAdmin[] | null>(null);
  const [selected, setSelected] = useState<LadderAdmin | null>(null);
  const [name, setName] = useState("");
  const [range, setRange] = useState("2");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    try {
      const response = await api.get<{ ladders: LadderAdmin[] }>(
        `/clubs/${clubId}/ladders`,
      );
      setLadders(response.ladders);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ladders could not be loaded.");
    }
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    try {
      await api.post(`/clubs/${clubId}/ladders`, {
        name,
        challengeRange: Number(range),
      });
      setName("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The ladder could not be created.");
    }
  }

  async function open(id: string) {
    if (!clubId) return;
    try {
      const res = await api.get<{ ladder: LadderAdmin }>(
        `/clubs/${clubId}/ladders/${id}`,
      );
      setSelected(res.ladder);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The ladder could not be opened.");
    }
  }

  function move(index: number, direction: -1 | 1) {
    if (!selected?.entries) return;
    const next = [...selected.entries];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSelected({
      ...selected,
      entries: next.map((entry, i) => ({ ...entry, position: i + 1 })),
    });
  }

  async function saveOrder() {
    if (!clubId || !selected?.entries) return;
    try {
      await api.patch(`/clubs/${clubId}/ladders/${selected.id}/positions`, {
        entries: selected.entries.map((entry) => ({
          entryId: entry.id,
          position: entry.position,
        })),
      });
      await open(selected.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Positions could not be saved.");
    }
  }

  async function archive() {
    if (!clubId || !selected) return;
    try {
      await api.patch(`/clubs/${clubId}/ladders/${selected.id}/archive`);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The ladder could not be archived.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Ladder management"
        description="Create rolling ladders and adjust positions when an administrative ruling requires it."
        action={
          canManage ? (
            <Button onClick={() => setShowForm(true)}>Create ladder</Button>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />
      {ladders === null ? (
        <EmptyState message="Loading..." />
      ) : ladders.length === 0 ? (
        <EmptyState message="Create your first ladder" />
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
          <div className="flex flex-col gap-2.5">
            {ladders.map((ladder) => (
              <button
                type="button"
                key={ladder.id}
                onClick={() => void open(ladder.id)}
                className={`rowcard rounded-[14px] border bg-drift-surface p-4 text-left transition-colors ${
                  selected?.id === ladder.id ? "border-drift-primary" : "border-drift-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-bold text-drift-text-primary">
                    {ladder.name}
                  </span>
                  <StatusBadge status={ladder.state} />
                </div>
                <div className="mt-1 text-[12.5px] text-drift-text-secondary">
                  {ladder._count?.entries ?? 0} players / challenge {ladder.challengeRange} rungs
                </div>
              </button>
            ))}
          </div>
          <div>
            {!selected ? (
              <EmptyState message="Select a ladder to manage its positions." />
            ) : (
              <Panel>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-drift-text-primary">
                      {selected.name}
                    </h2>
                    <p className="mt-0.5 text-[12.5px] text-drift-text-secondary">
                      Rung 1 is the top position.
                    </p>
                  </div>
                  {canManage && (
                    <Button variant="ghost" onClick={() => void archive()}>
                      Archive
                    </Button>
                  )}
                </div>
                {!selected.entries?.length ? (
                  <EmptyState message="Members join this ladder from the Drift app." />
                ) : (
                  <div className="flex flex-col gap-2">
                    {selected.entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 rounded-xl border border-drift-border px-3 py-2.5"
                      >
                        <span className="w-7 shrink-0 text-center text-base font-extrabold text-drift-primary tabular">
                          {entry.position}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-bold text-drift-text-primary">
                            {`${entry.user.firstName ?? ""} ${entry.user.lastName ?? ""}`.trim() || "Player"}
                          </div>
                          <div className="text-xs text-drift-text-secondary">
                            {entry.wins} wins / {entry.losses} losses
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => move(index, -1)}
                              aria-label="Move up"
                              className="text-drift-text-secondary disabled:opacity-30"
                            >
                              <MaterialIcon name="arrow_upward" className="text-lg" />
                            </button>
                            <button
                              type="button"
                              disabled={index === selected.entries!.length - 1}
                              onClick={() => move(index, 1)}
                              aria-label="Move down"
                              className="text-drift-text-secondary disabled:opacity-30"
                            >
                              <MaterialIcon name="arrow_downward" className="text-lg" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {canManage && (
                      <Button onClick={() => void saveOrder()} className="mt-3 self-start">
                        Save positions
                      </Button>
                    )}
                  </div>
                )}
              </Panel>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <ModalShell title="Create ladder" onClose={() => setShowForm(false)}>
          <form onSubmit={create} className="flex flex-col gap-4">
            <Field label="Ladder name">
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Challenge range">
              <Input
                type="number"
                min={1}
                max={10}
                value={range}
                onChange={(e) => setRange(e.target.value)}
              />
            </Field>
            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Create ladder</Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

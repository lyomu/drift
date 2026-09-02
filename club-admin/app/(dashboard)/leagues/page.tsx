"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, EmptyState, ErrorBanner, Field, Input, Select, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import { IconChip, ModalShell } from "@/components/dashboard-design";
import { RichTextEditor } from "@/components/RichTextEditor";
import type { LeagueSummary, MatchFormat, MatchSport } from "@/lib/types";

type LeagueForm = {
  name: string;
  description: string;
  sport: MatchSport;
  format: MatchFormat;
  registrationOpensAt: string;
  registrationClosesAt: string;
  startsAt: string;
  roundCount: number;
  capacity: string;
  rulesText: string;
};

const EMPTY_FORM: LeagueForm = {
  name: "",
  description: "",
  sport: "TENNIS",
  format: "SINGLES",
  registrationOpensAt: "",
  registrationClosesAt: "",
  startsAt: "",
  roundCount: 4,
  capacity: "",
  rulesText: "",
};

export default function LeaguesPage() {
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<LeagueForm>(EMPTY_FORM);

  async function load() {
    if (!clubId) return;
    const res = await api.get<{ leagues: LeagueSummary[] }>(
      `/clubs/${clubId}/leagues`,
    );
    setLeagues(res.leagues);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    setError(null);
    const opens = new Date(form.registrationOpensAt);
    const closes = new Date(form.registrationClosesAt);
    const starts = new Date(form.startsAt);
    if (opens >= closes) {
      setError("Registration must open before it closes.");
      return;
    }
    if (closes > starts) {
      setError("Registration must close on or before the league starts.");
      return;
    }
    setCreating(true);
    try {
      await api.post(`/clubs/${clubId}/leagues`, {
        name: form.name,
        description: form.description || undefined,
        sport: form.sport,
        format: form.format,
        registrationOpensAt: opens.toISOString(),
        registrationClosesAt: closes.toISOString(),
        startsAt: starts.toISOString(),
        roundCount: Number(form.roundCount),
        capacity: form.capacity ? Number(form.capacity) : undefined,
        rulesText: form.rulesText || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageTitle
        action={
          canManage ? (
            <Button onClick={() => setShowForm(true)}>New league</Button>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />

      {loading ? (
        <EmptyState message="Loading..." />
      ) : leagues.length === 0 ? (
        <EmptyState message="Create your first league" />
      ) : (
        <div className="flex flex-col gap-3">
          {leagues.map((league) => (
            <Link href={`/leagues/${league.id}`} key={league.id}>
              <div className="rowcard flex items-center gap-4 rounded-lg border border-drift-border bg-drift-surface px-5 py-[18px] transition-colors">
                <IconChip
                  icon={league.sport === "PADEL" ? "groups" : "sports_tennis"}
                  tone="info"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-bold text-drift-text-primary">
                    {league.name}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-drift-text-secondary">
                    {league.sport.replace("_", " ")} / {league.format.replace("_", " ")} /{" "}
                    {league.enrolledCount} enrolled
                    {league.roundCount ? ` / ${league.roundCount} rounds` : ""}
                  </div>
                </div>
                <StatusBadge status={league.competitionState} />
                <span className="shrink-0 text-[13px] font-semibold text-drift-primary">
                  Manage
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <ModalShell title="New league" size="lg" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field label="League name">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Sport">
                <Select
                  value={form.sport}
                  onChange={(e) =>
                    setForm({ ...form, sport: e.target.value as MatchSport })
                  }
                >
                  <option value="TENNIS">Tennis</option>
                  <option value="PADEL">Padel</option>
                </Select>
              </Field>
              <Field label="Format">
                <Select
                  value={form.format}
                  onChange={(e) =>
                    setForm({ ...form, format: e.target.value as MatchFormat })
                  }
                >
                  <option value="SINGLES">Singles</option>
                  <option value="DOUBLES">Doubles</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Registration opens">
                <Input
                  type="datetime-local"
                  required
                  value={form.registrationOpensAt}
                  onChange={(e) =>
                    setForm({ ...form, registrationOpensAt: e.target.value })
                  }
                />
              </Field>
              <Field label="Registration closes">
                <Input
                  type="datetime-local"
                  required
                  value={form.registrationClosesAt}
                  onChange={(e) =>
                    setForm({ ...form, registrationClosesAt: e.target.value })
                  }
                />
              </Field>
              <Field label="League starts">
                <Input
                  type="datetime-local"
                  required
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Number of rounds">
                <Input
                  type="number"
                  min={1}
                  max={52}
                  required
                  value={form.roundCount}
                  onChange={(e) =>
                    setForm({ ...form, roundCount: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Capacity (optional)">
                <Input
                  type="number"
                  min={2}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Rules">
              <RichTextEditor
                value={form.rulesText}
                onChange={(html) => setForm({ ...form, rulesText: html })}
                placeholder="Scoring, scheduling, conduct — anything players should know before they register."
              />
            </Field>
            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create league"}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

function PageTitle({ action }: { action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[26px] font-extrabold leading-8 text-drift-text-primary">
          Leagues
        </h1>
        <p className="mt-1 max-w-[560px] text-sm text-drift-text-secondary">
          Create and manage your club competitions.
        </p>
      </div>
      {action}
    </div>
  );
}

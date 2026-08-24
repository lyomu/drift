"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import type { LeagueSummary, LeagueState } from "@/lib/types";

export default function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [league, setLeague] = useState<LeagueSummary & { state?: LeagueState } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [creatingSeason, setCreatingSeason] = useState(false);
  const [seasonForm, setSeasonForm] = useState({
    label: "",
    registrationOpensAt: "",
    registrationClosesAt: "",
    startsAt: "",
    roundCount: 4,
    capacity: "",
  });

  async function load() {
    const res = await api.get<LeagueSummary & { state?: LeagueState }>(
      `/leagues/${id}`,
    );
    setLeague(res);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStateChange(state: LeagueState) {
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/leagues/${id}`, { state });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSeason(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatingSeason(true);
    try {
      await api.post(`/leagues/${id}/seasons`, {
        label: seasonForm.label,
        registrationOpensAt: new Date(seasonForm.registrationOpensAt).toISOString(),
        registrationClosesAt: new Date(
          seasonForm.registrationClosesAt,
        ).toISOString(),
        startsAt: new Date(seasonForm.startsAt).toISOString(),
        roundCount: Number(seasonForm.roundCount),
        capacity: seasonForm.capacity ? Number(seasonForm.capacity) : undefined,
      });
      setShowSeasonForm(false);
      setSeasonForm({
        label: "",
        registrationOpensAt: "",
        registrationClosesAt: "",
        startsAt: "",
        roundCount: 4,
        capacity: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setCreatingSeason(false);
    }
  }

  if (loading || !league) {
    return <p className="text-sm text-drift-text-secondary">Loading…</p>;
  }

  return (
    <div>
      <PageHeader
        title={league.name}
        description={`${league.sport} · ${league.format}`}
        action={
          canManage && (
            <Select
              value={league.state ?? "DRAFT"}
              disabled={saving}
              onChange={(e) => handleStateChange(e.target.value as LeagueState)}
              className="w-40"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          )
        }
      />
      <ErrorBanner message={error} />

      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-drift-text-primary">
          Seasons
        </h2>
        {canManage && (
          <Button
            variant="secondary"
            onClick={() => setShowSeasonForm((s) => !s)}
          >
            {showSeasonForm ? "Cancel" : "New season"}
          </Button>
        )}
      </div>

      {showSeasonForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreateSeason} className="flex flex-col gap-4">
            <Field label="Label">
              <Input
                required
                value={seasonForm.label}
                onChange={(e) =>
                  setSeasonForm({ ...seasonForm, label: e.target.value })
                }
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Registration opens">
                <Input
                  type="datetime-local"
                  required
                  value={seasonForm.registrationOpensAt}
                  onChange={(e) =>
                    setSeasonForm({
                      ...seasonForm,
                      registrationOpensAt: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Registration closes">
                <Input
                  type="datetime-local"
                  required
                  value={seasonForm.registrationClosesAt}
                  onChange={(e) =>
                    setSeasonForm({
                      ...seasonForm,
                      registrationClosesAt: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Starts">
                <Input
                  type="datetime-local"
                  required
                  value={seasonForm.startsAt}
                  onChange={(e) =>
                    setSeasonForm({ ...seasonForm, startsAt: e.target.value })
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
                  value={seasonForm.roundCount}
                  onChange={(e) =>
                    setSeasonForm({ ...seasonForm, roundCount: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Capacity (optional)">
                <Input
                  type="number"
                  min={2}
                  value={seasonForm.capacity}
                  onChange={(e) =>
                    setSeasonForm({ ...seasonForm, capacity: e.target.value })
                  }
                />
              </Field>
            </div>
            <Button type="submit" disabled={creatingSeason} className="self-start">
              {creatingSeason ? "Creating…" : "Create season"}
            </Button>
          </form>
        </Card>
      )}

      {league.seasons.length === 0 ? (
        <p className="text-sm text-drift-text-secondary">No seasons yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {league.seasons.map((s) => (
            <Link key={s.id} href={`/leagues/${id}/seasons/${s.id}`}>
              <Card className="flex items-center justify-between transition-colors hover:border-drift-primary">
                <span className="font-semibold text-drift-text-primary">
                  {s.label}
                </span>
                <span className="text-sm text-drift-primary">Manage →</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

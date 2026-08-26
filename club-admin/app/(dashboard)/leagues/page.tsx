"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import { Button, Card, ErrorBanner, Field, Input, PageHeader, Select } from "@/components/ui";
import { DataTable } from "@/components/DataTable";
import type { LeagueSummary, MatchFormat, MatchSport } from "@/lib/types";

export default function LeaguesPage() {
  const { clubId, role: myRole } = useClub();
  const canManage = myRole === "OWNER" || myRole === "ADMIN";
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    sport: "TENNIS" as MatchSport,
    format: "SINGLES" as MatchFormat,
  });

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
    setCreating(true);
    try {
      await api.post(`/clubs/${clubId}/leagues`, {
        name: form.name,
        description: form.description || undefined,
        sport: form.sport,
        format: form.format,
      });
      setForm({ name: "", description: "", sport: "TENNIS", format: "SINGLES" });
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
      <PageHeader
        title="Leagues"
        description="Create and manage your club's competitions."
        action={
          canManage && (
            <Button onClick={() => setShowForm((s) => !s)}>
              {showForm ? "Cancel" : "New league"}
            </Button>
          )
        }
      />
      <ErrorBanner message={error} />

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field label="League name">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <Input
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
            <Button type="submit" disabled={creating} className="self-start">
              {creating ? "Creating…" : "Create league"}
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-drift-text-secondary">Loading…</p>
      ) : (
        <DataTable
          rows={leagues}
          rowKey={(l) => l.id}
          emptyMessage="No leagues yet."
          columns={[
            {
              header: "Name",
              cell: (l) => (
                <Link
                  href={`/leagues/${l.id}`}
                  className="font-semibold text-drift-primary hover:underline"
                >
                  {l.name}
                </Link>
              ),
            },
            { header: "Sport", cell: (l) => l.sport },
            { header: "Format", cell: (l) => l.format },
            { header: "Seasons", cell: (l) => l.seasons.length },
          ]}
        />
      )}
    </div>
  );
}

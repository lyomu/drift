"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ActionLink, StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import type { CompetitionListResponse, CompetitionSummary } from "@/lib/competition-types";
import { DataTable } from "@/components/DataTable";
import { Badge, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, statusTone } from "@/components/ui";

function label(value: string | null) {
  return value ? value.replaceAll("_", " ") : "n/a";
}

function routeType(type: string) {
  return type.toLowerCase();
}

export default function CompetitionsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [sport, setSport] = useState("");
  const [state, setState] = useState("");
  const [rows, setRows] = useState<CompetitionSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [totalsByType, setTotalsByType] = useState({ leagues: 0, tournaments: 0, ladders: 0 });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ take: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (type) params.set("type", type);
      if (sport) params.set("sport", sport);
      if (state) params.set("state", state);
      const response = await api.get<CompetitionListResponse>(`/competitions?${params.toString()}`);
      setRows(response.competitions);
      setTotal(response.total);
      setTotalsByType(response.totalsByType);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Competitions could not be loaded.");
    }
  }, [search, sport, state, type]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Global Competitions"
        description="Cross-club league, tournament, and ladder oversight."
        action={<ActionLink href="/competitions/rulesets" icon="rule" variant="primary">Rulesets</ActionLink>}
      />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "Leagues", value: totalsByType.leagues, icon: "calendar_view_week" },
          { label: "Tournaments", value: totalsByType.tournaments, icon: "emoji_events", tone: "green" },
          { label: "Ladders", value: totalsByType.ladders, icon: "leaderboard", tone: "amber" },
        ]}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_170px_160px_190px]">
          <Field label="Search"><Input aria-label="Search competitions" placeholder="Search competition or club..." value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
          <Field label="Type"><Select aria-label="Competition type" value={type} onChange={(event) => setType(event.target.value)}><option value="">Any type</option><option value="LEAGUE">League</option><option value="TOURNAMENT">Tournament</option><option value="LADDER">Ladder</option></Select></Field>
          <Field label="Sport"><Select aria-label="Sport" value={sport} onChange={(event) => setSport(event.target.value)}><option value="">Any sport</option><option value="TENNIS">Tennis</option><option value="PADEL">Padel</option></Select></Field>
          <Field label="State"><Select aria-label="Competition state" value={state} onChange={(event) => setState(event.target.value)}><option value="">Any state</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="REGISTRATION_OPEN">Registration open</option><option value="RUNNING">Running</option><option value="COMPLETED">Completed</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option><option value="CANCELLED">Cancelled</option></Select></Field>
        </div>
      </Card>

      {rows === null && !error && <EmptyState message="Loading competitions..." />}
      {rows?.length === 0 && <EmptyState message="No competitions match these filters." />}
      {rows && rows.length > 0 && (
        <div>
          <DataTable
            rows={rows}
            rowKey={(competition) => `${competition.type}-${competition.id}`}
            columns={[
              {
                header: "Competition",
                cell: (competition) => (
                  <div className="min-w-0">
                    <Link
                      href={`/competitions/${routeType(competition.type)}/${competition.id}`}
                      className="font-bold text-drift-primary hover:underline"
                    >
                      {competition.name}
                    </Link>
                    <div className="truncate text-xs text-drift-text-secondary" title={competition.description ?? undefined}>
                      {competition.description ?? "No description"}
                    </div>
                  </div>
                ),
              },
              {
                header: "Type",
                cell: (competition) => <Badge tone="info">{label(competition.type)}</Badge>,
              },
              {
                header: "Owner",
                cell: (competition) => (
                  <div>
                    {competition.club ? (
                      <Link href={`/organizations/${competition.club.id}`} className="font-bold text-drift-primary hover:underline">
                        {competition.club.name}
                      </Link>
                    ) : (
                      <span className="text-drift-text-secondary">Platform-run</span>
                    )}
                    <div className="mt-1 text-xs font-semibold text-drift-text-secondary">
                      {label(competition.sport)} / {label(competition.format)}
                    </div>
                  </div>
                ),
              },
              {
                header: "State",
                cell: (competition) => <Badge tone={statusTone(competition.state)}>{label(competition.state)}</Badge>,
              },
              {
                header: "Activity",
                cell: (competition) => (
                  <div className="text-xs font-semibold text-drift-text-secondary">
                    <div>{competition.primaryCountLabel}: {competition.primaryCount}</div>
                    <div>{competition.secondaryCountLabel}: {competition.secondaryCount}</div>
                  </div>
                ),
              },
              {
                header: "Action",
                className: "text-right",
                cell: (competition) => (
                  <Link href={`/competitions/${routeType(competition.type)}/${competition.id}`} className="font-bold text-drift-primary hover:underline">
                    Open
                  </Link>
                ),
              },
            ]}
          />
          <div className="px-1 text-xs font-semibold text-drift-text-secondary">Showing {rows.length} of {total}</div>
        </div>
      )}
    </div>
  );
}

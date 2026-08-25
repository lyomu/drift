"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { CompetitionListResponse, CompetitionSummary } from "@/lib/competition-types";
import { Badge, Card, EmptyState, ErrorBanner, Input, PageHeader, Select, Td, Th, statusTone } from "@/components/ui";

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

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <PageHeader
        title="Global Competitions"
        description="Cross-club league, tournament, and ladder oversight."
        action={<Link href="/competitions/rulesets" className="rounded-md bg-drift-primary px-4 py-2 text-sm font-semibold text-white hover:bg-drift-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary">Rulesets</Link>}
      />
      <ErrorBanner message={error} />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase text-drift-text-secondary">Leagues</div>
          <div className="mt-1 text-2xl font-bold text-drift-text-primary">{totalsByType.leagues}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase text-drift-text-secondary">Tournaments</div>
          <div className="mt-1 text-2xl font-bold text-drift-text-primary">{totalsByType.tournaments}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase text-drift-text-secondary">Ladders</div>
          <div className="mt-1 text-2xl font-bold text-drift-text-primary">{totalsByType.ladders}</div>
        </Card>
      </div>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_170px_160px_190px]">
          <Input aria-label="Search competitions" placeholder="Search competition or club..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select aria-label="Competition type" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Any type</option>
            <option value="LEAGUE">League</option>
            <option value="TOURNAMENT">Tournament</option>
            <option value="LADDER">Ladder</option>
          </Select>
          <Select aria-label="Sport" value={sport} onChange={(event) => setSport(event.target.value)}>
            <option value="">Any sport</option>
            <option value="TENNIS">Tennis</option>
            <option value="PADEL">Padel</option>
          </Select>
          <Select aria-label="Competition state" value={state} onChange={(event) => setState(event.target.value)}>
            <option value="">Any state</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="REGISTRATION_OPEN">Registration open</option>
            <option value="RUNNING">Running</option>
            <option value="COMPLETED">Completed</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
      </Card>

      {rows === null && !error && <EmptyState message="Loading competitions..." />}
      {rows?.length === 0 && <EmptyState message="No competitions match these filters." />}
      {rows && rows.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr>
                <Th>Competition</Th>
                <Th>Type</Th>
                <Th>Club</Th>
                <Th>Status</Th>
                <Th>Sport</Th>
                <Th>Activity</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((competition) => (
                <tr key={`${competition.type}-${competition.id}`}>
                  <Td>
                    <div className="font-semibold">{competition.name}</div>
                    <div className="max-w-sm truncate text-xs text-drift-text-secondary" title={competition.description ?? undefined}>{competition.description ?? "No description"}</div>
                  </Td>
                  <Td><Badge tone="info">{label(competition.type)}</Badge></Td>
                  <Td>
                    {competition.club ? (
                      <Link href={`/organizations/${competition.club.id}`} className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary">
                        {competition.club.name}
                      </Link>
                    ) : (
                      <span className="text-drift-text-secondary">Platform-run</span>
                    )}
                  </Td>
                  <Td><Badge tone={statusTone(competition.state)}>{label(competition.state)}</Badge></Td>
                  <Td>{label(competition.sport)}{competition.format ? <span className="text-drift-text-secondary"> / {label(competition.format)}</span> : null}</Td>
                  <Td>
                    <div>{competition.primaryCountLabel}: {competition.primaryCount}</div>
                    <div className="text-xs text-drift-text-secondary">{competition.secondaryCountLabel}: {competition.secondaryCount}</div>
                  </Td>
                  <Td className="text-right">
                    <Link href={`/competitions/${routeType(competition.type)}/${competition.id}`} className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary">
                      Open
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 text-xs text-drift-text-secondary">Showing {rows.length} of {total}</div>
        </Card>
      )}
    </div>
  );
}

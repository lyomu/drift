"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { CompetitionRuleset, CompetitionRulesetInput, CompetitionType, MatchFormat, MatchSport } from "@/lib/competition-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";

const blankRuleset: CompetitionRulesetInput = {
  name: "",
  description: null,
  sport: "TENNIS",
  format: "SINGLES",
  competitionTypes: ["LEAGUE"],
  scoringFormat: "",
  walkoverRule: "",
  unfinishedMatchPolicy: "",
  rulesText: null,
  isDefault: false,
  isActive: true,
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

export default function CompetitionRulesetsPage() {
  const [rulesets, setRulesets] = useState<CompetitionRuleset[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CompetitionRulesetInput>(blankRuleset);
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("");
  const [format, setFormat] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => rulesets?.find((ruleset) => ruleset.id === selectedId) ?? null,
    [rulesets, selectedId],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (sport) params.set("sport", sport);
      if (format) params.set("format", format);
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      const response = await api.get<{ rulesets: CompetitionRuleset[] }>(`/competitions/rulesets?${params.toString()}`);
      setRulesets(response.rulesets);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rulesets could not be loaded.");
    }
  }, [format, search, sport, status, type]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    setForm({
      name: selected.name,
      description: selected.description,
      sport: selected.sport,
      format: selected.format,
      competitionTypes: selected.competitionTypes,
      scoringFormat: selected.scoringFormat,
      walkoverRule: selected.walkoverRule,
      unfinishedMatchPolicy: selected.unfinishedMatchPolicy,
      rulesText: selected.rulesText,
      isDefault: selected.isDefault,
      isActive: selected.isActive,
    });
  }, [selected]);

  function startNew() {
    setSelectedId(null);
    setForm(blankRuleset);
    setSaved(false);
    setError(null);
  }

  function toggleType(nextType: CompetitionType) {
    setForm((current) => {
      const hasType = current.competitionTypes.includes(nextType);
      const nextTypes = hasType
        ? current.competitionTypes.filter((item) => item !== nextType)
        : [...current.competitionTypes, nextType];
      return { ...current, competitionTypes: nextTypes.length ? nextTypes : current.competitionTypes };
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    setError(null);
    if (selected?.isActive && !form.isActive && !window.confirm(`Disable ${selected.name}? Existing competitions keep their current rules, but this template will no longer be selectable.`)) {
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description?.trim() || null,
        scoringFormat: form.scoringFormat.trim(),
        walkoverRule: form.walkoverRule.trim(),
        unfinishedMatchPolicy: form.unfinishedMatchPolicy.trim(),
        rulesText: form.rulesText?.trim() || null,
      };
      const response = selectedId
        ? await api.patch<{ ruleset: CompetitionRuleset }>(`/competitions/rulesets/${selectedId}`, payload)
        : await api.post<{ ruleset: CompetitionRuleset }>("/competitions/rulesets", payload);
      setSelectedId(response.ruleset.id);
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The ruleset could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Rulesets"
        description="Reusable rule templates for platform-standard competition setup."
        action={<Link href="/competitions" className="text-sm font-semibold text-drift-primary hover:underline">Back to competitions</Link>}
      />
      <ErrorBanner message={error} />
      {saved && <div className="mb-4 rounded-md border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm text-drift-success">Ruleset saved.</div>}

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_140px_140px_170px_150px]">
          <Input aria-label="Search rulesets" placeholder="Search rulesets..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select aria-label="Sport" value={sport} onChange={(event) => setSport(event.target.value)}>
            <option value="">Any sport</option>
            <option value="TENNIS">Tennis</option>
            <option value="PADEL">Padel</option>
          </Select>
          <Select aria-label="Format" value={format} onChange={(event) => setFormat(event.target.value)}>
            <option value="">Any format</option>
            <option value="SINGLES">Singles</option>
            <option value="DOUBLES">Doubles</option>
          </Select>
          <Select aria-label="Competition type" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Any type</option>
            <option value="LEAGUE">League</option>
            <option value="TOURNAMENT">Tournament</option>
            <option value="LADDER">Ladder</option>
          </Select>
          <Select aria-label="Ruleset status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-4">
          {rulesets === null && !error && <EmptyState message="Loading rulesets..." />}
          {rulesets?.length === 0 && <EmptyState message="No rulesets match these filters." />}
          {rulesets && rulesets.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {rulesets.map((ruleset) => (
                <button
                  key={ruleset.id}
                  type="button"
                  onClick={() => { setSelectedId(ruleset.id); setSaved(false); }}
                  className={`rounded-lg border bg-drift-surface p-4 text-left shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary ${selectedId === ruleset.id ? "border-drift-primary" : "border-drift-border hover:bg-drift-primary-light"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-drift-text-primary">{ruleset.name}</div>
                      <div className="mt-1 text-xs text-drift-text-secondary">{label(ruleset.sport)} / {label(ruleset.format)}</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={ruleset.isActive ? "success" : "neutral"}>{ruleset.isActive ? "Active" : "Inactive"}</Badge>
                      {ruleset.isDefault && <Badge tone="info">Default</Badge>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ruleset.competitionTypes.map((item) => <Badge key={item} tone="neutral">{label(item)}</Badge>)}
                  </div>
                  <div className="mt-3 text-sm text-drift-text-secondary">{ruleset.description || ruleset.scoringFormat}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-drift-text-primary">{selected ? "Edit ruleset" : "Create ruleset"}</h2>
            {selected && <Button type="button" variant="ghost" onClick={startNew}>New</Button>}
          </div>
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Name">
              <Input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Description">
              <Textarea rows={3} value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Sport">
                <Select value={form.sport} onChange={(event) => setForm((current) => ({ ...current, sport: event.target.value as MatchSport }))}>
                  <option value="TENNIS">Tennis</option>
                  <option value="PADEL">Padel</option>
                </Select>
              </Field>
              <Field label="Format">
                <Select value={form.format} onChange={(event) => setForm((current) => ({ ...current, format: event.target.value as MatchFormat }))}>
                  <option value="SINGLES">Singles</option>
                  <option value="DOUBLES">Doubles</option>
                </Select>
              </Field>
            </div>
            <div>
              <div className="mb-2 text-[13px] font-semibold text-drift-text-secondary">Competition types</div>
              <div className="flex flex-wrap gap-2">
                {(["LEAGUE", "TOURNAMENT", "LADDER"] as CompetitionType[]).map((item) => (
                  <label key={item} className="inline-flex items-center gap-2 rounded-md border border-drift-border px-3 py-2 text-sm font-semibold text-drift-text-primary">
                    <input type="checkbox" checked={form.competitionTypes.includes(item)} onChange={() => toggleType(item)} />
                    {label(item)}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Scoring format">
              <Input required value={form.scoringFormat} onChange={(event) => setForm((current) => ({ ...current, scoringFormat: event.target.value }))} />
            </Field>
            <Field label="Walkover rule">
              <Input required value={form.walkoverRule} onChange={(event) => setForm((current) => ({ ...current, walkoverRule: event.target.value }))} />
            </Field>
            <Field label="Unfinished match policy">
              <Input required value={form.unfinishedMatchPolicy} onChange={(event) => setForm((current) => ({ ...current, unfinishedMatchPolicy: event.target.value }))} />
            </Field>
            <Field label="Rules text">
              <Textarea rows={6} value={form.rulesText ?? ""} onChange={(event) => setForm((current) => ({ ...current, rulesText: event.target.value }))} />
            </Field>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-drift-text-primary">
                <input type="checkbox" checked={form.isDefault} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} />
                Default
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-drift-text-primary">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked, isDefault: event.target.checked ? current.isDefault : false }))} />
                Active
              </label>
            </div>
            <Button type="submit" disabled={busy || form.competitionTypes.length === 0}>{busy ? "Saving..." : "Save ruleset"}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

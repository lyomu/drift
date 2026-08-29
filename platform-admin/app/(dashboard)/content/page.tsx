"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionLink, RowCard, StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import {
  BRANCH_OPTIONS,
  SKILL_OPTIONS,
  type LearningContentListResponse,
  type LearningContentSummary,
} from "@/lib/content-types";
import { Badge, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, statusTone } from "@/components/ui";

function label(value: string | null) {
  return value ? value.replaceAll("_", " ") : "Any level";
}

function routeFor(content: LearningContentSummary) {
  return content.type === "TRAINING_PLAN" ? `/content/paths?path=${content.id}` : `/content/${content.id}`;
}

export default function ContentLibraryPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [targetSkill, setTargetSkill] = useState("");
  const [branch, setBranch] = useState("");
  const [rows, setRows] = useState<LearningContentSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ take: "100" });
      if (search.trim()) params.set("search", search.trim());
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (targetSkill) params.set("targetSkill", targetSkill);
      if (branch) params.set("branch", branch);
      const response = await api.get<LearningContentListResponse>(`/learning-content?${params.toString()}`);
      setRows(response.content);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Content could not be loaded.");
    }
  }, [branch, search, status, targetSkill, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => ({
    lessons: rows?.filter((item) => item.type === "LESSON").length ?? 0,
    drills: rows?.filter((item) => item.type === "DRILL").length ?? 0,
    paths: rows?.filter((item) => item.type === "TRAINING_PLAN").length ?? 0,
  }), [rows]);

  return (
    <div>
      <PageHeader
        title="Content Library"
        description="Platform lesson, drill, and learning-path catalogue."
        action={<div className="flex flex-wrap gap-2"><ActionLink href="/content/lessons/new" icon="menu_book" className="border-drift-primary bg-drift-primary text-white hover:bg-drift-primary-dark">Create lesson</ActionLink><ActionLink href="/content/drills/new" icon="sports_tennis">Create drill</ActionLink><ActionLink href="/content/paths" icon="conversion_path">Learning paths</ActionLink></div>}
      />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "Lessons", value: counts.lessons, icon: "menu_book" },
          { label: "Drills", value: counts.drills, icon: "sports_tennis", tone: "green" },
          { label: "Paths", value: counts.paths, icon: "conversion_path", tone: "amber" },
        ]}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_160px_150px_210px_170px]">
          <Field label="Search"><Input aria-label="Search content" placeholder="Search title, summary, or instructions..." value={search} onChange={(event) => setSearch(event.target.value)} /></Field>
          <Field label="Type"><Select aria-label="Content type" value={type} onChange={(event) => setType(event.target.value)}><option value="">Any type</option><option value="LESSON">Lesson</option><option value="DRILL">Drill</option><option value="TRAINING_PLAN">Learning path</option></Select></Field>
          <Field label="Status"><Select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Any status</option><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></Select></Field>
          <Field label="Skill"><Select aria-label="Target skill" value={targetSkill} onChange={(event) => setTargetSkill(event.target.value)}><option value="">Any skill</option>{SKILL_OPTIONS.map((skill) => <option key={skill} value={skill}>{label(skill)}</option>)}</Select></Field>
          <Field label="Level"><Select aria-label="Level" value={branch} onChange={(event) => setBranch(event.target.value)}><option value="">Any level</option>{BRANCH_OPTIONS.map((item) => <option key={item} value={item}>{label(item)}</option>)}</Select></Field>
        </div>
      </Card>

      {rows === null && !error && <EmptyState message="Loading content..." />}
      {rows?.length === 0 && <EmptyState message="Create your first lesson." />}
      {rows && rows.length > 0 && (
        <div className="grid gap-3">
          {rows.map((content) => (
            <RowCard key={content.id}>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_130px_190px_150px_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="font-bold text-drift-text-primary">{content.title}</div>
                  <div className="truncate text-xs text-drift-text-secondary" title={content.summary ?? undefined}>{content.summary ?? content.pathGoal ?? "No summary"}</div>
                </div>
                <Badge tone="info">{label(content.type)}</Badge>
                <div className="flex flex-wrap gap-2"><Badge tone={statusTone(content.status)}>{label(content.status)}</Badge><span className="text-sm text-drift-text-secondary">{label(content.targetSkill)}</span></div>
                <div className="text-sm font-semibold text-drift-text-secondary">{content.type === "TRAINING_PLAN" ? `${content.counts.steps} steps` : `${content.counts.completions} completions`}<div className="text-xs">{content.counts.usedInPaths} path refs</div></div>
                <Link href={routeFor(content)} className="justify-self-start font-bold text-drift-primary hover:underline lg:justify-self-end">Open</Link>
              </div>
            </RowCard>
          ))}
          <div className="px-1 text-xs font-semibold text-drift-text-secondary">Showing {rows.length} of {total}</div>
        </div>
      )}
    </div>
  );
}

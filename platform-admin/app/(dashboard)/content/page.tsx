"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import {
  BRANCH_OPTIONS,
  SKILL_OPTIONS,
  type LearningContentListResponse,
  type LearningContentSummary,
} from "@/lib/content-types";
import { Badge, Card, EmptyState, ErrorBanner, Input, PageHeader, Select, Td, Th, statusTone } from "@/components/ui";

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

  useEffect(() => { void load(); }, [load]);

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
        action={<div className="flex flex-wrap gap-2"><Link href="/content/lessons/new" className="rounded-md bg-drift-primary px-4 py-2 text-sm font-semibold text-white hover:bg-drift-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary">Create lesson</Link><Link href="/content/drills/new" className="rounded-md border border-drift-border bg-drift-surface px-4 py-2 text-sm font-semibold text-drift-text-primary hover:bg-drift-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary">Create drill</Link><Link href="/content/paths" className="rounded-md border border-drift-border bg-drift-surface px-4 py-2 text-sm font-semibold text-drift-text-primary hover:bg-drift-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary">Learning paths</Link></div>}
      />
      <ErrorBanner message={error} />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Lessons</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.lessons}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Drills</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.drills}</div></Card>
        <Card className="p-4"><div className="text-xs font-semibold uppercase text-drift-text-secondary">Paths</div><div className="mt-1 text-2xl font-bold text-drift-text-primary">{counts.paths}</div></Card>
      </div>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_160px_150px_210px_170px]">
          <Input aria-label="Search content" placeholder="Search title, summary, or instructions..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <Select aria-label="Content type" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Any type</option>
            <option value="LESSON">Lesson</option>
            <option value="DRILL">Drill</option>
            <option value="TRAINING_PLAN">Learning path</option>
          </Select>
          <Select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Any status</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </Select>
          <Select aria-label="Target skill" value={targetSkill} onChange={(event) => setTargetSkill(event.target.value)}>
            <option value="">Any skill</option>
            {SKILL_OPTIONS.map((skill) => <option key={skill} value={skill}>{label(skill)}</option>)}
          </Select>
          <Select aria-label="Level" value={branch} onChange={(event) => setBranch(event.target.value)}>
            <option value="">Any level</option>
            {BRANCH_OPTIONS.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </Select>
        </div>
      </Card>

      {rows === null && !error && <EmptyState message="Loading content..." />}
      {rows?.length === 0 && <EmptyState message="Create your first lesson." />}
      {rows && rows.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[980px]">
            <thead><tr><Th>Item</Th><Th>Type</Th><Th>Status</Th><Th>Skill</Th><Th>Level</Th><Th>Usage</Th><Th className="text-right">Action</Th></tr></thead>
            <tbody>
              {rows.map((content) => (
                <tr key={content.id}>
                  <Td><div className="font-semibold">{content.title}</div><div className="max-w-sm truncate text-xs text-drift-text-secondary" title={content.summary ?? undefined}>{content.summary ?? content.pathGoal ?? "No summary"}</div></Td>
                  <Td><Badge tone="info">{label(content.type)}</Badge></Td>
                  <Td><Badge tone={statusTone(content.status)}>{label(content.status)}</Badge></Td>
                  <Td>{label(content.targetSkill)}</Td>
                  <Td>{label(content.branch)}</Td>
                  <Td>{content.type === "TRAINING_PLAN" ? `${content.counts.steps} steps` : `${content.counts.completions} completions`}<div className="text-xs text-drift-text-secondary">{content.counts.usedInPaths} path refs</div></Td>
                  <Td className="text-right"><Link href={routeFor(content)} className="font-semibold text-drift-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary">Open</Link></Td>
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

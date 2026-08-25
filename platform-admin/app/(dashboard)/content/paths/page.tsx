"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import {
  BRANCH_OPTIONS,
  SKILL_OPTIONS,
  type AssessmentBranch,
  type AssessmentPillar,
  type LearningContentListResponse,
  type LearningContentStatus,
  type LearningContentSummary,
  type LearningPathInput,
  type MatchSport,
  type StepContent,
} from "@/lib/content-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Textarea, statusTone } from "@/components/ui";

const blankPath: LearningPathInput = {
  sport: "TENNIS",
  targetSkill: "FOREHAND",
  branch: null,
  title: "",
  summary: null,
  bodyText: null,
  videoUrl: null,
  durationMinutes: null,
  pathGoal: null,
  status: "DRAFT",
  stepIds: [],
};

function label(value: string | null) {
  return value ? value.replaceAll("_", " ") : "Any level";
}

function pathToInput(path: LearningContentSummary): LearningPathInput {
  return {
    sport: path.sport,
    targetSkill: path.targetSkill,
    branch: path.branch,
    title: path.title,
    summary: path.summary,
    bodyText: path.bodyText,
    videoUrl: path.videoUrl,
    durationMinutes: path.durationMinutes,
    pathGoal: path.pathGoal,
    status: path.status,
    stepIds: path.steps.map((step) => step.content.id),
  };
}

export default function LearningPathsPage() {
  const [paths, setPaths] = useState<LearningContentSummary[] | null>(null);
  const [options, setOptions] = useState<StepContent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<LearningPathInput>(blankPath);
  const [submitStatus, setSubmitStatus] = useState<LearningContentStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => paths?.find((path) => path.id === selectedId) ?? null,
    [paths, selectedId],
  );

  const selectedSteps = useMemo(
    () => form.stepIds.map((id) => options.find((option) => option.id === id)).filter(Boolean) as StepContent[],
    [form.stepIds, options],
  );

  const availableOptions = useMemo(
    () => options.filter((option) => !form.stepIds.includes(option.id)),
    [form.stepIds, options],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pathResponse, optionResponse] = await Promise.all([
        api.get<LearningContentListResponse>("/learning-content?type=TRAINING_PLAN&take=250"),
        api.get<{ content: StepContent[] }>("/learning-content/step-options"),
      ]);
      setPaths(pathResponse.content);
      setOptions(optionResponse.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Learning paths could not be loaded.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    setForm(pathToInput(selected));
    setSaved(false);
  }, [selected]);

  useEffect(() => {
    const pathId = typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("path");
    if (pathId && paths?.some((path) => path.id === pathId)) {
      setSelectedId(pathId);
    }
  }, [paths]);

  function startNew() {
    setSelectedId(null);
    setForm(blankPath);
    setSaved(false);
    setError(null);
  }

  function addStep(id: string) {
    if (!id) return;
    setForm((current) => ({ ...current, stepIds: [...current.stepIds, id] }));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setForm((current) => {
      const next = [...current.stepIds];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, stepIds: next };
    });
  }

  function removeStep(id: string) {
    setForm((current) => ({ ...current, stepIds: current.stepIds.filter((stepId) => stepId !== id) }));
  }

  async function save(event: { preventDefault: () => void }, status?: LearningContentStatus) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      const payload: LearningPathInput = {
        ...form,
        title: form.title.trim(),
        summary: form.summary?.trim() || null,
        bodyText: form.bodyText?.trim() || null,
        videoUrl: form.videoUrl?.trim() || null,
        pathGoal: form.pathGoal?.trim() || null,
        status: status ?? form.status,
      };
      const response = selectedId
        ? await api.patch<{ content: LearningContentSummary }>(`/learning-content/paths/${selectedId}`, payload)
        : await api.post<{ content: LearningContentSummary }>("/learning-content/paths", payload);
      setSelectedId(response.content.id);
      setSaved(true);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The learning path could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Learning Path Builder"
        description="Organise lessons and drills into skill, level, and goal-based paths."
        action={<Link href="/content" className="text-sm font-semibold text-drift-primary hover:underline">Back to library</Link>}
      />
      <ErrorBanner message={error} />
      {saved && <div className="mb-4 rounded-md border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm text-drift-success">Learning path saved.</div>}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <Button type="button" variant="secondary" onClick={startNew}>New path</Button>
          {paths === null && !error && <EmptyState message="Loading learning paths..." />}
          {paths?.length === 0 && <EmptyState message="Build your first learning path." />}
          {paths?.map((path) => (
            <button
              key={path.id}
              type="button"
              onClick={() => setSelectedId(path.id)}
              className={`rounded-lg border bg-drift-surface p-4 text-left shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary ${selectedId === path.id ? "border-drift-primary" : "border-drift-border hover:bg-drift-primary-light"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-drift-text-primary">{path.title}</div>
                  <div className="mt-1 text-xs text-drift-text-secondary">{label(path.targetSkill)} / {label(path.branch)}</div>
                </div>
                <Badge tone={statusTone(path.status)}>{label(path.status)}</Badge>
              </div>
              <div className="mt-3 text-sm text-drift-text-secondary">{path.pathGoal || path.summary || `${path.counts.steps} steps`}</div>
            </button>
          ))}
        </div>

        <Card>
          <h2 className="mb-4 font-display text-xl font-semibold text-drift-text-primary">{selected ? "Edit path" : "Create path"}</h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => void save(event, submitStatus ?? undefined).finally(() => setSubmitStatus(null))}
          >
            <Field label="Title"><Input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Field>
            <Field label="Goal"><Input value={form.pathGoal ?? ""} onChange={(event) => setForm((current) => ({ ...current, pathGoal: event.target.value }))} /></Field>
            <Field label="Status"><Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LearningContentStatus }))}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></Select></Field>
            <Field label="Sport"><Select value={form.sport} onChange={(event) => setForm((current) => ({ ...current, sport: event.target.value as MatchSport }))}><option value="TENNIS">Tennis</option><option value="PADEL">Padel</option></Select></Field>
            <Field label="Target skill"><Select value={form.targetSkill} onChange={(event) => setForm((current) => ({ ...current, targetSkill: event.target.value as AssessmentPillar }))}>{SKILL_OPTIONS.map((skill) => <option key={skill} value={skill}>{label(skill)}</option>)}</Select></Field>
            <Field label="Level"><Select value={form.branch ?? ""} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value ? event.target.value as AssessmentBranch : null }))}><option value="">Any level</option>{BRANCH_OPTIONS.map((branch) => <option key={branch} value={branch}>{label(branch)}</option>)}</Select></Field>
            <div className="md:col-span-2"><Field label="Summary"><Textarea rows={3} value={form.summary ?? ""} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} /></Field></div>
            <div className="md:col-span-2"><Field label="Path notes"><Textarea rows={5} value={form.bodyText ?? ""} onChange={(event) => setForm((current) => ({ ...current, bodyText: event.target.value }))} /></Field></div>

            <div className="md:col-span-2">
              <div className="mb-2 text-[13px] font-semibold text-drift-text-secondary">Add step</div>
              <Select aria-label="Add path step" value="" onChange={(event) => addStep(event.target.value)}>
                <option value="">Select lesson or drill</option>
                {availableOptions.map((option) => <option key={option.id} value={option.id}>{option.title} ({label(option.type)} / {label(option.status)})</option>)}
              </Select>
            </div>

            <div className="md:col-span-2">
              {selectedSteps.length === 0 && <EmptyState message="Build your first learning path." />}
              <div className="space-y-2">
                {selectedSteps.map((step, index) => (
                  <div key={step.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-drift-border px-3 py-2">
                    <div>
                      <div className="font-semibold text-drift-text-primary">{index + 1}. {step.title}</div>
                      <div className="text-xs text-drift-text-secondary">{label(step.type)} / {label(step.targetSkill)} / {label(step.status)}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" disabled={index === 0} onClick={() => moveStep(index, -1)}>Up</Button>
                      <Button type="button" variant="ghost" disabled={index === selectedSteps.length - 1} onClick={() => moveStep(index, 1)}>Down</Button>
                      <Button type="button" variant="ghost" onClick={() => removeStep(step.id)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" disabled={busy || form.stepIds.length === 0} onClick={() => setSubmitStatus(null)}>{busy ? "Saving..." : "Save path"}</Button>
              <Button type="submit" variant="secondary" disabled={busy || form.stepIds.length === 0} onClick={() => setSubmitStatus("DRAFT")}>Save draft</Button>
              <Button type="submit" variant="secondary" disabled={busy || form.stepIds.length === 0} onClick={() => setSubmitStatus("PUBLISHED")}>Save & publish</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

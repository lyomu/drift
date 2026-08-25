"use client";

import { useState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import {
  BRANCH_OPTIONS,
  SKILL_OPTIONS,
  type AssessmentBranch,
  type AssessmentPillar,
  type LearningContentInput,
  type LearningContentStatus,
  type MatchSport,
} from "@/lib/content-types";

const emptyContent: LearningContentInput = {
  sport: "TENNIS",
  targetSkill: "FOREHAND",
  branch: null,
  title: "",
  summary: null,
  bodyText: null,
  videoUrl: null,
  durationMinutes: null,
  status: "DRAFT",
};

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function LearningContentForm({
  initial,
  submitLabel = "Save",
  busy = false,
  onSubmit,
}: {
  initial?: LearningContentInput;
  submitLabel?: string;
  busy?: boolean;
  onSubmit: (value: LearningContentInput) => Promise<void>;
}) {
  const [form, setForm] = useState<LearningContentInput>(initial ?? emptyContent);
  const [submitStatus, setSubmitStatus] = useState<LearningContentStatus | null>(null);

  async function save(status?: LearningContentStatus) {
    await onSubmit({
      ...form,
      title: form.title.trim(),
      summary: form.summary?.trim() || null,
      bodyText: form.bodyText?.trim() || null,
      videoUrl: form.videoUrl?.trim() || null,
      status: status ?? form.status,
    });
  }

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        void save(submitStatus ?? undefined).finally(() => setSubmitStatus(null));
      }}
    >
      <Field label="Title">
        <Input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
      </Field>
      <Field label="Status">
        <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as LearningContentStatus }))}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </Select>
      </Field>
      <Field label="Sport">
        <Select value={form.sport} onChange={(event) => setForm((current) => ({ ...current, sport: event.target.value as MatchSport }))}>
          <option value="TENNIS">Tennis</option>
          <option value="PADEL">Padel</option>
        </Select>
      </Field>
      <Field label="Target skill">
        <Select value={form.targetSkill} onChange={(event) => setForm((current) => ({ ...current, targetSkill: event.target.value as AssessmentPillar }))}>
          {SKILL_OPTIONS.map((skill) => <option key={skill} value={skill}>{label(skill)}</option>)}
        </Select>
      </Field>
      <Field label="Level">
        <Select value={form.branch ?? ""} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value ? event.target.value as AssessmentBranch : null }))}>
          <option value="">Any level</option>
          {BRANCH_OPTIONS.map((branch) => <option key={branch} value={branch}>{label(branch)}</option>)}
        </Select>
      </Field>
      <Field label="Duration minutes">
        <Input
          type="number"
          min={1}
          max={600}
          value={form.durationMinutes ?? ""}
          onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value ? Number(event.target.value) : null }))}
        />
      </Field>
      <div className="md:col-span-2">
        <Field label="Summary">
          <Textarea rows={3} value={form.summary ?? ""} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Body / instructions">
          <Textarea rows={10} value={form.bodyText ?? ""} onChange={(event) => setForm((current) => ({ ...current, bodyText: event.target.value }))} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Video URL">
          <Input
            type="url"
            value={form.videoUrl ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <Button type="submit" disabled={busy} onClick={() => setSubmitStatus(null)}>{busy ? "Saving..." : submitLabel}</Button>
        <Button type="submit" variant="secondary" disabled={busy} onClick={() => setSubmitStatus("DRAFT")}>Save as draft</Button>
        <Button type="submit" variant="secondary" disabled={busy} onClick={() => setSubmitStatus("PUBLISHED")}>Save & publish</Button>
      </div>
    </form>
  );
}

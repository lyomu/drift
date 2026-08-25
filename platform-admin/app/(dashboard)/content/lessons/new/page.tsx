"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LearningContentForm } from "@/components/LearningContentForm";
import { Card, ErrorBanner, PageHeader } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import type { LearningContentInput, LearningContentSummary } from "@/lib/content-types";

export default function CreateLessonPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(value: LearningContentInput) {
    setBusy(true);
    setError(null);
    try {
      const response = await api.post<{ content: LearningContentSummary }>("/learning-content/lessons", value);
      router.push(`/content/${response.content.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The lesson could not be saved. Check the video URL and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Create Lesson" description="Author a structured lesson for the learning catalogue." action={<Link href="/content" className="text-sm font-semibold text-drift-primary hover:underline">Back to library</Link>} />
      <ErrorBanner message={error} />
      <Card><LearningContentForm busy={busy} submitLabel="Save lesson" onSubmit={save} /></Card>
    </div>
  );
}

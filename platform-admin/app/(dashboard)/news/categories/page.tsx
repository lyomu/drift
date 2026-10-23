"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { CurrentPlatformAdmin } from "@/lib/access-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader } from "@/components/ui";

interface Category { slug: string; label: string; sortOrder: number; enabled: boolean }

export default function NewsCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [canConfigure, setCanConfigure] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Category>>({});
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState(80);

  const load = useCallback(async () => {
    try {
      const [rows, admin] = await Promise.all([
        api.get<Category[]>("/news/categories"),
        api.get<CurrentPlatformAdmin>("/auth/me"),
      ]);
      setCategories(rows);
      setDrafts(Object.fromEntries(rows.map((row) => [row.slug, row])));
      setCanConfigure(admin.role.permissions.includes("CONTENT_MANAGE") && admin.role.permissions.includes("PLATFORM_CONFIG_MANAGE"));
      setError(null);
    } catch (err) { setError(err instanceof ApiError ? err.message : "Could not load categories."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy("create");
    try {
      await api.post("/news/categories", { slug: slug.trim().toUpperCase(), label: label.trim(), sortOrder });
      setSlug(""); setLabel(""); await load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Could not add category."); }
    finally { setBusy(null); }
  }

  async function save(row: Category) {
    setBusy(row.slug);
    try { await api.patch(`/news/categories/${row.slug}`, { label: row.label.trim(), sortOrder: Number(row.sortOrder), enabled: row.enabled }); await load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Could not save category."); }
    finally { setBusy(null); }
  }

  return <div>
    <PageHeader title="News Categories" description="Choose the topics and labels shown in the existing mobile News filter. Disabling a category hides its filter without deleting story assignments." />
    <ErrorBanner message={error} />
    {canConfigure && <Card className="mb-6 p-5">
      <form onSubmit={create} className="flex flex-wrap items-end gap-3">
        <Field label="Slug"><Input value={slug} onChange={(e) => setSlug(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} placeholder="JUNIOR_TENNIS" required maxLength={50} /></Field>
        <Field label="Display name"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Junior Tennis" required maxLength={80} /></Field>
        <Field label="Order"><Input type="number" min={0} max={1000} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="w-24" /></Field>
        <Button type="submit" disabled={busy !== null}>Add category</Button>
      </form>
    </Card>}
    {categories === null && !error && <EmptyState message="Loading categories..." />}
    {categories?.length === 0 && <EmptyState message="No categories configured." />}
    <div className="grid gap-3">
      {categories?.map((category) => {
        const draft = drafts[category.slug] ?? category;
        return <Card key={category.slug} className="flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-36 pb-2 text-sm font-bold text-drift-text-primary">{category.slug}</div>
            <Field label="Display name"><Input value={draft.label} disabled={!canConfigure} onChange={(e) => setDrafts({ ...drafts, [category.slug]: { ...draft, label: e.target.value } })} maxLength={80} /></Field>
            <Field label="Order"><Input type="number" min={0} max={1000} value={draft.sortOrder} disabled={!canConfigure} onChange={(e) => setDrafts({ ...drafts, [category.slug]: { ...draft, sortOrder: Number(e.target.value) } })} className="w-24" /></Field>
            <Badge tone={category.enabled ? "success" : "neutral"}>{category.enabled ? "Visible" : "Hidden"}</Badge>
          </div>
          {canConfigure && <div className="flex gap-2">
            {category.slug !== "LATEST" && <Button variant="secondary" disabled={busy !== null} onClick={() => save({ ...category, enabled: !category.enabled })}>{category.enabled ? "Hide" : "Show"}</Button>}
            <Button disabled={busy !== null || !draft.label.trim()} onClick={() => save(draft)}>Save</Button>
          </div>}
        </Card>;
      })}
    </div>
  </div>;
}

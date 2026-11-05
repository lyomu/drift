"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModalShell } from "@/components/dashboard-design";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Textarea,
  Td,
  Th,
} from "@/components/ui";
import { api, ApiError, mediaUrl } from "@/lib/api-client";
import {
  FACT_LANGUAGES,
  FACT_LIMITS,
  type FactLanguageCode,
  type TennisFactRow,
} from "@/lib/tennis-fact-types";

type FactForm = {
  titleEn: string;
  titleFr: string;
  titleEs: string;
  bodyEn: string;
  bodyFr: string;
  bodyEs: string;
  sourceEn: string;
  sourceFr: string;
  sourceEs: string;
  active: boolean;
  sortOrder: string;
};

const EMPTY_FORM: FactForm = {
  titleEn: "",
  titleFr: "",
  titleEs: "",
  bodyEn: "",
  bodyFr: "",
  bodyEs: "",
  sourceEn: "",
  sourceFr: "",
  sourceEs: "",
  active: true,
  sortOrder: "",
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function formFrom(row: TennisFactRow): FactForm {
  return {
    titleEn: row.titleEn,
    titleFr: row.titleFr,
    titleEs: row.titleEs,
    bodyEn: row.bodyEn,
    bodyFr: row.bodyFr,
    bodyEs: row.bodyEs,
    sourceEn: row.sourceEn ?? "",
    sourceFr: row.sourceFr ?? "",
    sourceEs: row.sourceEs ?? "",
    active: row.active,
    sortOrder: String(row.sortOrder),
  };
}

/** Problems that would make the server reject the form, in plain words. */
function formProblems(form: FactForm): string[] {
  const problems: string[] = [];
  for (const { code, label } of FACT_LANGUAGES) {
    const title = form[`title${code}`].trim();
    const body = form[`body${code}`].trim();
    if (title.length < 3) problems.push(`${label} title needs at least 3 characters.`);
    if (title.length > FACT_LIMITS.title) problems.push(`${label} title is too long.`);
    if (body.length < 10) problems.push(`${label} fact needs at least 10 characters.`);
    if (body.length > FACT_LIMITS.body) problems.push(`${label} fact is too long.`);
    if (form[`source${code}`].trim().length > FACT_LIMITS.source) {
      problems.push(`${label} source is too long.`);
    }
  }
  return problems;
}

function Counter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span
      className={`text-right text-[11px] font-semibold ${over ? "text-drift-error" : "text-drift-text-secondary"}`}
    >
      {value.length} / {max}
    </span>
  );
}

/**
 * The daily tennis fact shown on mobile Home ("Today's fact") and filed in
 * each player's Notification Centre once a day (no push). Facts rotate in
 * list order, one per UTC day, and every fact needs all three app languages.
 */
export default function TennisFactsPage() {
  const [facts, setFacts] = useState<TennisFactRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Editor state: `editing` is null for a new fact.
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TennisFactRow | null>(null);
  const [form, setForm] = useState<FactForm>(EMPTY_FORM);
  const [language, setLanguage] = useState<FactLanguageCode>("En");
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setFacts(await api.get<TennisFactRow[]>("/tennis-facts"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Facts could not be loaded.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const preview = useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const activeCount = facts.filter((f) => f.active).length;

  function openEditor(row: TennisFactRow | null) {
    setEditing(row);
    setForm(row ? formFrom(row) : EMPTY_FORM);
    setLanguage("En");
    setImage(null);
    setRemoveImage(false);
    setFormError(null);
    setEditorOpen(true);
  }

  function closeEditor() {
    if (busy) return;
    setEditorOpen(false);
  }

  function pickImage(file: File | null) {
    setFormError(null);
    if (file && (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES)) {
      setFormError("Choose a JPEG, PNG or WebP image of 5 MB or less.");
      return;
    }
    setImage(file);
    if (file) setRemoveImage(false);
  }

  async function save() {
    const problems = formProblems(form);
    if (problems.length > 0) {
      setFormError(problems.join(" "));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) {
        if (key === "sortOrder" && value === "") continue;
        body.append(key, typeof value === "string" ? value.trim() : String(value));
      }
      if (image) body.append("image", image);
      if (removeImage && !image) body.append("removeImage", "true");

      if (editing) {
        await api.upload(`/tennis-facts/${editing.id}`, body, "PUT");
        setNotice("Fact updated.");
      } else {
        await api.upload("/tennis-facts", body);
        setNotice("Fact added to the rotation.");
      }
      setEditorOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "The fact could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: TennisFactRow) {
    setError(null);
    try {
      await api.patch(`/tennis-facts/${row.id}/active`, { active: !row.active });
      setNotice(row.active ? "Fact hidden from the rotation." : "Fact back in the rotation.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The fact could not be updated.");
    }
  }

  async function remove(row: TennisFactRow) {
    if (!window.confirm(`Delete "${row.titleEn}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.delete(`/tennis-facts/${row.id}`);
      setNotice("Fact deleted.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The fact could not be deleted.");
    }
  }

  const currentImage =
    image != null
      ? preview
      : editing?.imageUrl && !removeImage
        ? mediaUrl(editing.imageUrl)
        : null;

  return (
    <div>
      <PageHeader
        title="Daily tennis facts"
        description="One short fact a day on the app's Home screen and in each player's notifications (no push). Facts rotate in order, one per day, and need English, French and Spanish text."
        action={
          <Button icon="add" onClick={() => openEditor(null)}>
            Add fact
          </Button>
        }
      />
      <ErrorBanner message={error} />
      {notice && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm font-semibold text-drift-success"
        >
          {notice}
        </div>
      )}

      {loaded && facts.length === 0 ? (
        <EmptyState
          icon="lightbulb"
          message="No facts yet"
          description="Add a fact, or run the starter seed (npm run seed:tennis-facts in backend/)."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <p className="px-5 pt-4 text-sm text-drift-text-secondary">
            {activeCount} active of {facts.length}. With {activeCount} active, each fact repeats every{" "}
            {activeCount} days.
          </p>
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Image</Th>
                <Th>Fact (English)</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {facts.map((row) => (
                <tr key={row.id}>
                  <Td className="w-16 font-bold">{row.sortOrder}</Td>
                  <Td className="w-24">
                    {row.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl(row.imageUrl)}
                        alt=""
                        className="h-12 w-20 rounded-md object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-20 items-center justify-center rounded-md bg-drift-neutral-surface text-[11px] text-drift-text-secondary">
                        No image
                      </span>
                    )}
                  </Td>
                  <Td>
                    <div className="font-bold">{row.titleEn}</div>
                    <div className="mt-0.5 line-clamp-2 max-w-xl text-drift-text-secondary">
                      {row.bodyEn}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={row.active ? "success" : "neutral"}>
                        {row.active ? "Active" : "Hidden"}
                      </Badge>
                      {row.isToday && <Badge tone="info">Today</Badge>}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" onClick={() => openEditor(row)}>
                        Edit
                      </Button>
                      <Button variant="ghost" onClick={() => void toggleActive(row)}>
                        {row.active ? "Hide" : "Show"}
                      </Button>
                      <Button variant="ghost" onClick={() => void remove(row)}>
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {editorOpen && (
        <ModalShell
          title={editing ? "Edit fact" : "Add fact"}
          description="Keep it short: the whole fact must fit on one phone screen."
          onClose={closeEditor}
          footer={
            <>
              <Button variant="secondary" onClick={closeEditor} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={busy}>
                {busy ? "Saving…" : editing ? "Save changes" : "Add fact"}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <ErrorBanner message={formError} />

            <div role="tablist" aria-label="Language" className="flex gap-2">
              {FACT_LANGUAGES.map(({ code, label }) => {
                const incomplete =
                  form[`title${code}`].trim().length < 3 || form[`body${code}`].trim().length < 10;
                return (
                  <button
                    key={code}
                    type="button"
                    role="tab"
                    aria-selected={language === code}
                    onClick={() => setLanguage(code)}
                    className={`min-h-10 rounded-md border px-3 text-sm font-bold ${
                      language === code
                        ? "border-drift-primary bg-drift-primary-light text-drift-primary-dark"
                        : "border-drift-border text-drift-text-secondary"
                    }`}
                  >
                    {label}
                    {incomplete && <span className="ml-1 text-drift-error">•</span>}
                  </button>
                );
              })}
            </div>

            <Field label="Title">
              <Input
                value={form[`title${language}`]}
                maxLength={FACT_LIMITS.title}
                onChange={(e) => setForm({ ...form, [`title${language}`]: e.target.value })}
              />
              <Counter value={form[`title${language}`]} max={FACT_LIMITS.title} />
            </Field>
            <Field label="Fact">
              <Textarea
                rows={4}
                value={form[`body${language}`]}
                maxLength={FACT_LIMITS.body}
                onChange={(e) => setForm({ ...form, [`body${language}`]: e.target.value })}
              />
              <Counter value={form[`body${language}`]} max={FACT_LIMITS.body} />
            </Field>
            <Field label="Source (optional)">
              <Input
                value={form[`source${language}`]}
                maxLength={FACT_LIMITS.source}
                onChange={(e) => setForm({ ...form, [`source${language}`]: e.target.value })}
              />
            </Field>

            <Field label="Image (JPEG, PNG or WebP, up to 5 MB)">
              <div className="flex items-center gap-4">
                {currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentImage} alt="" className="h-20 w-36 rounded-md object-cover" />
                ) : (
                  <span className="flex h-20 w-36 items-center justify-center rounded-md bg-drift-neutral-surface text-xs text-drift-text-secondary">
                    No image — the app shows a branded placeholder
                  </span>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept={IMAGE_TYPES.join(",")}
                    onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
                    className="text-sm"
                  />
                  {(image || (editing?.imageUrl && !removeImage)) && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setImage(null);
                        setRemoveImage(true);
                      }}
                    >
                      Remove image
                    </Button>
                  )}
                </div>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Rotation order">
                <Input
                  type="number"
                  min={0}
                  placeholder="End of list"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active (in the daily rotation)
              </label>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

"use client";

import { Button, Field, Input, Select } from "@/components/ui";
import type { CourtGroup, CourtSurface } from "@/lib/types";

const SURFACES: CourtSurface[] = ["HARD", "CLAY", "GRASS", "ARTIFICIAL_GRASS"];

export function CourtGroupsEditor({
  groups,
  onChange,
}: {
  groups: CourtGroup[];
  onChange: (groups: CourtGroup[]) => void;
}) {
  function update(index: number, patch: Partial<CourtGroup>) {
    onChange(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  function remove(index: number) {
    onChange(groups.filter((_, i) => i !== index));
  }

  function add() {
    onChange([
      ...groups,
      { surface: "HARD", indoor: false, lighting: false, count: 1 },
    ]);
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[13px] font-semibold text-drift-text-secondary">
        Court groups
      </span>
      {groups.map((g, i) => (
        <div
          key={i}
          className="grid grid-cols-2 gap-3 rounded-md border border-drift-border p-3 sm:grid-cols-5 sm:items-end"
        >
          <Field label="Surface">
            <Select
              value={g.surface}
              onChange={(e) =>
                update(i, { surface: e.target.value as CourtSurface })
              }
            >
              {SURFACES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Count">
            <Input
              type="number"
              min={1}
              max={100}
              value={g.count}
              onChange={(e) => update(i, { count: Number(e.target.value) })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-drift-text-primary">
            <input
              type="checkbox"
              checked={g.indoor}
              onChange={(e) => update(i, { indoor: e.target.checked })}
            />
            Indoor
          </label>
          <label className="flex items-center gap-2 text-sm text-drift-text-primary">
            <input
              type="checkbox"
              checked={g.lighting}
              onChange={(e) => update(i, { lighting: e.target.checked })}
            />
            Lighting
          </label>
          <Button
            type="button"
            variant="ghost"
            onClick={() => remove(i)}
            className="justify-self-start text-drift-error"
          >
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={add} className="self-start">
        Add court group
      </Button>
    </div>
  );
}

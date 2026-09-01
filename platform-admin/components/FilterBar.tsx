"use client";

import { useId } from "react";
import { MaterialIcon } from "./dashboard-design";
import { Select } from "./ui";

export type FilterOption = { value: string; label: string };

export type FilterSpec = {
  /** Stable key, also used as the chip's React key. */
  id: string;
  label: string;
  /** Text for the "no choice made" option, e.g. "Any audience". */
  anyLabel: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

export type SearchSpec = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Announced to screen readers; defaults to "Search". */
  label?: string;
};

/**
 * A filter bar with a search box, dropdown facets, removable chips for whatever
 * is currently narrowing the list, and a live result count.
 *
 * The chips matter: a bare row of selects reading "Any audience / Any status"
 * gives no peripheral signal that a list is filtered, so a stale filter silently
 * looks like missing data. Chips make an active filter visible and one click to
 * undo.
 */
export function FilterBar({
  search,
  filters = [],
  resultCount,
  totalCount,
  noun,
  nounPlural,
}: {
  search?: SearchSpec;
  filters?: FilterSpec[];
  /** Rows after filtering. Omit both counts to hide the summary line. */
  resultCount?: number;
  totalCount?: number;
  noun?: string;
  nounPlural?: string;
}) {
  const searchId = useId();
  const trimmedSearch = search?.value.trim() ?? "";
  const activeFilters = filters.filter((filter) => filter.value !== "");
  const hasActive = activeFilters.length > 0 || trimmedSearch !== "";

  function clearAll() {
    search?.onChange("");
    filters.forEach((filter) => filter.onChange(""));
  }

  const plural = nounPlural ?? (noun ? `${noun}s` : undefined);
  const showSummary = resultCount !== undefined && totalCount !== undefined && noun;

  return (
    <section className="mb-4 rounded-lg border border-drift-border bg-drift-surface p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {search && (
          <div className="min-w-0 flex-1">
            <label
              htmlFor={searchId}
              className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.08em] text-drift-text-secondary"
            >
              {search.label ?? "Search"}
            </label>
            <div className="relative">
              <MaterialIcon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-drift-text-secondary"
              />
              <input
                id={searchId}
                type="search"
                value={search.value}
                placeholder={search.placeholder}
                onChange={(event) => search.onChange(event.target.value)}
                className="w-full rounded-md border border-drift-border bg-drift-surface py-2.5 pl-10 pr-9 text-sm font-medium text-drift-text-primary placeholder:text-drift-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary focus-visible:ring-offset-2"
              />
              {trimmedSearch !== "" && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => search.onChange("")}
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-drift-text-secondary transition hover:bg-drift-primary-light hover:text-drift-text-primary"
                >
                  <MaterialIcon name="close" className="text-[16px]" />
                </button>
              )}
            </div>
          </div>
        )}

        {filters.map((filter) => (
          <div key={filter.id} className="lg:w-[190px]">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-drift-text-secondary">
                {filter.label}
              </span>
              <Select
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
                className={filter.value ? "border-drift-primary text-drift-primary-dark" : ""}
              >
                <option value="">{filter.anyLabel}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        ))}
      </div>

      {(hasActive || showSummary) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-drift-border pt-3">
          {showSummary && (
            <span className="text-[13px] font-semibold text-drift-text-secondary tabular">
              {hasActive
                ? `Showing ${resultCount} of ${totalCount} ${totalCount === 1 ? noun : plural}`
                : `${totalCount} ${totalCount === 1 ? noun : plural}`}
            </span>
          )}

          {trimmedSearch !== "" && (
            <Chip label="Search" value={`"${trimmedSearch}"`} onRemove={() => search?.onChange("")} />
          )}
          {activeFilters.map((filter) => (
            <Chip
              key={filter.id}
              label={filter.label}
              value={
                filter.options.find((option) => option.value === filter.value)?.label ?? filter.value
              }
              onRemove={() => filter.onChange("")}
            />
          ))}

          {hasActive && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto rounded-md px-2 py-1 text-[13px] font-bold text-drift-primary transition hover:bg-drift-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function Chip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-drift-primary/30 bg-drift-primary-light py-1 pl-2.5 pr-1 text-[12.5px] font-bold text-drift-primary-dark">
      <span className="text-drift-text-secondary">{label}:</span>
      <span className="max-w-[180px] truncate">{value}</span>
      <button
        type="button"
        aria-label={`Remove ${label} filter`}
        onClick={onRemove}
        className="flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-drift-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary"
      >
        <MaterialIcon name="close" className="text-[14px]" />
      </button>
    </span>
  );
}

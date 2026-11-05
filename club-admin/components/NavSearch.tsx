"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClub } from "@/lib/club-context";
import { MaterialIcon } from "@/components/dashboard-design";
import { NAV_GROUPS, canSeeNavItem } from "@/lib/nav";
import { useT } from "@/lib/i18n/i18n-context";

/**
 * The header's ⌘K / Ctrl+K quick-jump. It searches the console's own pages
 * (the same list the sidebar shows, role restrictions included) rather than
 * club data: there is no club-scoped search endpoint, and `/search` is the
 * player directory.
 */
export function NavSearch() {
  const t = useT();
  const router = useRouter();
  const { role } = useClub();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(
    () =>
      NAV_GROUPS.flatMap((group) =>
        group.items
          .filter((item) => canSeeNavItem(item, role))
          .map((item) => ({ item, group: t(group.label), label: t(item.label) })),
      ),
    [role, t],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, 7);
    return entries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(q) || entry.group.toLowerCase().includes(q),
    );
  }, [entries, query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && results[highlight]) {
      event.preventDefault();
      go(results[highlight].item.href);
    } else if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={wrapRef} className="relative w-[min(400px,40vw)]">
      <div className="flex items-center gap-2.5 text-drift-text-secondary">
        <MaterialIcon name="search" className="text-[20px]" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls="nav-search-results"
          aria-label={t("header.jumpTo")}
          placeholder={t("header.jumpTo")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-drift-text-primary outline-none placeholder:text-drift-text-secondary"
        />
        <kbd className="hidden rounded-md border border-drift-border bg-drift-surface-sunken px-[7px] py-[3px] text-[11px] font-semibold text-drift-text-secondary lg:block">
          ⌘ K
        </kbd>
      </div>

      {open && (
        <ul
          id="nav-search-results"
          role="listbox"
          className="absolute left-0 top-[calc(100%+14px)] z-40 max-h-[340px] w-full min-w-[260px] overflow-y-auto rounded-xl border border-drift-border bg-drift-surface p-1.5 shadow-[0_16px_40px_rgb(0_0_0/16%)]"
        >
          {results.length === 0 && (
            <li className="px-3 py-3 text-[12px] text-drift-text-secondary">
              {t("header.noMatches")}
            </li>
          )}
          {results.map((entry, index) => (
            <li key={entry.item.href} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(index)}
                onClick={() => go(entry.item.href)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ${
                  index === highlight ? "bg-drift-primary-light" : ""
                }`}
              >
                <MaterialIcon
                  name={entry.item.icon}
                  className="text-[18px] text-drift-text-secondary"
                />
                <span className="flex-1 truncate text-[13px] font-semibold text-drift-text-primary">
                  {entry.label}
                </span>
                <span className="text-[11px] text-drift-text-secondary">{entry.group}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

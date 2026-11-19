"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import { DataTable } from "@/components/DataTable";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, statusTone } from "@/components/ui";
import {
  ACTIVITY_FILTER_LABEL,
  CLUB_ROLES,
  USER_CATEGORY_LABEL,
  displayName,
  formatDate,
  formatLastActive,
  type ActivityFilter,
  type UserCategory,
  type UserListResponse,
  type UserRow,
  type UserSortField,
} from "@/lib/user-types";

const PAGE_SIZE = 50;

const EMPTY_COUNTS: UserListResponse["counts"] = {
  active: 0,
  suspended: 0,
  deleted: 0,
  players: 0,
  coaches: 0,
  clubStaff: 0,
  activeToday: 0,
  neverActive: 0,
  unverified: 0,
};

type Filters = {
  query: string;
  status: string;
  category: string;
  verification: string;
  clubRole: string;
  activity: string;
  createdFrom: string;
  createdTo: string;
  sort: UserSortField;
  dir: "asc" | "desc";
};

const FILTER_KEYS = ["query", "status", "category", "verification", "clubRole", "activity", "createdFrom", "createdTo", "sort", "dir"] as const;

function readFilters(): Filters {
  const base: Filters = {
    query: "", status: "", category: "", verification: "", clubRole: "",
    activity: "", createdFrom: "", createdTo: "", sort: "createdAt", dir: "desc",
  };
  if (typeof window === "undefined") return base;
  const params = new URLSearchParams(window.location.search);
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value) (base as Record<string, string>)[key] = value;
  }
  return base;
}

/** A date input is a local calendar day; the API compares in UTC. */
function dayStartUtc(day: string) {
  return day ? `${day}T00:00:00.000Z` : "";
}
function dayEndUtc(day: string) {
  return day ? `${day}T23:59:59.999Z` : "";
}

export default function UsersPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(readFilters);
  const [debouncedQuery, setDebouncedQuery] = useState(filters.query);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(filters.query), 300);
    return () => clearTimeout(timer);
  }, [filters.query]);

  // Any filter change invalidates the current offset — page 3 of "all users"
  // is not page 3 of "suspended coaches".
  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, filters.status, filters.category, filters.verification, filters.clubRole, filters.activity, filters.createdFrom, filters.createdTo, filters.sort, filters.dir]);

  // Keep the URL shareable without adding a history entry per keystroke.
  useEffect(() => {
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = key === "query" ? debouncedQuery : filters[key];
      const isDefault = (key === "sort" && value === "createdAt") || (key === "dir" && value === "desc");
      if (value && !isDefault) params.set(key, value);
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [debouncedQuery, filters]);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      setError(null);
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("query", debouncedQuery);
      for (const key of ["status", "category", "verification", "clubRole", "activity"] as const) {
        if (filters[key]) params.set(key, filters[key]);
      }
      if (filters.createdFrom) params.set("createdFrom", dayStartUtc(filters.createdFrom));
      if (filters.createdTo) params.set("createdTo", dayEndUtc(filters.createdTo));
      params.set("sort", filters.sort);
      params.set("dir", filters.dir);
      params.set("take", String(PAGE_SIZE));
      params.set("skip", String(page * PAGE_SIZE));
      const res = await api.get<UserListResponse>(`/users?${params.toString()}`);
      if (seq !== requestSeq.current) return;
      setRows(res.users);
      setTotal(res.total);
      setCounts(res.counts);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [debouncedQuery, filters, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);
  const filtersActive = FILTER_KEYS.some((key) => key !== "sort" && key !== "dir" && filters[key]);

  function clearFilters() {
    setFilters((current) => ({ ...readEmpty(), sort: current.sort, dir: current.dir }));
    setDebouncedQuery("");
  }

  function toggleSort(field: UserSortField) {
    setFilters((current) =>
      current.sort === field
        ? { ...current, dir: current.dir === "asc" ? "desc" : "asc" }
        : { ...current, sort: field, dir: field === "name" ? "asc" : "desc" },
    );
  }

  const open = (user: UserRow) => router.push(`/users/${user.id}`);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Every account on the platform. Open a user to manage their status, roles, sessions and history. Every sensitive action requires a reason and is written to the audit log."
      />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "Active accounts", value: counts.active, icon: "verified_user", tone: "green" },
          { label: "Active today", value: counts.activeToday, icon: "bolt", tone: "blue" },
          { label: "Suspended", value: counts.suspended, icon: "block", tone: "red" },
          { label: "Never active", value: counts.neverActive, icon: "person_off", tone: "gray", note: "No activity recorded" },
        ]}
      />
      <p className="mb-4 px-1 text-xs font-semibold text-drift-text-secondary">
        Platform-wide totals, not the current filter. {counts.players} players · {counts.coaches} coaches · {counts.clubStaff} club staff (categories overlap) ·{" "}
        {counts.unverified} unverified · {counts.deleted} deleted. Activity is recorded from the moment tracking shipped; older accounts show &ldquo;never recorded&rdquo; until they next sign in.
      </p>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <Field label="Search">
              <Input
                type="search"
                placeholder="Search by email or name..."
                value={filters.query}
                onChange={(e) => set("query", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Category">
            <Select value={filters.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Any category</option>
              <option value="PLAYER">Players</option>
              <option value="COACH">Coaches</option>
              <option value="CLUB_STAFF">Club staff</option>
            </Select>
          </Field>
          <Field label="Club role">
            <Select value={filters.clubRole} onChange={(e) => set("clubRole", e.target.value)}>
              <option value="">Any club role</option>
              {CLUB_ROLES.map((role) => (
                <option key={role} value={role}>{role.replaceAll("_", " ").toLowerCase()}</option>
              ))}
            </Select>
          </Field>
          <Field label="Account status">
            <Select value={filters.status} onChange={(e) => set("status", e.target.value)}>
              <option value="">Any status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DELETED">Deleted</option>
            </Select>
          </Field>
          <Field label="Verification">
            <Select value={filters.verification} onChange={(e) => set("verification", e.target.value)}>
              <option value="">Any verification</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="RESTRICTED">Restricted</option>
            </Select>
          </Field>
          <Field label="Last active">
            <Select value={filters.activity} onChange={(e) => set("activity", e.target.value)}>
              <option value="">Any activity</option>
              {(Object.keys(ACTIVITY_FILTER_LABEL) as ActivityFilter[]).map((key) => (
                <option key={key} value={key}>{ACTIVITY_FILTER_LABEL[key]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Registered from">
            <Input type="date" value={filters.createdFrom} max={filters.createdTo || undefined} onChange={(e) => set("createdFrom", e.target.value)} />
          </Field>
          <Field label="Registered to">
            <Input type="date" value={filters.createdTo} min={filters.createdFrom || undefined} onChange={(e) => set("createdTo", e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-drift-text-secondary">
          <span>Dates and &ldquo;today&rdquo; use UTC.</span>
          {filtersActive && (
            <Button variant="ghost" icon="filter_alt_off" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {rows === null && !error && <EmptyState message="Loading users..." icon="hourglass_empty" />}
      {rows?.length === 0 && (
        <EmptyState
          message={filtersActive ? "No users match these filters." : "No users yet."}
          description={filtersActive ? "Try widening the date range or clearing a filter." : undefined}
          icon="person_search"
        />
      )}

      {rows && rows.length > 0 && (
        <div aria-busy={loading} className={loading ? "opacity-70 transition-opacity" : "transition-opacity"}>
          {/* Phone: stacked cards. The wide table would need horizontal scroll. */}
          <ul className="grid gap-3 sm:hidden">
            {rows.map((user) => (
              <li key={user.id}>
                <Link
                  href={`/users/${user.id}`}
                  className="block rounded-lg border border-drift-border bg-drift-surface p-4 shadow-[0_1px_3px_rgba(17,24,39,0.05)] focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary"
                >
                  <div className="font-bold text-drift-text-primary">{displayName(user)}</div>
                  <div className="mt-0.5 truncate text-sm text-drift-text-secondary">{user.email ?? "-"}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={statusTone(user.accountStatus)}>{user.accountStatus}</Badge>
                    {user.categories.map((cat) => (
                      <Badge key={cat} tone="info">{USER_CATEGORY_LABEL[cat as UserCategory]}</Badge>
                    ))}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-drift-text-secondary">
                    Last active: {formatLastActive(user.lastActiveAt)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden sm:block">
            <DataTable
              rows={rows}
              rowKey={(user) => user.id}
              onRowClick={open}
              columns={[
                {
                  header: "Account",
                  cell: (user) => (
                    <div className="min-w-0">
                      <div className="font-bold text-drift-text-primary">{displayName(user)}</div>
                      <div className="mt-0.5 text-sm text-drift-text-secondary">{user.email ?? "-"}</div>
                    </div>
                  ),
                },
                {
                  header: "Type",
                  cell: (user) =>
                    user.categories.length === 0 ? (
                      <span className="text-sm text-drift-text-secondary">Incomplete signup</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {user.categories.map((cat) => (
                          <Badge key={cat} tone="info">{USER_CATEGORY_LABEL[cat as UserCategory]}</Badge>
                        ))}
                        {user.coachListingSuspended && <Badge tone="warning">Listing hidden</Badge>}
                      </div>
                    ),
                },
                {
                  header: "Club roles",
                  cell: (user) =>
                    user.clubRoles.length === 0 ? (
                      <span className="text-sm text-drift-text-secondary">-</span>
                    ) : (
                      <div className="text-sm text-drift-text-secondary">
                        {user.clubRoles.map((role) => (
                          <div key={`${role.clubId}-${role.role}`} className="font-semibold">
                            {role.role.replaceAll("_", " ").toLowerCase()}
                            <span className="font-normal"> · {role.clubName}</span>
                          </div>
                        ))}
                      </div>
                    ),
                },
                {
                  header: "Status",
                  cell: (user) => (
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={statusTone(user.accountStatus)}>{user.accountStatus}</Badge>
                      {user.verificationStatus !== "VERIFIED" && (
                        <Badge tone={statusTone(user.verificationStatus)}>{user.verificationStatus.replaceAll("_", " ")}</Badge>
                      )}
                    </div>
                  ),
                },
                { header: "Joined", cell: (user) => formatDate(user.createdAt) },
                {
                  header: "Last active",
                  cell: (user) => (
                    <span className={user.lastActiveAt ? "" : "text-drift-text-secondary"}>
                      {formatLastActive(user.lastActiveAt)}
                    </span>
                  ),
                },
              ]}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-drift-text-secondary">
              <span>Showing {from}-{to} of {total}</span>
              <span className="flex items-center gap-1.5">
                Sort
                {([["createdAt", "Joined"], ["lastActiveAt", "Last active"], ["name", "Name"]] as const).map(([field, label]) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => toggleSort(field)}
                    aria-pressed={filters.sort === field}
                    className={`rounded-md border px-2 py-1 font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-drift-primary ${
                      filters.sort === field
                        ? "border-drift-primary bg-drift-primary-light text-drift-primary-dark"
                        : "border-drift-border bg-drift-surface"
                    }`}
                  >
                    {label}
                    {filters.sort === field && (filters.dir === "asc" ? " ↑" : " ↓")}
                  </button>
                ))}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" icon="chevron_left" disabled={page === 0 || loading} onClick={() => setPage((c) => Math.max(0, c - 1))}>
                Previous
              </Button>
              <Button variant="secondary" icon="chevron_right" disabled={to >= total || loading} onClick={() => setPage((c) => c + 1)}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function readEmpty(): Filters {
  return {
    query: "", status: "", category: "", verification: "", clubRole: "",
    activity: "", createdFrom: "", createdTo: "", sort: "createdAt", dir: "desc",
  };
}

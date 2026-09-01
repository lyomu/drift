"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import { DataTable } from "@/components/DataTable";
import { UserDetailModal } from "@/components/UserDetailModal";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, statusTone } from "@/components/ui";
import {
  USER_CATEGORY_LABEL,
  type UserCategory,
  type UserListResponse,
  type UserRow,
} from "@/lib/user-types";

const PAGE_SIZE = 50;

const EMPTY_COUNTS: UserListResponse["counts"] = {
  active: 0,
  suspended: 0,
  deleted: 0,
  players: 0,
  coaches: 0,
  clubStaff: 0,
};

export default function UsersPage() {
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("query") ?? "";
  });
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const requestSeq = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Any filter change invalidates the current offset — page 3 of "all users"
  // is not page 3 of "suspended coaches".
  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, status, category]);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      setError(null);
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("query", debouncedQuery);
      if (status) params.set("status", status);
      if (category) params.set("category", category);
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
    }
  }, [debouncedQuery, status, category, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatusFor(user: UserRow, next: "ACTIVE" | "SUSPENDED") {
    const verb = next === "SUSPENDED" ? "Suspend" : "Restore";
    if (!window.confirm(`${verb} ${user.email ?? "this user"}?`)) return;
    setBusyId(user.id);
    try {
      await api.patch(`/users/${user.id}/status`, { status: next });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Every account on the platform, by category. Suspension blocks login, revokes live sessions, and is written to the audit log."
      />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "Active", value: counts.active, icon: "verified_user", tone: "green" },
          { label: "Suspended", value: counts.suspended, icon: "block", tone: "red" },
          { label: "Players", value: counts.players, icon: "sports_tennis" },
          { label: "Coaches", value: counts.coaches, icon: "school" },
          { label: "Club staff", value: counts.clubStaff, icon: "corporate_fare" },
        ]}
      />
      <p className="mb-4 px-1 text-xs font-semibold text-drift-text-secondary">
        Platform-wide totals, not the current filter. Categories overlap — a club owner who plays
        and coaches counts in all three — so they add up to more than the {counts.active + counts.suspended + counts.deleted} accounts on record.
      </p>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_190px_190px]">
          <Field label="Search">
            <Input
              placeholder="Search by email or name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Any category</option>
              <option value="PLAYER">Players</option>
              <option value="COACH">Coaches</option>
              <option value="CLUB_STAFF">Club staff</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DELETED">Deleted</option>
            </Select>
          </Field>
        </div>
      </Card>

      {rows === null && !error && <EmptyState message="Loading..." />}
      {rows?.length === 0 && <EmptyState message="No users match." />}

      {rows && rows.length > 0 && (
        <div>
          <DataTable
            rows={rows}
            rowKey={(user) => user.id}
            onRowClick={(user) => setOpenUserId(user.id)}
            columns={[
              {
                header: "Account",
                cell: (user) => {
                  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "-";
                  return (
                    <div className="min-w-0">
                      <div className="font-bold text-drift-text-primary">{name}</div>
                      <div className="mt-0.5 text-sm text-drift-text-secondary">{user.email ?? "-"}</div>
                    </div>
                  );
                },
              },
              {
                header: "Type",
                cell: (user) =>
                  user.categories.length === 0 ? (
                    <span className="text-sm text-drift-text-secondary">Incomplete signup</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {user.categories.map((cat) => (
                        <Badge key={cat} tone="info">
                          {USER_CATEGORY_LABEL[cat as UserCategory]}
                        </Badge>
                      ))}
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
                      <Badge tone={statusTone(user.verificationStatus)}>
                        {user.verificationStatus.replaceAll("_", " ")}
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                header: "Joined",
                cell: (user) => new Date(user.createdAt).toLocaleDateString(),
              },
              {
                header: "Actions",
                className: "text-right",
                cell: (user) =>
                  user.accountStatus !== "DELETED" ? (
                    <Button
                      variant={user.accountStatus === "SUSPENDED" ? "secondary" : "destructive"}
                      icon={user.accountStatus === "SUSPENDED" ? "restart_alt" : "block"}
                      disabled={busyId === user.id}
                      onClick={(event) => {
                        // The row itself opens the detail modal.
                        event.stopPropagation();
                        void setStatusFor(
                          user,
                          user.accountStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
                        );
                      }}
                    >
                      {busyId === user.id ? "Working..." : user.accountStatus === "SUSPENDED" ? "Restore" : "Suspend"}
                    </Button>
                  ) : (
                    <span className="text-sm text-drift-text-secondary">-</span>
                  ),
              },
            ]}
          />

          <div className="flex items-center justify-between gap-3 px-1 py-3">
            <div className="text-xs font-semibold text-drift-text-secondary">
              Showing {from}-{to} of {total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                icon="chevron_left"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                icon="chevron_right"
                disabled={to >= total}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {openUserId && (
        <UserDetailModal
          userId={openUserId}
          onClose={() => setOpenUserId(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RowCard, StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, statusTone } from "@/components/ui";

interface UserRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  accountStatus: string;
  onboardingStep: string;
  createdAt: string;
}

export default function UsersPage() {
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("query") ?? "";
  });
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const requestSeq = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      setError(null);
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("query", debouncedQuery);
      if (status) params.set("status", status);
      params.set("take", "100");
      const res = await api.get<{ total: number; users: UserRow[] }>(`/users?${params.toString()}`);
      if (seq !== requestSeq.current) return;
      setRows(res.users);
      setTotal(res.total);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    }
  }, [debouncedQuery, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatusFor(user: UserRow, next: "ACTIVE" | "SUSPENDED") {
    const verb = next === "SUSPENDED" ? "Suspend" : "Restore";
    if (!window.confirm(`${verb} ${user.email}?`)) return;
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

  const counts = useMemo(() => ({
    active: rows?.filter((row) => row.accountStatus === "ACTIVE").length ?? 0,
    suspended: rows?.filter((row) => row.accountStatus === "SUSPENDED").length ?? 0,
    deleted: rows?.filter((row) => row.accountStatus === "DELETED").length ?? 0,
  }), [rows]);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Every player account on the platform. Suspension blocks login, revokes live sessions, and is written to the audit log."
      />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "Showing", value: rows?.length ?? 0, note: `${total} matching accounts`, icon: "groups" },
          { label: "Active", value: counts.active, icon: "verified_user", tone: "green" },
          { label: "Suspended", value: counts.suspended, icon: "block", tone: "red" },
          { label: "Deleted", value: counts.deleted, icon: "delete", tone: "gray" },
        ]}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_190px]">
          <Field label="Search">
            <Input
              placeholder="Search by email or name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
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
        <div className="grid gap-3">
          {rows.map((user) => {
            const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "-";
            return (
              <RowCard key={user.id}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-bold text-drift-text-primary">{name}</div>
                    <div className="mt-0.5 text-sm text-drift-text-secondary">{user.email}</div>
                    <div className="mt-2 text-xs font-semibold text-drift-text-secondary">
                      Joined {new Date(user.createdAt).toLocaleDateString()} / {user.onboardingStep.replace(/_/g, " ").toLowerCase()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <Badge tone={statusTone(user.accountStatus)}>{user.accountStatus}</Badge>
                    {user.accountStatus !== "DELETED" && (
                      <Button
                        variant={user.accountStatus === "SUSPENDED" ? "secondary" : "destructive"}
                        icon={user.accountStatus === "SUSPENDED" ? "restart_alt" : "block"}
                        disabled={busyId === user.id}
                        onClick={() =>
                          setStatusFor(
                            user,
                            user.accountStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
                          )
                        }
                      >
                        {busyId === user.id ? "Working..." : user.accountStatus === "SUSPENDED" ? "Restore" : "Suspend"}
                      </Button>
                    )}
                  </div>
                </div>
              </RowCard>
            );
          })}
          <div className="px-1 text-xs font-semibold text-drift-text-secondary">Showing {rows.length} of {total}</div>
        </div>
      )}
    </div>
  );
}

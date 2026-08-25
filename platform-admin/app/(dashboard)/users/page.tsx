"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  PageHeader,
  Select,
  Td,
  Th,
  statusTone,
} from "@/components/ui";

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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (query) params.set("query", query);
      if (status) params.set("status", status);
      params.set("take", "100");
      const res = await api.get<{ total: number; users: UserRow[] }>(
        `/users?${params.toString()}`,
      );
      setRows(res.users);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    }
  }, [query, status]);

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

  return (
    <div>
      <PageHeader
        title="Users"
        description="Every player account on the platform. Suspension blocks login, revokes live sessions, and is written to the audit log."
      />
      <ErrorBanner message={error} />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search by email or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="max-w-[180px]"
          >
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DELETED">Deleted</option>
          </Select>
        </div>
      </Card>

      {rows === null && !error && <EmptyState message="Loading…" />}
      {rows?.length === 0 && <EmptyState message="No users match." />}

      {rows && rows.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Status</Th>
                <Th>Onboarding</Th>
                <Th>Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <Td>
                    <div className="font-semibold">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                    </div>
                    <div className="text-drift-text-secondary">{u.email}</div>
                  </Td>
                  <Td>
                    <Badge tone={statusTone(u.accountStatus)}>{u.accountStatus}</Badge>
                  </Td>
                  <Td>{u.onboardingStep.replace(/_/g, " ").toLowerCase()}</Td>
                  <Td>{new Date(u.createdAt).toLocaleDateString()}</Td>
                  <Td className="text-right">
                    {u.accountStatus !== "DELETED" && (
                      <Button
                        variant={u.accountStatus === "SUSPENDED" ? "secondary" : "destructive"}
                        disabled={busyId === u.id}
                        onClick={() =>
                          setStatusFor(
                            u,
                            u.accountStatus === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
                          )
                        }
                      >
                        {busyId === u.id
                          ? "Working…"
                          : u.accountStatus === "SUSPENDED"
                            ? "Restore"
                            : "Suspend"}
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 text-xs text-drift-text-secondary">
            Showing {rows.length} of {total}
          </div>
        </Card>
      )}
    </div>
  );
}

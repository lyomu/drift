"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, ErrorBanner, Input, PageHeader } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import { useClub } from "@/lib/club-context";
import type { CoachAdmin } from "@/lib/types";

function coachName(coach: CoachAdmin) {
  return [coach.firstName, coach.lastName].filter(Boolean).join(" ") || "Coach";
}

export default function CoachesPage() {
  const { clubId, role } = useClub();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [coaches, setCoaches] = useState<CoachAdmin[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    api
      .get<{ coaches: CoachAdmin[] }>(`/clubs/${clubId}/coaches`)
      .then((response) => {
        if (!cancelled) {
          setError(null);
          setCoaches(response.coaches);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof ApiError ? reason.message : "Failed to load coaches.",
          );
          setCoaches([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const visible = useMemo(() => {
    if (!coaches) return null;
    const needle = query.trim().toLowerCase();
    if (!needle) return coaches;
    return coaches.filter((coach) =>
      [
        coachName(coach),
        coach.accountEmail ?? "",
        coach.specialisations.join(" "),
        coach.levels.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [coaches, query]);

  return (
    <div>
      <PageHeader
        title="Coaches"
        description="Public coaching profiles affiliated with this club."
        action={
          canManage ? (
            <Link href="/coaches/new">
              <Button>Add coach</Button>
            </Link>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />

      <div className="mb-4 max-w-sm">
        <Input
          aria-label="Filter coaches"
          placeholder="Filter by name or specialisation…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {visible === null ? (
        <p className="text-sm text-drift-text-secondary">Loading…</p>
      ) : (
        <DataTable
          rows={visible}
          rowKey={(coach) => coach.id}
          emptyMessage={
            canManage
              ? "Add your first coach"
              : "No coaches are affiliated with this club yet."
          }
          columns={[
            {
              header: "Coach",
              cell: (coach) => (
                <div>
                  <Link
                    href={`/coaches/${coach.id}`}
                    className="font-semibold text-drift-primary hover:underline"
                  >
                    {coachName(coach)}
                  </Link>
                  <div className="text-xs text-drift-text-secondary">
                    {coach.accountEmail}
                  </div>
                </div>
              ),
            },
            {
              header: "Specialisations",
              cell: (coach) => coach.specialisations.join(", ") || "—",
            },
            {
              header: "Levels",
              cell: (coach) =>
                coach.levels.map((level) => level.toLowerCase()).join(", ") || "—",
            },
            {
              header: "Verification",
              cell: (coach) => (
                <StatusBadge status={coach.verificationStatus} />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

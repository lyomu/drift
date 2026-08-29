"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Card, EmptyState, ErrorBanner, Input, PageHeader } from "@/components/ui";
import { InitialsAvatar, RowCard } from "@/components/dashboard-design";
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
          placeholder="Filter by name or specialisation..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {visible === null ? (
        <EmptyState message="Loading..." />
      ) : visible.length === 0 ? (
        <EmptyState
          message={
            canManage
              ? "Add your first coach"
              : "No coaches are affiliated with this club yet."
          }
        />
      ) : (
        <Card className="p-2">
          <div className="flex flex-col">
            {visible.map((coach) => (
              <Link href={`/coaches/${coach.id}`} key={coach.id}>
                <RowCard className="flex cursor-pointer items-center gap-3.5 p-3.5">
                  <InitialsAvatar name={coachName(coach)} />
                  <div className="min-w-0 flex-[1.1]">
                    <div className="truncate text-[13.5px] font-bold text-drift-text-primary">
                      {coachName(coach)}
                    </div>
                    <div className="truncate text-xs text-drift-text-secondary">
                      {coach.accountEmail ?? "No account email"}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-[1.3] flex-wrap gap-1.5">
                    {(coach.specialisations.length
                      ? coach.specialisations
                      : coach.levels
                    )
                      .slice(0, 3)
                      .map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full bg-drift-neutral-surface px-2.5 py-[3px] text-[11.5px] font-semibold text-drift-text-secondary"
                        >
                          {chip.replace(/_/g, " ")}
                        </span>
                      ))}
                  </div>
                  <StatusBadge status={coach.verificationStatus} />
                </RowCard>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

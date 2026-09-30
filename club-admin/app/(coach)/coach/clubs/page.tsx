"use client";

import { useEffect, useState } from "react";
import {
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
} from "@/components/ui";
import { MaterialIcon } from "@/components/dashboard-design";
import { ApiError } from "@/lib/api-client";
import { coachApi } from "@/lib/coach-api";
import type { CoachClub } from "@/lib/types";

/**
 * Read-only. Club membership is granted from the club's own console, and
 * mirroring that management here would mean two places to revoke it from.
 * What a coach needs is to see where they are listed.
 */
export default function CoachClubsPage() {
  const [clubs, setClubs] = useState<CoachClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await coachApi.myClubs();
        setClubs(res.clubs);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Something went wrong.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <PageHeader
        title="Clubs"
        description="The clubs your coaching profile is listed at."
      />
      <ErrorBanner message={error} />

      {loading ? (
        <EmptyState message="Loading…" />
      ) : clubs.length === 0 ? (
        <EmptyState
          icon="groups"
          title="Not linked to a club"
          description="A club administrator adds you from their own console using your Drift account email. You do not need a club to be listed as a coach."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {clubs.map((club) => (
            <Card key={club.id}>
              <div className="flex items-center gap-3">
                <MaterialIcon
                  name="groups"
                  className="text-xl text-drift-text-secondary"
                />
                <span className="text-sm font-bold text-drift-text-primary">
                  {club.name}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

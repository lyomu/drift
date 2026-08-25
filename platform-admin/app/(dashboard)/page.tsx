"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  statusTone,
} from "@/components/ui";

interface Counts {
  users: number;
  openReports: { player: number; message: number; court: number };
  disputes: number;
}

export default function OverviewPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [users, player, message, court, disputes] = await Promise.all([
          api.get<{ total: number }>("/users?take=1"),
          api.get<{ reports: unknown[] }>("/reports/player?status=OPEN"),
          api.get<{ reports: unknown[] }>("/reports/message?status=OPEN"),
          api.get<{ reports: unknown[] }>("/reports/court?status=OPEN"),
          api.get<{ disputes: unknown[] }>("/disputes"),
        ]);
        setCounts({
          users: users.total,
          openReports: {
            player: player.reports.length,
            message: message.reports.length,
            court: court.reports.length,
          },
          disputes: disputes.disputes.length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load.");
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="Governance state across the whole Drift ecosystem."
      />
      <ErrorBanner message={error} />
      {!counts && !error && (
        <EmptyState message="Loading platform state…" />
      )}
      {counts && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <div className="text-sm font-semibold text-drift-text-secondary">
              Player accounts
            </div>
            <div className="mt-1 font-display text-3xl font-bold text-drift-text-primary">
              {counts.users}
            </div>
            <Link
              href="/users"
              className="mt-2 inline-block text-sm font-semibold text-drift-primary hover:underline"
            >
              Manage users →
            </Link>
          </Card>

          <Card>
            <div className="text-sm font-semibold text-drift-text-secondary">
              Open reports
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={counts.openReports.player > 0 ? "warning" : "success"}>
                Players · {counts.openReports.player}
              </Badge>
              <Badge tone={counts.openReports.message > 0 ? "warning" : "success"}>
                Messages · {counts.openReports.message}
              </Badge>
              <Badge tone={counts.openReports.court > 0 ? "warning" : "success"}>
                Courts · {counts.openReports.court}
              </Badge>
            </div>
            <Link
              href="/reports"
              className="mt-3 inline-block text-sm font-semibold text-drift-primary hover:underline"
            >
              Triage reports →
            </Link>
          </Card>

          <Card>
            <div className="text-sm font-semibold text-drift-text-secondary">
              Disputes awaiting a ruling
            </div>
            <div className="mt-2">
              <Badge tone={counts.disputes > 0 ? "error" : "success"}>
                {counts.disputes === 0
                  ? "None — every dispute is settled"
                  : `${counts.disputes} disputed match${counts.disputes === 1 ? "" : "es"}`}
              </Badge>
            </div>
            <Link
              href="/disputes"
              className="mt-3 inline-block text-sm font-semibold text-drift-primary hover:underline"
            >
              Review disputes →
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}

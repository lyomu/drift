"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import type { CommunityStatus, CommunitySummary } from "@/lib/community-types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  PageHeader,
  plural,
  statusTone,
} from "@/components/ui";

const TABS: { status: CommunityStatus; label: string }[] = [
  { status: "PENDING", label: "Pending review" },
  { status: "APPROVED", label: "Approved" },
  { status: "SUSPENDED", label: "Suspended" },
  { status: "REJECTED", label: "Rejected" },
];

function label(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}

/**
 * Community review queue (2026-11). Every community a player creates in the
 * app, and every club community created from club-admin, waits here until
 * approved; until then only its creator can see it.
 */
export default function CommunitiesPage() {
  const [status, setStatus] = useState<CommunityStatus>("PENDING");
  const [query, setQuery] = useState("");
  const [communities, setCommunities] = useState<CommunitySummary[] | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ status });
      if (query.trim()) params.set("q", query.trim());
      const res = await api.get<{ communities: CommunitySummary[] }>(
        `/communities?${params.toString()}`,
      );
      setCommunities(res.communities);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Communities could not be loaded.",
      );
    }
  }, [status, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(
    community: CommunitySummary,
    action: "approve" | "reject",
  ) {
    let note: string | undefined;
    if (action === "reject") {
      const reason = window.prompt(
        `Reason for rejecting "${community.name}". The creator sees this in the app.`,
      );
      if (reason === null) return;
      if (!reason.trim()) {
        setError("A rejection reason is required.");
        return;
      }
      note = reason.trim();
    }
    setBusyId(community.id);
    setError(null);
    try {
      await api.patch(`/communities/${community.id}/${action}`, { note });
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The decision could not be saved.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Communities"
        description="Player and club communities. New ones wait here for review; approving one opens it to everyone and starts its group chat."
      />
      <ErrorBanner message={error} />

      <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <Button
              key={tab.status}
              variant={tab.status === status ? "primary" : "secondary"}
              onClick={() => {
                setStatus(tab.status);
                setCommunities(null);
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto w-full max-w-xs">
          <Input
            aria-label="Search communities"
            placeholder="Search by name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </Card>

      {communities === null && !error && (
        <EmptyState message="Loading communities..." />
      )}
      {communities?.length === 0 && (
        <EmptyState
          message={
            status === "PENDING"
              ? "Nothing waiting for review"
              : "No communities match."
          }
        />
      )}

      {communities && communities.length > 0 && (
        <div className="flex flex-col gap-4">
          {communities.map((community) => (
            <Card key={community.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/communities/${community.id}`}
                      className="font-display text-xl font-semibold text-drift-text-primary hover:text-drift-primary"
                    >
                      {community.name}
                    </Link>
                    <Badge tone={statusTone(community.status)}>
                      {label(community.status)}
                    </Badge>
                    <Badge tone="info">{label(community.type)}</Badge>
                    {community.isDemo && <Badge tone="neutral">Demo</Badge>}
                    {(community.openReportCount ?? 0) > 0 && (
                      <Badge tone="error">
                        {community.openReportCount}{" "}
                        {plural(community.openReportCount ?? 0, "open report")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-drift-text-secondary">
                    {community.city} · {label(community.frequency)} ·{" "}
                    {community.joinPolicy === "OPEN"
                      ? "Anyone can join"
                      : "Join by request"}{" "}
                    · {community.memberCount}{" "}
                    {plural(community.memberCount, "member")}
                    {community.clubName ? ` · Club: ${community.clubName}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-drift-text-secondary">
                    Created by {community.createdBy.displayName}
                    {community.createdBy.email
                      ? ` (${community.createdBy.email})`
                      : ""}{" "}
                    · {new Date(community.createdAt).toLocaleString()}
                  </p>
                  {community.about && (
                    <p className="mt-2 max-w-2xl text-sm text-drift-text-primary">
                      {community.about}
                    </p>
                  )}
                  {community.decisionNote && (
                    <p className="mt-2 text-sm text-drift-text-secondary">
                      Note: {community.decisionNote}
                    </p>
                  )}
                </div>
                {community.status === "PENDING" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="destructive"
                      disabled={busyId === community.id}
                      onClick={() => void decide(community, "reject")}
                    >
                      Reject
                    </Button>
                    <Button
                      disabled={busyId === community.id}
                      onClick={() => void decide(community, "approve")}
                    >
                      {busyId === community.id ? "Saving..." : "Approve"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

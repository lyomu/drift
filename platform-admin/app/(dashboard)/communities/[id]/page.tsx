"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError, mediaUrl } from "@/lib/api-client";
import type { CommunityDetail } from "@/lib/community-types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Td,
  Th,
  statusTone,
} from "@/components/ui";

function label(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}

/** One community: details, members, reports against it and its own
 * audit trail, plus the review and moderation actions for its status. */
export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<CommunityDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDetail(await api.get<CommunityDetail>(`/communities/${params.id}`));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "The community could not be loaded.",
      );
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(
    action: "approve" | "reject" | "suspend" | "restore" | "delete",
  ) {
    if (!detail) return;
    const name = detail.community.name;
    let note: string | undefined;
    if (action === "reject" || action === "suspend") {
      const reason = window.prompt(
        action === "reject"
          ? `Reason for rejecting "${name}". The creator sees this in the app.`
          : `Reason for suspending "${name}" (kept on record).`,
      );
      if (reason === null) return;
      if (action === "reject" && !reason.trim()) {
        setError("A rejection reason is required.");
        return;
      }
      note = reason.trim() || undefined;
    }
    if (
      action === "delete" &&
      !window.confirm(
        `Delete "${name}" permanently? Members are told it was closed. Its chat, leagues and ladders are deleted too.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (action === "delete") {
        await api.delete(`/communities/${detail.community.id}`);
        router.push("/communities");
        return;
      }
      await api.patch(`/communities/${detail.community.id}/${action}`, { note });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return (
      <div>
        <ErrorBanner message={error} />
        {!error && <EmptyState message="Loading community..." />}
      </div>
    );
  }

  const { community, members, requests, reports, auditLog } = detail;

  return (
    <div>
      <Link href="/communities" className="text-sm font-semibold text-drift-primary">
        ← Communities
      </Link>
      <PageHeader title={community.name} description={`${label(community.type)} community in ${community.city}`} />
      <ErrorBanner message={error} />

      <Card className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-4">
            {community.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(community.photoUrl)}
                alt=""
                className="h-20 w-20 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(community.status)}>{label(community.status)}</Badge>
                <Badge tone="info">{label(community.type)}</Badge>
                {community.isDemo && <Badge tone="neutral">Demo</Badge>}
              </div>
              <p className="mt-2 text-sm text-drift-text-secondary">
                {label(community.frequency)} ·{" "}
                {community.joinPolicy === "OPEN" ? "Anyone can join" : "Join by request"} ·{" "}
                {community.memberCount} members
                {community.clubName ? ` · Club: ${community.clubName}` : ""}
              </p>
              <p className="mt-1 text-sm text-drift-text-secondary">
                Created by {community.createdBy.displayName}
                {community.createdBy.email ? ` (${community.createdBy.email})` : ""} ·{" "}
                {new Date(community.createdAt).toLocaleString()}
              </p>
              {community.about && (
                <p className="mt-3 max-w-2xl text-sm text-drift-text-primary">{community.about}</p>
              )}
              {community.decisionNote && (
                <p className="mt-2 text-sm text-drift-text-secondary">
                  Note: {community.decisionNote}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {community.status === "PENDING" && (
              <>
                <Button variant="destructive" disabled={busy} onClick={() => void act("reject")}>
                  Reject
                </Button>
                <Button disabled={busy} onClick={() => void act("approve")}>
                  Approve
                </Button>
              </>
            )}
            {community.status === "APPROVED" && (
              <Button variant="destructive" disabled={busy} onClick={() => void act("suspend")}>
                Suspend
              </Button>
            )}
            {community.status === "SUSPENDED" && (
              <Button disabled={busy} onClick={() => void act("restore")}>
                Restore
              </Button>
            )}
            <Button variant="secondary" disabled={busy} onClick={() => void act("delete")}>
              Delete
            </Button>
          </div>
        </div>
      </Card>

      <Card className="mb-5">
        <h2 className="mb-3 font-display text-lg font-semibold text-drift-text-primary">
          Members ({members.length})
          {requests.length > 0 ? ` · ${requests.length} waiting` : ""}
        </h2>
        {members.length + requests.length === 0 ? (
          <EmptyState message="No members." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Since</Th>
                </tr>
              </thead>
              <tbody>
                {[...members, ...requests].map((member) => (
                  <tr key={member.userId}>
                    <Td>{member.displayName}</Td>
                    <Td>{label(member.role)}</Td>
                    <Td>
                      <Badge tone={member.status === "ACTIVE" ? "success" : "warning"}>
                        {member.status === "ACTIVE" ? "Member" : "Requested"}
                      </Badge>
                    </Td>
                    <Td>{new Date(member.since).toLocaleDateString()}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mb-5">
        <h2 className="mb-3 font-display text-lg font-semibold text-drift-text-primary">
          Reports ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <EmptyState message="No one has reported this community." />
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report) => (
              <div key={report.id} className="rounded-md border border-drift-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(report.status)}>{label(report.status)}</Badge>
                  <Badge tone="neutral">{label(report.reason)}</Badge>
                  <span className="text-sm text-drift-text-secondary">
                    by {report.reporter.displayName} ·{" "}
                    {new Date(report.createdAt).toLocaleString()}
                  </span>
                </div>
                {report.notes && (
                  <p className="mt-2 text-sm text-drift-text-primary">{report.notes}</p>
                )}
              </div>
            ))}
            <Link href="/reports" className="text-sm font-semibold text-drift-primary">
              Review in the Reported Content Queue →
            </Link>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold text-drift-text-primary">
          Community activity
        </h2>
        {auditLog.length === 0 ? (
          <EmptyState message="No membership or settings changes yet." />
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {auditLog.map((entry) => (
              <li key={entry.id} className="text-drift-text-secondary">
                <span className="font-semibold text-drift-text-primary">
                  {label(entry.action)}
                </span>{" "}
                by {entry.actor?.displayName ?? "a deleted account"} ·{" "}
                {new Date(entry.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

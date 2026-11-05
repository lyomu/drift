import { Badge, statusTone } from "@/components/ui";
import { useT } from "@/lib/i18n/i18n-context";
import type { MessageKey } from "@/lib/i18n/messages/en";

const STATUS_KEYS: Record<string, MessageKey> = {
  ACTIVE: "status.ACTIVE", PENDING: "status.PENDING", INVITED: "status.INVITED",
  SUSPENDED: "status.SUSPENDED", UNVERIFIED: "status.UNVERIFIED",
  VERIFIED: "status.VERIFIED", DRAFT: "status.DRAFT",
  PUBLISHED: "status.PUBLISHED", CANCELLED: "status.CANCELLED",
  COMPLETED: "status.COMPLETED", OPEN: "status.OPEN",
  REVIEWING: "status.REVIEWING", RESOLVED: "status.RESOLVED",
  DISMISSED: "status.DISMISSED", REGISTERED: "status.REGISTERED",
  ATTENDED: "status.ATTENDED", NO_SHOW: "status.NO_SHOW",
  PENDING_REVIEW: "status.PENDING_REVIEW",
  CHANGES_REQUESTED: "status.CHANGES_REQUESTED", APPROVED: "status.APPROVED",
  REJECTED: "status.REJECTED", PROPOSED: "status.PROPOSED",
  SCHEDULING: "status.SCHEDULING", SCHEDULED: "status.SCHEDULED",
  DISPUTED: "status.DISPUTED", CONFIRMED: "status.CONFIRMED",
  RUNNING: "status.RUNNING", REGISTRATION_OPEN: "status.REGISTRATION_OPEN",
};

/**
 * Thin wrapper over the shared `Badge` + `statusTone` in `ui.tsx`.
 *
 * This used to carry its own private status-to-tone map, which meant the same
 * status could render one colour here and a different one in Platform Admin.
 * Keeping the mapping in exactly one place per app, and the same mapping in
 * both, is what stops that drifting again. Call sites are unchanged.
 */
export function StatusBadge({ status }: { status: string }) {
  const t = useT();
  return <Badge tone={statusTone(status)}>{STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status.replace(/_/g, " ")}</Badge>;
}

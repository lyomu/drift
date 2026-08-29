import { Badge, statusTone } from "@/components/ui";

/**
 * Thin wrapper over the shared `Badge` + `statusTone` in `ui.tsx`.
 *
 * This used to carry its own private status-to-tone map, which meant the same
 * status could render one colour here and a different one in Platform Admin.
 * Keeping the mapping in exactly one place per app, and the same mapping in
 * both, is what stops that drifting again. Call sites are unchanged.
 */
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{status.replace(/_/g, " ")}</Badge>;
}

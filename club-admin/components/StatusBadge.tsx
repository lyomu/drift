const TONES: Record<string, string> = {
  neutral: "bg-drift-primary-light text-drift-primary-dark",
  success: "bg-drift-success-surface text-drift-success",
  warning: "bg-drift-warning-surface text-drift-warning",
  error: "bg-drift-error-surface text-drift-error",
};

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  ACTIVE: "success",
  PUBLISHED: "success",
  ENROLLED: "success",
  VERIFIED: "success",
  RESOLVED: "success",
  COMPLETED: "success",
  INVITED: "neutral",
  DRAFT: "neutral",
  UNVERIFIED: "neutral",
  WAITLISTED: "neutral",
  REVIEWING: "warning",
  PENDING: "warning",
  OPEN: "warning",
  DISPUTED: "warning",
  SUSPENDED: "error",
  CANCELLED: "error",
  WITHDRAWN: "error",
  DISMISSED: "error",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = TONES[STATUS_TONE[status] ?? "neutral"];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

import type { ReactNode } from "react";

/**
 * Title row for a single settings section. Deliberately lighter than the
 * console-wide `PageHeader` so it reads as a panel heading beneath the one
 * "Platform Settings" title in the layout, not as a competing second page title.
 */
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-[22px] font-bold leading-7 text-drift-text-primary">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-drift-text-secondary">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

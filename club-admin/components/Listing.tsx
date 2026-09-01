import { EmptyState } from "@/components/ui";

/**
 * Frame for a card / row listing. Always renders a header strip — so a list
 * with no rows still shows a labelled table-like container with a designed
 * empty state inside, rather than a bare line of text floating on the page.
 */
export function Listing({
  title,
  count,
  headerRight,
  loading = false,
  empty,
  children,
}: {
  title: string;
  /** Row count. `null`/`undefined` hides the count chip (e.g. while loading). */
  count?: number | null;
  headerRight?: React.ReactNode;
  loading?: boolean;
  empty: {
    icon?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
  children?: React.ReactNode;
}) {
  const isEmpty = !loading && !count;

  return (
    <div className="overflow-hidden rounded-lg border border-drift-border bg-drift-surface">
      <div className="flex items-center justify-between gap-3 border-b border-drift-border bg-drift-primary-light/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-drift-text-secondary">
            {title}
          </span>
          {count != null && (
            <span className="rounded-full bg-drift-surface px-2 py-0.5 text-[11px] font-bold text-drift-text-secondary">
              {count}
            </span>
          )}
        </div>
        {headerRight}
      </div>

      {loading ? (
        <EmptyState bare compact title="Loading…" />
      ) : isEmpty ? (
        <EmptyState
          bare
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
          action={empty.action}
        />
      ) : (
        <div className="flex flex-col gap-2.5 p-3">{children}</div>
      )}
    </div>
  );
}

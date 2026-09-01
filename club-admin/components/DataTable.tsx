import { EmptyState } from "@/components/ui";

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Nothing here yet",
  emptyDescription,
  emptyIcon,
  emptyAction,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: string;
  emptyAction?: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-drift-border bg-drift-surface">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-drift-primary-light">
            {columns.map((col) => (
              <th
                key={col.header}
                className={`border-b border-drift-border px-5 py-4 text-[11px] font-extrabold uppercase text-drift-text-secondary ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-0 py-0">
                <EmptyState
                  bare
                  compact
                  icon={emptyIcon}
                  title={emptyMessage}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="transition-colors last:[&_td]:border-0 hover:bg-drift-primary-light/35"
              >
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className={`border-b border-drift-border px-5 py-4 align-middle text-drift-text-primary ${col.className ?? ""}`}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

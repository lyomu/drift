import { EmptyState } from "@/components/ui";
import { useT } from "@/lib/i18n/i18n-context";

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage,
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
  const t = useT();
  return (
    <div className="overflow-x-auto rounded-2xl border border-drift-border bg-drift-surface shadow-card">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-[13px]">
        <thead>
          <tr className="bg-drift-surface-sunken">
            {columns.map((col) => (
              <th
                key={col.header}
                className={`border-b border-drift-border px-[18px] py-3 text-[11px] font-bold uppercase text-drift-text-secondary ${col.className ?? ""}`}
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
                  title={emptyMessage ?? t("common.nothingHere")}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="transition-colors last:[&_td]:border-0 hover:bg-drift-surface-sunken"
              >
                {columns.map((col) => (
                  <td
                    key={col.header}
                    className={`border-b border-drift-border px-[18px] py-3.5 align-middle text-[13px] text-drift-text-primary ${col.className ?? ""}`}
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

import { EmptyState } from "./ui";

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Nothing here yet.",
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  // Optional so every existing caller keeps its plain, non-interactive table.
  onRowClick?: (row: T) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-drift-border bg-drift-surface shadow-[0_1px_3px_rgba(17,24,39,0.05)]">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-drift-neutral-surface">
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
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={`transition-colors last:[&_td]:border-0 hover:bg-drift-primary-light/45 ${onRowClick ? "cursor-pointer" : ""}`}
              {...(onRowClick
                ? {
                    onClick: () => onRowClick(row),
                    tabIndex: 0,
                    role: "button" as const,
                    onKeyDown: (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    },
                  }
                : {})}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

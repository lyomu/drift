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
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-drift-border px-6 py-12 text-center text-sm text-drift-text-secondary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-drift-border bg-drift-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-drift-border bg-drift-background">
            {columns.map((col) => (
              <th
                key={col.header}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-drift-text-secondary"
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
              className="border-b border-drift-border last:border-0 hover:bg-drift-primary-light/40"
            >
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={`px-4 py-3 align-middle text-drift-text-primary ${col.className ?? ""}`}
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

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
      <div className="rounded-[14px] border border-dashed border-drift-border bg-drift-surface px-6 py-12 text-center text-sm font-semibold text-drift-text-secondary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[14px] border border-drift-border bg-drift-surface">
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="bg-drift-neutral-surface/60">
            {columns.map((col) => (
              <th
                key={col.header}
                className="border-b border-drift-border px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-drift-text-secondary"
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
              className="transition-colors last:[&_td]:border-0 hover:bg-drift-primary-light/45"
            >
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={`border-b border-drift-border px-4 py-3 align-middle text-drift-text-primary ${col.className ?? ""}`}
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

import type { ReactNode } from "react";

export type AdminTableColumn<T> = {
  key: string;
  header: ReactNode;
  cellClassName?: string;
  render: (row: T) => ReactNode;
};

export function AdminTable<T>({
  columns,
  rows,
  getRowKey,
}: {
  columns: AdminTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
}) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-outline-variant text-[11px] font-semibold tracking-[0.1em] uppercase text-outline">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="text-left pb-3 pr-3 last:pr-0"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="border-b border-[#f3f3f3] hover:bg-[#fff8e7]/20 transition-colors duration-150"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-3 pr-3 last:pr-0 align-top text-[13px] text-outline ${col.cellClassName ?? ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


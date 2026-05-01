import type { ReactNode } from "react";
import Spinner from "./Spinner";

interface Column<T extends Record<string, unknown> = Record<string, unknown>> {
  key: string;
  label: string;
  width?: string;
  render?: (value: unknown, row: T) => ReactNode;
}

interface TableProps<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  keyField?: string;
}

/**
 * Tabla genérica con columnas configurables, estado de carga y estado vacío.
 */
function Table<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  emptyMessage = "Sin datos",
  keyField = "id",
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-dark-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-dark-border bg-dark-bg text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-4 py-3 font-semibold text-slate-400 whitespace-nowrap"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <Spinner size="lg" className="mx-auto" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={String(row[keyField] ?? rowIdx)}
                className="border-b border-dark-border last:border-0 hover:bg-dark-bg/40 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-slate-300">
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? "—")}
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

export default Table;

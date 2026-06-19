interface Row {
  label: string;
  values: Record<string, string>;
}

interface ComparisonTableProps {
  columns: { key: string; label: string; highlight?: boolean }[];
  rows: Row[];
}

export default function ComparisonTable({ columns, rows }: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-card-border">
            <th className="text-left py-3 px-4 text-text-muted font-normal">Feature</th>
            {columns.map((col) => (
              <th key={col.key} className={`text-center py-3 px-4 font-semibold ${col.highlight ? "text-accent-cyan" : "text-text-primary"}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-card-border/50">
              <td className="py-3 px-4 text-text-secondary">{row.label}</td>
              {columns.map((col) => (
                <td key={col.key} className={`text-center py-3 px-4 ${col.highlight ? "text-accent-cyan font-medium" : "text-text-muted"}`}>
                  {row.values[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

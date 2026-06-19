interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: "up" | "down" | "neutral";
}

export default function StatCard({ label, value, unit, trend }: StatCardProps) {
  const trendColors = {
    up: "text-green-400",
    down: "text-red-400",
    neutral: "text-text-muted",
  };
  const trendIcons = { up: "↑", down: "↓", neutral: "→" };

  return (
    <div className="glass-card p-4 text-center">
      <p className="text-xs uppercase tracking-widest text-text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-text-primary font-mono">
        {value}
        {unit && <span className="text-sm text-text-muted ml-1">{unit}</span>}
      </p>
      {trend && (
        <span className={`text-xs ${trendColors[trend]}`}>{trendIcons[trend]}</span>
      )}
    </div>
  );
}

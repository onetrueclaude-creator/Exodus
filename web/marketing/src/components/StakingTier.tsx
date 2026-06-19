interface TierRow {
  label: string;
  value: string;
}

interface StakingTierProps {
  name: string;
  rows: TierRow[];
  highlightLabel: string;
  highlightValue: string;
  recommended?: boolean;
}

export default function StakingTier({ name, rows, highlightLabel, highlightValue, recommended }: StakingTierProps) {
  return (
    <div className={`glass-card p-6 relative ${recommended ? "border-accent-cyan shadow-glow" : ""}`}>
      {recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-cyan text-background text-xs font-bold rounded-full">
          Recommended
        </span>
      )}
      <h3 className="text-xl font-bold text-text-primary mb-4">{name}</h3>
      <div className="space-y-3 mb-6">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-sm">
            <span className="text-text-muted">{row.label}</span>
            <span className="text-text-primary font-mono">{row.value}</span>
          </div>
        ))}
        <div className="h-px bg-card-border my-2" />
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">{highlightLabel}</span>
          <span className="text-accent-cyan font-bold font-mono text-lg">{highlightValue}</span>
        </div>
      </div>
    </div>
  );
}

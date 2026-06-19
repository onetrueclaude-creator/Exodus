interface Segment {
  label: string;
  percentage: number;
  color: string;
}

interface TokenDistChartProps {
  segments: Segment[];
}

export default function TokenDistChart({ segments }: TokenDistChartProps) {
  const stops = segments.reduce<{ css: string[]; offset: number }>(
    (acc, seg) => {
      const end = acc.offset + seg.percentage;
      acc.css.push(`${seg.color} ${acc.offset}% ${end}%`);
      return { css: acc.css, offset: end };
    },
    { css: [], offset: 0 },
  ).css;

  const gradientStyle = {
    background: `conic-gradient(${stops.join(", ")})`,
  };

  return (
    <div className="flex flex-col md:flex-row items-center gap-8">
      {/* Donut */}
      <div className="relative w-64 h-64 flex-shrink-0">
        <div className="w-full h-full rounded-full" style={gradientStyle} />
        <div className="absolute inset-8 rounded-full bg-background flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold gradient-text">1B</p>
            <p className="text-xs text-text-muted">AGNTC Supply</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <div>
              <span className="text-sm text-text-primary">{seg.percentage}%</span>
              <span className="text-sm text-text-secondary ml-2">{seg.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

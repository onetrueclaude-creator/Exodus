"use client";

import type { Tier } from "@/types";
import { TIER_LABELS } from "@/types";

const TIER_TEXT_COLORS: Record<Tier, string> = {
  community: "border-teal-400/40 text-teal-400",
  professional: "border-blue-400/40 text-blue-400",
  founder: "border-amber-400/40 text-amber-400",
};

interface CellTooltipProps {
  cx: number;
  cy: number;
  tier: Tier;
  density: number;
  owner: string | null;
  screenX: number;
  screenY: number;
  onClose: () => void;
}

export default function CellTooltip({ cx, cy, tier, density, owner, screenX, screenY }: CellTooltipProps) {
  const colors = TIER_TEXT_COLORS[tier];
  const borderColor = colors.split(" ")[0];

  return (
    <div
      className={`absolute z-[35] pointer-events-auto`}
      style={{ left: screenX + 16, top: screenY - 20 }}
    >
      <div className={`bg-background-light/95 backdrop-blur-sm border ${borderColor} rounded-lg px-3 py-2 shadow-lg max-w-[150px]`}>
        <div className={`text-[10px] font-bold tracking-wider ${colors.split(" ")[1]} mb-1`}>
          {TIER_LABELS[tier]}
        </div>
        <div className="space-y-0.5 text-[9px] font-mono text-text-muted">
          <div>({cx}, {cy})</div>
          <div>density: {(density * 100).toFixed(0)}%</div>
          <div>{owner ? `owner: ${owner}` : "unclaimed"}</div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useGameStore } from "@/store";
import { DeltaFlash } from "@/components/DeltaFlash";

/** Floating widget in the upper-right showing accumulating scores (Secured + Mined chains). */
export default function ScoresWidget() {
  const chainMode = useGameStore((s) => s.chainMode);
  const securedChains = useGameStore((s) => s.securedChains);
  const minedChains = useGameStore((s) => s.minedChains);

  if (chainMode !== "testnet") return null;

  return (
    <div className="absolute top-10 right-2 z-[25] w-[160px] bg-background-light/90 border border-card-border rounded-lg p-3">
      <div className="text-[12px] font-bold tracking-wider text-text-muted">
        SCORES
      </div>
      <div className="text-[12px] text-text-muted/50 mb-2 leading-tight">
        (your node)
      </div>
      <div className="space-y-1.5">
        <ScoreRow
          icon="⛓"
          iconClass="text-emerald-400/50"
          label="Secured"
          value={securedChains}
          valueClass="text-emerald-400"
          deltaKey="securedChains"
          title="Blocks you've secured by proving agentic work (Secure)."
        />
        <ScoreRow
          icon="⛏"
          iconClass="text-orange-400/50"
          label="Mined"
          value={minedChains}
          valueClass="text-orange-400"
          deltaKey="minedChains"
          title="Blocks your node earned by mining."
        />
      </div>
    </div>
  );
}

function ScoreRow({
  icon,
  iconClass,
  label,
  value,
  valueClass,
  deltaKey,
  title,
}: {
  icon: string;
  iconClass: string;
  label: string;
  value: number;
  valueClass: string;
  deltaKey: string;
  title?: string;
}) {
  return (
    <div className="flex justify-between items-center gap-2" title={title}>
      <span className="text-[12px] flex items-center gap-1 text-text-muted/60">
        <span className={iconClass}>{icon}</span>
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`text-[12px] font-mono ${valueClass} tabular-nums`}>
          {value.toLocaleString()}
        </span>
        <DeltaFlash resourceKey={deltaKey} />
      </span>
    </div>
  );
}

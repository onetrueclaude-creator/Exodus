"use client";

import { useState } from "react";
import { useGameStore } from "@/store";
import { NODE_CPU_PER_TURN } from "@/store/gameStore";
import type { BlockNode } from "@/types";

const FACTION_STYLE: Record<string, { text: string; border: string; bg: string; label: string }> = {
  community: {
    text: "text-white",
    border: "border-white/30",
    bg: "bg-white/5",
    label: "Community",
  },
  treasury: {
    text: "text-orange-400",
    border: "border-orange-400/40",
    bg: "bg-orange-400/5",
    label: "Treasury",
  },
  founder: {
    text: "text-fuchsia-400",
    border: "border-fuchsia-400/40",
    bg: "bg-fuchsia-400/5",
    label: "Founder",
  },
  "pro-max": {
    text: "text-cyan-400",
    border: "border-cyan-400/40",
    bg: "bg-cyan-400/5",
    label: "Pro/Max",
  },
};

interface BlockNodePanelProps {
  node: BlockNode;
  onClose: () => void;
}

export default function BlockNodePanel({ node, onClose }: BlockNodePanelProps) {
  const [cpuToStake, setCpuToStake] = useState(10);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const currentUserId = useGameStore((s) => s.currentUserId);
  const energy = useGameStore((s) => s.energy);
  const secureBlocknode = useGameStore((s) => s.secureBlocknode);

  const style = FACTION_STYLE[node.faction] ?? FACTION_STYLE.community;
  const isOwned = node.ownerId !== null;
  const isOwnedByMe = node.ownerId === currentUserId;
  const expectedAgntc = Math.round(node.secureStrength * cpuToStake * 0.001 * 1000) / 1000;

  const handleSecure = () => {
    if (!isOwnedByMe || cpuToStake <= 0 || energy < cpuToStake) return;
    secureBlocknode(node.id, cpuToStake);
    setLastAction(`Secured! +${expectedAgntc} AGNTC`);
  };

  return (
    <div
      className={`absolute top-4 right-4 z-30 w-64 rounded-xl border ${style.border} ${style.bg} backdrop-blur-sm p-4 shadow-xl`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={`text-[11px] font-mono ${style.text} uppercase tracking-widest`}>
            {style.label} Arm
          </span>
          <div className="text-[13px] font-semibold text-text-primary font-mono">
            Block #{node.blockIndex} · Ring {node.ringIndex}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted/50 hover:text-text-muted transition-colors text-[18px] leading-none"
        >
          ×
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-1 mb-3 text-[10px] font-mono text-text-muted">
        <div>
          Cell:{" "}
          <span className="text-text-primary">
            ({node.cx},{node.cy})
          </span>
        </div>
        <div>
          Strength: <span className={style.text}>{Math.round(node.secureStrength)}×</span>
        </div>
        <div>
          Staked: <span className="text-text-primary">{node.stakedCpu} CPU</span>
        </div>
        <div>
          Secures: <span className="text-text-primary">{node.cumulativeSecures}</span>
        </div>
      </div>

      {/* Ownership status */}
      <div className="mb-3 text-[10px] font-mono">
        {isOwnedByMe && node.ringIndex === 0 ? (
          <span className={style.text}>◈ Your Homenode · {NODE_CPU_PER_TURN} CPU/turn</span>
        ) : isOwnedByMe ? (
          <span className={style.text}>◈ Your Arm Node · {NODE_CPU_PER_TURN} CPU/turn</span>
        ) : isOwned ? (
          <span className="text-text-muted">
            ◈ Occupied · <span className="text-text-muted/50">{node.ownerId?.slice(0, 14)}…</span>
          </span>
        ) : (
          <span className="text-text-muted/60">◈ Arm Node — Faction Infrastructure</span>
        )}
      </div>

      <div className="border-t border-card-border/40 my-3" />

      {/* ── SECURE (own nodes only) ── */}
      {isOwnedByMe && (
        <div className="mb-3">
          <div className="text-[9px] text-text-muted/50 font-mono mb-1">Stake CPU → earn AGNTC</div>
          <div className="flex gap-1.5 items-center">
            <input
              type="number"
              min={1}
              max={Math.min(Math.floor(energy), 9999)}
              value={cpuToStake}
              onChange={(e) => setCpuToStake(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-[11px] font-mono bg-background border border-card-border rounded px-1.5 py-1 text-text-primary"
            />
            <span className="text-[9px] text-text-muted font-mono">CPU</span>
            <button
              onClick={handleSecure}
              disabled={energy < cpuToStake}
              className={`flex-1 py-1 rounded text-[11px] font-semibold transition-all
                ${
                  energy >= cpuToStake
                    ? `${style.text} border ${style.border} hover:bg-white/5 active:scale-95`
                    : "text-text-muted/30 border border-card-border cursor-not-allowed"
                }`}
            >
              Secure → +{expectedAgntc} AGNTC
            </button>
          </div>
        </div>
      )}

      {/* Feedback */}
      {lastAction && (
        <div
          className={`text-[9px] font-mono mt-3 ${style.text}/70 bg-black/20 rounded px-2 py-1.5`}
        >
          {lastAction}
        </div>
      )}
    </div>
  );
}

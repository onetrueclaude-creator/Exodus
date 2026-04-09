"use client";

import { useGameStore } from "@/store";
import { NODE_CPU_PER_TURN } from "@/store/gameStore";
import type { BlockNode } from "@/types";

const FACTION_STYLE: Record<string, { text: string; border: string; bg: string; label: string }> = {
  community: {
    text: "text-teal-400",
    border: "border-teal-400/30",
    bg: "bg-teal-400/5",
    label: "Community",
  },
  treasury: {
    text: "text-pink-400",
    border: "border-pink-400/30",
    bg: "bg-pink-400/5",
    label: "Machines",
  },
  founder: {
    text: "text-amber-400",
    border: "border-amber-400/30",
    bg: "bg-amber-400/5",
    label: "Founders",
  },
  "pro-max": {
    text: "text-blue-400",
    border: "border-blue-400/30",
    bg: "bg-blue-400/5",
    label: "Professional",
  },
};

interface BlockNodePanelProps {
  node: BlockNode;
  onClose: () => void;
}

/** Info-only panel for a clicked blocknode. No actions — all actions via Terminal. */
export default function BlockNodePanel({ node, onClose }: BlockNodePanelProps) {
  const currentUserId = useGameStore((s) => s.currentUserId);
  const style = FACTION_STYLE[node.faction] ?? FACTION_STYLE.community;
  const isOwned = node.ownerId !== null;
  const isOwnedByMe = node.ownerId === currentUserId;

  return (
    <div
      className={`absolute top-4 right-4 z-30 w-56 rounded-xl border ${style.border} ${style.bg} backdrop-blur-sm p-3 shadow-xl`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-mono ${style.text} uppercase tracking-widest`}>
          {style.label}
        </span>
        <button
          onClick={onClose}
          className="text-text-muted/50 hover:text-text-muted transition-colors text-[16px] leading-none"
        >
          ×
        </button>
      </div>

      {/* Stats */}
      <div className="space-y-1 text-[10px] font-mono text-text-muted">
        <div>Cell: <span className="text-text-primary">({node.cx}, {node.cy})</span></div>
        <div>Ring: <span className="text-text-primary">{node.ringIndex}</span></div>
        <div>Density: <span className={style.text}>{Math.round(node.secureStrength)}%</span></div>
        <div>Staked: <span className="text-text-primary">{node.stakedCpu} CPU</span></div>
      </div>

      {/* Ownership */}
      <div className="mt-2 pt-2 border-t border-card-border/30 text-[10px] font-mono">
        {isOwnedByMe ? (
          <span className={style.text}>
            {'\u25C8'} Your {node.ringIndex === 1 ? 'Homenode' : 'Node'} · {NODE_CPU_PER_TURN} CPU/turn
          </span>
        ) : isOwned ? (
          <span className="text-text-muted">
            {'\u25C8'} Occupied · <span className="text-text-muted/50">{node.ownerId?.slice(0, 14)}</span>
          </span>
        ) : (
          <span className="text-text-muted/60">{'\u25C8'} Unclaimed</span>
        )}
      </div>
    </div>
  );
}

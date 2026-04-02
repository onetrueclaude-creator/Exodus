"use client";

import { useState } from "react";
import { useGameStore } from "@/store";
import { MINE_GRID_CPU_COST, CLAIM_GRID_AGNTC_COST } from "@/store/gameStore";
import type { FactionId, BlockNode } from "@/types";

/** Voronoi: nearest arm node's faction for a given cell. Mirrors the store helper. */
function computeCellFaction(
  cx: number,
  cy: number,
  blocknodes: Record<string, BlockNode>
): FactionId | null {
  const nodes = Object.values(blocknodes);
  if (nodes.length === 0) return null;
  let minDist = Infinity;
  let nearest: FactionId | null = null;
  for (const node of nodes) {
    const d = (node.cx - cx) ** 2 + (node.cy - cy) ** 2;
    if (d < minDist) {
      minDist = d;
      nearest = node.faction;
    }
  }
  return nearest;
}

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

interface GridNodePanelProps {
  cx: number;
  cy: number;
  onClose: () => void;
}

export default function GridNodePanel({ cx, cy, onClose }: GridNodePanelProps) {
  const [lastAction, setLastAction] = useState<string | null>(null);

  const blocknodes = useGameStore((s) => s.blocknodes);
  const gridNodes = useGameStore((s) => s.gridNodes);
  const totalBlocksMined = useGameStore((s) => s.totalBlocksMined);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const currentUserFaction = useGameStore((s) => s.currentUserFaction);
  const energy = useGameStore((s) => s.energy);
  const agntcBalance = useGameStore((s) => s.agntcBalance);
  const mineGridNode = useGameStore((s) => s.mineGridNode);
  const claimGridNode = useGameStore((s) => s.claimGridNode);

  const nodeId = `grid-${cx}-${cy}`;
  const gridNode = gridNodes[nodeId] ?? null;

  // If this is an arm cell, don't render — BlockNodePanel handles arm nodes
  const isArmCell = Object.values(blocknodes).some((n) => n.cx === cx && n.cy === cy);
  if (isArmCell) return null;

  const faction = gridNode?.faction ?? computeCellFaction(cx, cy, blocknodes);
  const style = FACTION_STYLE[faction ?? "community"] ?? FACTION_STYLE.community;

  const nodeState = gridNode?.state ?? "available";
  const isOwnedByMe = gridNode?.ownerId === currentUserId;

  // Range check: mineable range expands one ring per block
  const mineableRange = Math.max(1, totalBlocksMined + 1);
  const inRange = Math.abs(cx) <= mineableRange && Math.abs(cy) <= mineableRange;
  const inUserFaction = faction === currentUserFaction;

  // Adjacency preview (mirrors store logic — actual guard is authoritative)
  const armNodes = Object.values(blocknodes).filter((n) => n.faction === currentUserFaction);
  const adjacentToArm = armNodes.some((n) => Math.abs(n.cx - cx) <= 1 && Math.abs(n.cy - cy) <= 1);
  const ownedGrid = Object.values(gridNodes).filter(
    (n) => n.ownerId === currentUserId && n.state === "claimed"
  );
  const adjacentToOwned = ownedGrid.some(
    (n) => Math.abs(n.cx - cx) <= 1 && Math.abs(n.cy - cy) <= 1
  );
  const isAdjacent = adjacentToArm || adjacentToOwned;

  const canMine =
    nodeState === "available" &&
    inRange &&
    inUserFaction &&
    isAdjacent &&
    energy >= MINE_GRID_CPU_COST &&
    !!currentUserId;

  const canClaim =
    nodeState === "mined" && agntcBalance >= CLAIM_GRID_AGNTC_COST && !!currentUserId;

  const handleMine = () => {
    const ok = mineGridNode(cx, cy);
    setLastAction(
      ok ? `Mined! −${MINE_GRID_CPU_COST} CPU` : "Mine failed — check adjacency, range, or CPU."
    );
  };

  const handleClaim = () => {
    const ok = claimGridNode(cx, cy);
    setLastAction(
      ok ? `Claimed! −${CLAIM_GRID_AGNTC_COST} AGNTC` : "Claim failed — check AGNTC balance."
    );
  };

  return (
    <div
      className={`absolute top-4 right-4 z-30 w-64 rounded-xl border ${style.border} ${style.bg} backdrop-blur-sm p-4 shadow-xl`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={`text-[11px] font-mono ${style.text} uppercase tracking-widest`}>
            {style.label} Territory
          </span>
          <div className="text-[13px] font-semibold text-text-primary font-mono">
            Cell ({cx}, {cy})
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted/50 hover:text-text-muted transition-colors text-[18px] leading-none"
        >
          ×
        </button>
      </div>

      {/* State badge */}
      <div className="mb-3 text-[10px] font-mono">
        {nodeState === "claimed" ? (
          isOwnedByMe ? (
            <span className={style.text}>◈ Your Territory</span>
          ) : (
            <span className="text-text-muted">
              ◈ Claimed ·{" "}
              <span className="text-text-muted/50">{gridNode?.ownerId?.slice(0, 14)}…</span>
            </span>
          )
        ) : nodeState === "mined" ? (
          <span className="text-yellow-400/80">◈ Mined — Ready to Claim</span>
        ) : (
          <span className="text-text-muted/60">◈ Available — Unclaimed Territory</span>
        )}
      </div>

      <div className="border-t border-card-border/40 my-3" />

      {/* Mine action (available cells only) */}
      {nodeState === "available" && (
        <div className="mb-3">
          <div className="text-[9px] text-text-muted/50 font-mono mb-1.5">
            Mine · {MINE_GRID_CPU_COST} CPU Energy
          </div>
          {!inRange ? (
            <div className="text-[10px] text-text-muted/40 font-mono text-center py-1.5 border border-card-border/30 rounded-lg">
              Outside mineable range (max ±{mineableRange})
            </div>
          ) : !inUserFaction ? (
            <div className="text-[10px] text-red-400/50 font-mono text-center py-1">
              Foreign territory — not your faction
            </div>
          ) : !isAdjacent ? (
            <div className="text-[10px] text-text-muted/40 font-mono text-center py-1.5 border border-card-border/30 rounded-lg">
              Must be adjacent to arm or claimed territory
            </div>
          ) : (
            <button
              onClick={handleMine}
              disabled={!canMine}
              className={`w-full py-1.5 rounded-lg text-[11px] font-semibold transition-all
                ${
                  canMine
                    ? `${style.text} border ${style.border} hover:bg-white/5 active:scale-95`
                    : "text-text-muted/30 border border-card-border cursor-not-allowed"
                }`}
            >
              Mine · {canMine ? `−${MINE_GRID_CPU_COST} CPU` : "Need CPU Energy"}
            </button>
          )}
        </div>
      )}

      {/* Claim action (mined cells only) */}
      {nodeState === "mined" && (
        <div className="mb-3">
          <div className="text-[9px] text-text-muted/50 font-mono mb-1.5">
            Claim Territory · {CLAIM_GRID_AGNTC_COST} AGNTC
          </div>
          <button
            onClick={handleClaim}
            disabled={!canClaim}
            className={`w-full py-1.5 rounded-lg text-[11px] font-semibold transition-all
              ${
                canClaim
                  ? `${style.text} border ${style.border} hover:bg-white/5 active:scale-95`
                  : "text-text-muted/30 border border-card-border cursor-not-allowed"
              }`}
          >
            Claim · {canClaim ? `−${CLAIM_GRID_AGNTC_COST} AGNTC` : "Need AGNTC"}
          </button>
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

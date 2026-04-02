"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store";
import { NODE_CPU_PER_TURN } from "@/store/gameStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { sciFormat, sciRate } from "@/lib/format";
import type { FactionId } from "@/types";

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs font-mono text-text-muted tabular-nums" suppressHydrationWarning>
      {time.toLocaleTimeString("en-GB", { hour12: false })}
    </span>
  );
}

/** Flash delta indicator — shows +N or -N for 3 seconds after a resource change */
function DeltaFlash({ resourceKey }: { resourceKey: string }) {
  const delta = useGameStore((s) => s.resourceDeltas[resourceKey]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!delta) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [delta?.ts]);

  if (!visible || !delta) return null;

  const isPositive = delta.value > 0;
  return (
    <span
      className={`text-[10px] font-mono font-bold animate-pulse ${
        isPositive ? "text-green-400" : "text-red-400"
      }`}
    >
      {isPositive ? "+" : ""}
      {delta.value}
    </span>
  );
}

/** Faction dot color and label for the arm indicator */
const FACTION_DOT: Record<FactionId, string> = {
  community: "bg-white",
  treasury: "bg-orange-400",
  founder: "bg-fuchsia-400",
  "pro-max": "bg-cyan-400",
};

const FACTION_TEXT: Record<FactionId, string> = {
  community: "text-white",
  treasury: "text-orange-400",
  founder: "text-fuchsia-400",
  "pro-max": "text-cyan-400",
};

const FACTION_LABEL: Record<FactionId, string> = {
  community: "Community",
  treasury: "Treasury",
  founder: "Founder",
  "pro-max": "Pro/Max",
};

export default function ResourceBar() {
  const { publicKey } = useWallet();
  const energy = useGameStore((s) => s.energy);
  const minerals = useGameStore((s) => s.minerals);
  const agntcBalance = useGameStore((s) => s.agntcBalance);
  const securedChains = useGameStore((s) => s.securedChains);
  const turn = useGameStore((s) => s.turn);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const currentUserFaction = useGameStore((s) => s.currentUserFaction);
  const agents = useGameStore((s) => s.agents);
  const blocknodes = useGameStore((s) => s.blocknodes);
  const chainMode = useGameStore((s) => s.chainMode);
  const testnetBlocks = useGameStore((s) => s.testnetBlocks);

  // Agent-based resource rates (still relevant if agents exist)
  const ownAgents = Object.values(agents).filter((a) => a.userId === currentUserId);
  const totalMining = ownAgents.reduce((sum, a) => sum + (a.miningRate ?? 0), 0);
  const totalCpuCost = ownAgents.reduce((sum, a) => sum + a.cpuPerTurn, 0);
  const mineralGain = ownAgents.length;
  const totalPressureCost = ownAgents.reduce((sum, a) => sum + (a.borderPressure ?? 0) * 0.1, 0);

  // Blocknode maintenance
  const ownedBlocknodes = Object.values(blocknodes).filter((n) => n.ownerId === currentUserId);
  const nodeMaintenance = ownedBlocknodes.length * NODE_CPU_PER_TURN;

  // Net energy: mining minus all costs (agents + node maintenance)
  const netEnergy = totalMining - totalCpuCost - nodeMaintenance;

  const faction = currentUserFaction ?? "community";

  return (
    <div className="h-8 bg-background-light border-b border-card-border flex items-center px-3 gap-3 shrink-0">
      {/* Network badge */}
      <div
        className={`px-2 py-0.5 rounded border flex items-center gap-1.5 ${
          chainMode === "testnet"
            ? "border-yellow-400/40 bg-yellow-400/10"
            : "border-card-border bg-card-border/20"
        }`}
      >
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            chainMode === "testnet" ? "bg-green-400 animate-pulse" : "bg-text-muted"
          }`}
        />
        <span
          className={`text-[10px] font-bold tracking-wider ${
            chainMode === "testnet" ? "text-yellow-400" : "text-text-muted"
          }`}
        >
          {chainMode === "testnet" ? "TESTNET" : "OFFLINE"}
        </span>
        {chainMode === "testnet" && testnetBlocks > 0 && (
          <span className="text-[9px] font-mono text-yellow-400/60">B#{testnetBlocks}</span>
        )}
      </div>

      {/* Faction arm indicator */}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full animate-pulse ${FACTION_DOT[faction]}`} />
        <span className="text-sm font-heading text-text-primary">{FACTION_LABEL[faction]} Arm</span>
        {ownedBlocknodes.length > 0 && (
          <span className={`text-[10px] font-mono ${FACTION_TEXT[faction]}`}>
            {ownedBlocknodes.length} node{ownedBlocknodes.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="h-4 w-px bg-card-border" />

      {/* CPU Energy — yellow */}
      <div className="flex items-center gap-1 group">
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
        <span className="text-xs font-mono text-yellow-300 tabular-nums">{sciFormat(energy)}</span>
        <sup className="text-[9px] leading-none">
          <DeltaFlash resourceKey="energy" />
        </sup>
        <span
          className={`text-[9px] font-mono hidden group-hover:inline ${netEnergy >= 0 ? "text-green-400" : "text-red-400"}`}
        >
          {sciRate(netEnergy)}/t
        </span>
        {nodeMaintenance > 0 && (
          <span className="text-[9px] font-mono hidden group-hover:inline text-yellow-400/50 ml-0.5">
            −{nodeMaintenance}↓
          </span>
        )}
      </div>

      {/* Secured Chains — green */}
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        <span className="text-xs font-mono text-emerald-300 tabular-nums">{securedChains}</span>
        <sup className="text-[9px] leading-none">
          <DeltaFlash resourceKey="securedChains" />
        </sup>
      </div>

      {/* AGNTC */}
      <div className="flex items-center gap-1 group">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan shrink-0" />
        <span className="text-xs font-mono text-accent-cyan tabular-nums">
          {sciFormat(agntcBalance)}
        </span>
        <sup className="text-[9px] leading-none">
          <DeltaFlash resourceKey="agntc" />
        </sup>
        {totalPressureCost > 0 && (
          <span className="text-[9px] font-mono hidden group-hover:inline text-red-400">
            {sciRate(-totalPressureCost)}/t
          </span>
        )}
      </div>

      {/* Data Frags */}
      <div className="flex items-center gap-1 group">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
        <span className="text-xs font-mono text-blue-300 tabular-nums">{sciFormat(minerals)}</span>
        {mineralGain > 0 && (
          <span className="text-[9px] font-mono hidden group-hover:inline text-blue-400">
            {sciRate(mineralGain)}/t
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Wallet indicator */}
      <div className="flex items-center gap-1.5">
        {publicKey ? (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span className="text-[10px] font-mono text-purple-400/80">
              {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
            </span>
          </>
        ) : (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40" />
            <span className="text-[10px] font-mono text-text-muted/40">No wallet</span>
          </>
        )}
      </div>

      <div className="h-4 w-px bg-card-border" />

      {/* Turn counter */}
      <div className="flex items-center gap-1 mr-2">
        <span className="text-xs text-text-muted font-semibold">Turn</span>
        <span className="text-sm font-mono text-text-primary tabular-nums">{turn}</span>
      </div>

      {/* Live clock */}
      <LiveClock />
    </div>
  );
}

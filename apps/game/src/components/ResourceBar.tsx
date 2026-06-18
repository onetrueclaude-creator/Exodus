"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store";
import { getNodeCpuPerTurn } from "@/lib/nodeTier";
import { useWallet } from "@solana/wallet-adapter-react";
import { sciFormat } from "@/lib/format";
import { DeltaFlash } from "@/components/DeltaFlash";
import type { Tier } from "@/types";
import { TIER_LABELS, TIER_CROWN } from "@/types";

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

/** Tier dot color + text color classes (labels come from shared TIER_LABELS). */
const TIER_DOT: Record<Tier, string> = {
  community: "bg-teal-400",
  professional: "bg-blue-400",
  founder: "bg-amber-400",
};

const TIER_TEXT: Record<Tier, string> = {
  community: "text-teal-300",
  professional: "text-blue-300",
  founder: "text-amber-300",
};

/** Turn countdown — ticks down from 10s to 0 each turn */
function TurnCountdown() {
  const turn = useGameStore((s) => s.turn);
  const [seconds, setSeconds] = useState(10);

  useEffect(() => {
    setSeconds(10);
  }, [turn]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="text-text-muted/50 tabular-nums">({seconds}s)</span>
  );
}

export default function ResourceBar() {
  const { publicKey } = useWallet();
  const energy = useGameStore((s) => s.energy);
  const minerals = useGameStore((s) => s.minerals);
  const agntcBalance = useGameStore((s) => s.agntcBalance);
  const turn = useGameStore((s) => s.turn);
  const currentUserTier = useGameStore((s) => s.currentUserTier);
  const blocknodes = useGameStore((s) => s.blocknodes);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const chainMode = useGameStore((s) => s.chainMode);
  const testnetBlocks = useGameStore((s) => s.testnetBlocks);
  const cpuRegenPerTurn = useGameStore((s) => s.cpuRegenPerTurn);
  const miningCpuPerBlock = useGameStore((s) => s.miningCpuPerBlock);
  const securingCpuPerBlock = useGameStore((s) => s.securingCpuPerBlock);
  const allAgents = useGameStore((s) => s.agents);

  const ownedBlocknodes = Object.values(blocknodes).filter((n) => n.ownerId === currentUserId);
  const tier = currentUserTier ?? "community";

  // Sum per-node CPU contribution from all owned agents
  const ownedAgents = Object.values(allAgents).filter((a) => a.userId === currentUserId);
  const nodeCpuOutput = ownedAgents.reduce((sum, a) => sum + getNodeCpuPerTurn(a.level), 0);
  const grossRegen = cpuRegenPerTurn + nodeCpuOutput;

  const committed = miningCpuPerBlock + securingCpuPerBlock;
  const netCpuPerTurn = grossRegen - committed;
  const netSign = netCpuPerTurn > 0 ? "+" : netCpuPerTurn < 0 ? "−" : "±";
  const netColor =
    netCpuPerTurn > 0 ? "text-green-400/70"
    : netCpuPerTurn < 0 ? "text-red-400/80"
    : "text-text-muted/60";
  const netTooltip = `Regen +${cpuRegenPerTurn} · Nodes +${nodeCpuOutput} · Mining −${miningCpuPerBlock} · Securing −${securingCpuPerBlock}`;

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

      {/* Tier indicator */}
      <div className="flex items-center gap-1.5" suppressHydrationWarning>
        <div className={`w-2 h-2 rounded-full animate-pulse ${TIER_DOT[tier]}`} suppressHydrationWarning />
        <span className={`text-sm font-heading ${TIER_TEXT[tier]}`} suppressHydrationWarning>
          {TIER_CROWN[tier] ? `${TIER_CROWN[tier]} ` : ""}{TIER_LABELS[tier]} Tier
        </span>
        {ownedBlocknodes.length > 0 && (
          <span className="text-[10px] font-mono text-text-muted/60">
            {ownedBlocknodes.length} node{ownedBlocknodes.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="h-4 w-px bg-card-border" />

      {/* Resources (spendable) */}

      {/* CPU Energy — yellow */}
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
        <span className="text-xs font-mono text-yellow-300 tabular-nums">{sciFormat(energy)}</span>
        <span className="text-[9px] font-mono text-text-muted/40">CPU</span>
        <span
          className={`text-[9px] font-mono ${netColor} tabular-nums`}
          title={netTooltip}
        >
          {netSign}{Math.abs(netCpuPerTurn)}/t
        </span>
        <sup className="text-[9px] leading-none">
          <DeltaFlash resourceKey="energy" />
        </sup>
      </div>

      {/* AGNTC — cyan */}
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan shrink-0" />
        <span className="text-xs font-mono text-accent-cyan tabular-nums">
          {sciFormat(agntcBalance)}
        </span>
        <span className="text-[9px] font-mono text-text-muted/40">AGNTC</span>
        <sup className="text-[9px] leading-none">
          <DeltaFlash resourceKey="agntc" />
        </sup>
      </div>

      {/* Data on Chain — blue */}
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
        <span className="text-xs font-mono text-blue-300 tabular-nums">{sciFormat(minerals)}</span>
        <span className="text-[9px] font-mono text-text-muted/40">Data</span>
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

      {/* Turn counter with countdown */}
      <div className="flex items-center gap-1 mr-2">
        <span className="text-xs text-text-muted font-semibold">Turn</span>
        <span className="text-sm font-mono text-text-primary tabular-nums">{turn}</span>
        <TurnCountdown />
      </div>

      {/* Live clock */}
      <LiveClock />
    </div>
  );
}

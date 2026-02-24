"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store';
import { useWallet } from '@solana/wallet-adapter-react';
import { sciFormat, sciRate } from '@/lib/format';

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs font-mono text-text-muted tabular-nums" suppressHydrationWarning>
      {time.toLocaleTimeString('en-GB', { hour12: false })}
    </span>
  );
}

/** Flash delta indicator — shows +N or -N for 3 seconds after a store resource change */
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
    <span className={`text-[10px] font-mono font-bold animate-pulse ${
      isPositive ? 'text-green-400' : 'text-red-400'
    }`}>
      {isPositive ? '+' : ''}{delta.value}
    </span>
  );
}

/**
 * Prop-driven energy delta — accepts an external delta value and auto-clears after 2 seconds.
 * Used for testable, caller-controlled delta display (e.g. after a Secure action).
 */
function EnergyDeltaBadge({ energyDelta }: { energyDelta: number }) {
  const [displayDelta, setDisplayDelta] = useState<number>(energyDelta);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setDisplayDelta(energyDelta);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [energyDelta]);

  if (!visible) return null;

  const isPositive = displayDelta > 0;
  return (
    <span
      className={
        isPositive
          ? 'delta-positive text-green-400 text-[10px] font-mono font-bold'
          : 'delta-negative text-red-400 text-[10px] font-mono font-bold'
      }
    >
      {isPositive ? '+' : ''}{displayDelta}
    </span>
  );
}

interface ResourceBarProps {
  /** External energy delta to display next to the CPU Energy counter.
   *  Positive shows in green (+N), negative in red (-N). Auto-clears after 2 s. */
  energyDelta?: number;
  /** Estimated energy earned per turn (rolling average). Shows as dim "est. +N ⚡/turn". */
  energyEstPerTurn?: number;
}

export default function ResourceBar({ energyDelta, energyEstPerTurn }: ResourceBarProps = {}) {
  const { publicKey } = useWallet();
  const energy = useGameStore((s) => s.energy);
  const minerals = useGameStore((s) => s.minerals);
  const agntcBalance = useGameStore((s) => s.agntcBalance);
  const securedChains = useGameStore((s) => s.securedChains);
  const turn = useGameStore((s) => s.turn);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const agents = useGameStore((s) => s.agents);
  const chainMode = useGameStore((s) => s.chainMode);
  const testnetBlocks = useGameStore((s) => s.testnetBlocks);
  const agent = currentAgentId ? agents[currentAgentId] : null;

  // Calculate net production for display
  const ownAgents = Object.values(agents).filter((a) => a.userId === currentUserId);
  const totalMining = ownAgents.reduce((sum, a) => sum + (a.miningRate ?? 0), 0);
  const totalCpuCost = ownAgents.reduce((sum, a) => sum + a.cpuPerTurn, 0);
  const baseIncome = 1000; // simulation testnet faucet
  const netEnergy = baseIncome + totalMining - totalCpuCost;
  const mineralGain = ownAgents.length;
  const totalPressureCost = ownAgents.reduce((sum, a) => sum + (a.borderPressure ?? 0) * 0.1, 0);

  // Prop-driven est per turn (caller computes from energyEarnedHistory)
  const showEstPerTurn = energyEstPerTurn !== undefined && energyEstPerTurn > 0;

  return (
    <div className="h-8 bg-background-light border-b border-card-border flex items-center px-3 gap-3 shrink-0">
      {/* Network badge */}
      <div className={`px-2 py-0.5 rounded border flex items-center gap-1.5 ${
        chainMode === 'testnet'
          ? 'border-yellow-400/40 bg-yellow-400/10'
          : 'border-card-border bg-card-border/20'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${
          chainMode === 'testnet' ? 'bg-green-400 animate-pulse' : 'bg-text-muted'
        }`} />
        <span className={`text-[10px] font-bold tracking-wider ${
          chainMode === 'testnet' ? 'text-yellow-400' : 'text-text-muted'
        }`}>
          {chainMode === 'testnet' ? 'TESTNET' : 'OFFLINE'}
        </span>
        {chainMode === 'testnet' && testnetBlocks > 0 && (
          <span className="text-[9px] font-mono text-yellow-400/60">B#{testnetBlocks}</span>
        )}
      </div>

      {/* Empire name */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full animate-pulse ${
          agent?.tier === 'opus' ? 'bg-accent-purple' : agent?.tier === 'haiku' ? 'bg-yellow-400' : 'bg-accent-cyan'
        }`} />
        <span className="text-sm font-heading text-text-primary">
          {agent?.username || 'Your Network'}
        </span>
        <span className={`text-xs font-mono capitalize ${
          agent?.tier === 'opus' ? 'text-accent-purple' : agent?.tier === 'haiku' ? 'text-yellow-400' : 'text-accent-cyan'
        }`}>{agent?.tier || 'sonnet'}</span>
      </div>

      <div className="h-4 w-px bg-card-border" />

      {/* CPU Energy — yellow */}
      <div className="flex items-center gap-1 group">
        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
        <span className="text-xs font-mono text-yellow-300 tabular-nums">{sciFormat(energy)}</span>

        {/* Store-driven delta (3 s) */}
        <sup className="text-[9px] leading-none"><DeltaFlash resourceKey="energy" /></sup>

        {/* Prop-driven delta (2 s, for external callers / tests) */}
        {energyDelta !== undefined && energyDelta !== 0 && (
          <sup className="text-[9px] leading-none">
            <EnergyDeltaBadge energyDelta={energyDelta} />
          </sup>
        )}

        {/* Estimated per-turn (dim, always visible when provided) */}
        {showEstPerTurn && (
          <span className="text-xs text-yellow-500/60">
            est. +{energyEstPerTurn} ⚡/turn
          </span>
        )}

        <span className={`text-[9px] font-mono hidden group-hover:inline ${netEnergy >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {sciRate(netEnergy)}/t
        </span>
      </div>

      {/* Secured Chains — green */}
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        <span className="text-xs font-mono text-emerald-300 tabular-nums">{securedChains}</span>
        <sup className="text-[9px] leading-none"><DeltaFlash resourceKey="securedChains" /></sup>
      </div>

      {/* AGNTC */}
      <div className="flex items-center gap-1 group">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan shrink-0" />
        <span className="text-xs font-mono text-accent-cyan tabular-nums">{sciFormat(agntcBalance)}</span>
        <sup className="text-[9px] leading-none"><DeltaFlash resourceKey="agntc" /></sup>
        {totalPressureCost > 0 && (
          <span className="text-[9px] font-mono hidden group-hover:inline text-red-400">{sciRate(-totalPressureCost)}/t</span>
        )}
      </div>

      {/* Data Frags */}
      <div className="flex items-center gap-1 group">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
        <span className="text-xs font-mono text-blue-300 tabular-nums">{sciFormat(minerals)}</span>
        <span className="text-[9px] font-mono hidden group-hover:inline text-blue-400">{sciRate(mineralGain)}/t</span>
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

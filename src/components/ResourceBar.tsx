"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store';
import { sciFormat, sciRate } from '@/lib/format';

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs font-mono text-text-muted tabular-nums">
      {time.toLocaleTimeString('en-GB', { hour12: false })}
    </span>
  );
}

export default function ResourceBar() {
  const energy = useGameStore((s) => s.energy);
  const minerals = useGameStore((s) => s.minerals);
  const agntcBalance = useGameStore((s) => s.agntcBalance);
  const turn = useGameStore((s) => s.turn);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const agents = useGameStore((s) => s.agents);
  const chainMode = useGameStore((s) => s.chainMode);
  const testnetBlocks = useGameStore((s) => s.testnetBlocks);
  const poolRemaining = useGameStore((s) => s.poolRemaining);
  const nextBlockIn = useGameStore((s) => s.nextBlockIn);
  const agent = currentAgentId ? agents[currentAgentId] : null;

  // Calculate net production for display
  const ownAgents = Object.values(agents).filter((a) => a.userId === currentUserId);
  const totalMining = ownAgents.reduce((sum, a) => sum + (a.miningRate ?? 0), 0);
  const totalCpuCost = ownAgents.reduce((sum, a) => sum + a.cpuPerTurn, 0);
  const baseIncome = 1000; // simulation testnet faucet
  const netEnergy = baseIncome + totalMining - totalCpuCost;
  const mineralGain = ownAgents.length;
  // AGNTC cost from border pressure (0.1 per pressure point per turn)
  const totalPressureCost = ownAgents.reduce((sum, a) => sum + (a.borderPressure ?? 0) * 0.1, 0);

  return (
    <div className="h-10 bg-background-light border-b border-card-border flex items-center px-4 gap-6 shrink-0">
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

      {/* Resources with net production — scientific notation */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-yellow-400 font-semibold">Energy</span>
        <span className="text-sm font-mono text-yellow-300">{sciFormat(energy)}</span>
        <span className={`text-[10px] font-mono ${netEnergy >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {sciRate(netEnergy)}/t
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-green-400 font-semibold">Data Frags</span>
        <span className="text-sm font-mono text-green-300">{sciFormat(minerals)}</span>
        <span className="text-[10px] font-mono text-green-400">{sciRate(mineralGain)}/t</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-accent-cyan font-semibold">AGNTC</span>
        <span className="text-sm font-mono text-accent-cyan">{sciFormat(agntcBalance)}</span>
        {totalPressureCost > 0 && (
          <span className="text-[10px] font-mono text-red-400">{sciRate(-totalPressureCost)}/t</span>
        )}
      </div>

      {/* Chain status — testnet only */}
      {chainMode === 'testnet' && (
        <>
          <div className="h-4 w-px bg-card-border" />
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-muted font-semibold">Pool</span>
            <span className="text-sm font-mono text-text-secondary">{sciFormat(poolRemaining)}</span>
          </div>
          {nextBlockIn > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-muted font-semibold">Next</span>
              <span className="text-sm font-mono text-text-secondary tabular-nums">{Math.ceil(nextBlockIn)}s</span>
            </div>
          )}
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

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

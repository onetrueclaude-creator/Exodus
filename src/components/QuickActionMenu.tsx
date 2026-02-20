"use client";

import type { Agent } from '@/types';
import { TIER_CPU_COST, TIER_MINING_RATE } from '@/types/agent';
import { useGameStore } from '@/store';

interface QuickActionMenuProps {
  agent: Agent;
  isOwn: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

interface ActionButton {
  id: string;
  label: string;
  icon: string;
  color: string;
  ownOnly?: boolean;
  claimedOnly?: boolean;
}

const OWN_ACTIONS: ActionButton[] = [
  { id: 'terminal', label: 'Open Terminal', icon: '💻', color: 'hover:bg-accent-cyan/20 hover:text-accent-cyan', ownOnly: true },
  { id: 'inspect', label: 'Inspect', icon: '🔍', color: 'hover:bg-accent-cyan/20 hover:text-accent-cyan' },
  { id: 'haiku', label: 'Send Haiku', icon: '📜', color: 'hover:bg-accent-purple/20 hover:text-accent-purple' },
  { id: 'research', label: 'Research', icon: '🔬', color: 'hover:bg-yellow-400/20 hover:text-yellow-400', ownOnly: true },
  { id: 'manage', label: 'Manage', icon: '⚙', color: 'hover:bg-green-400/20 hover:text-green-400', ownOnly: true },
  { id: 'secure', label: 'ZK Secure', icon: '🔒', color: 'hover:bg-accent-cyan/20 hover:text-accent-cyan', ownOnly: true },
  { id: 'vote', label: 'Vote', icon: '🗳', color: 'hover:bg-accent-purple/20 hover:text-accent-purple', claimedOnly: true },
];

/** +/- stepper row used for CPU distribution sliders */
function CpuStepper({ label, value, min, max, step, unit, color, onChange }: {
  label: string; value: number; min: number; max: number;
  step: number; unit: string; color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-1">
      <span className="text-[10px] text-text-muted w-16 truncate">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold border border-card-border text-text-muted hover:text-red-400 hover:border-red-400/50 disabled:opacity-30 transition-colors"
        >-</button>
        <span className={`text-[11px] font-mono w-8 text-center ${color}`}>{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold border border-card-border text-text-muted hover:text-green-400 hover:border-green-400/50 disabled:opacity-30 transition-colors"
        >+</button>
        <span className="text-[9px] text-text-muted w-6">{unit}</span>
      </div>
    </div>
  );
}

export default function QuickActionMenu({ agent, isOwn, onClose, onAction }: QuickActionMenuProps) {
  const setBorderPressure = useGameStore((s) => s.setBorderPressure);
  const setMiningRate = useGameStore((s) => s.setMiningRate);
  const setEnergyLimit = useGameStore((s) => s.setEnergyLimit);
  const setPrimary = useGameStore((s) => s.setPrimary);
  const isUnclaimed = !agent.userId;

  if (isUnclaimed) {
    return (
      <div className="p-3 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-text-muted truncate">
            {agent.username || agent.id}
          </span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs ml-2">
            ✕
          </button>
        </div>

        {/* Unclaimed status */}
        <div className="text-[10px] text-text-muted mb-2">
          <div className="text-yellow-400/80 font-semibold mb-0.5">Unclaimed Star System</div>
          <div>Deploy an agent via your terminal to claim this node.</div>
        </div>

        {/* Deploy via terminal */}
        <button
          onClick={() => onAction('deploy-via-terminal')}
          className="w-full flex items-center gap-2 px-2 py-2 rounded text-xs font-semibold transition-colors border border-accent-cyan/30 hover:bg-accent-cyan/20 hover:text-accent-cyan text-text-muted"
        >
          <span className="text-sm">🛰</span>
          <span>Deploy Agent Here</span>
        </button>

        {/* Inspect */}
        <button
          onClick={() => onAction('inspect')}
          className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 rounded text-xs text-text-muted transition-colors hover:bg-accent-cyan/20 hover:text-accent-cyan"
        >
          <span className="text-sm">🔍</span>
          <span>Inspect</span>
        </button>
      </div>
    );
  }

  // Claimed node — filter actions by ownership
  const visibleActions = OWN_ACTIONS.filter(a => {
    if (a.ownOnly && !isOwn) return false;
    return true;
  });

  const baseMining = TIER_MINING_RATE[agent.tier];
  const extraMining = Math.max(0, (agent.miningRate ?? baseMining) - baseMining);

  return (
    <div className="p-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-card-border">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-semibold text-text-primary truncate">
            {agent.username || agent.id}
          </span>
          <span className="text-[9px] text-text-muted capitalize shrink-0">{agent.tier}</span>
          {agent.isPrimary && <span className="text-[9px] text-yellow-400 shrink-0">HW</span>}
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs ml-2">
          ✕
        </button>
      </div>

      {/* CPU Distribution — own agents only */}
      {isOwn && (
        <div className="px-1 py-1.5 mb-1 space-y-1.5 border-b border-card-border/50">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold text-accent-cyan">CPU Distribution</span>
            <span className="text-[10px] font-mono text-yellow-400">{agent.cpuPerTurn} CPU/t</span>
          </div>

          {/* Base cost (not adjustable) */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-text-muted">Base ({agent.tier})</span>
            <span className="text-[10px] font-mono text-text-muted">{TIER_CPU_COST[agent.tier]} CPU</span>
          </div>

          {/* Adjustable: Border Pressure */}
          <CpuStepper
            label="Pressure"
            value={agent.borderPressure}
            min={0}
            max={20}
            step={2}
            unit="/20"
            color="text-green-400"
            onChange={(v) => setBorderPressure(agent.id, v)}
          />

          {/* Adjustable: Mining Rate */}
          <CpuStepper
            label="Mining"
            value={agent.miningRate ?? baseMining}
            min={0}
            max={50}
            step={1}
            unit="/t"
            color="text-yellow-300"
            onChange={(v) => setMiningRate(agent.id, v)}
          />

          {/* Adjustable: Energy Limit */}
          <CpuStepper
            label="E. Limit"
            value={agent.energyLimit ?? TIER_CPU_COST[agent.tier] * 5}
            min={1}
            max={200}
            step={5}
            unit="max"
            color="text-accent-cyan"
            onChange={(v) => setEnergyLimit(agent.id, v)}
          />

          {/* CPU breakdown */}
          <div className="px-1 pt-1 border-t border-card-border/30 text-[9px] text-text-muted space-y-0.5">
            <div className="flex justify-between">
              <span>Base</span><span>{TIER_CPU_COST[agent.tier]}</span>
            </div>
            {agent.borderPressure > 0 && (
              <div className="flex justify-between">
                <span>+ Pressure</span><span className="text-green-400">+{agent.borderPressure}</span>
              </div>
            )}
            {extraMining > 0 && (
              <div className="flex justify-between">
                <span>+ Mining boost</span><span className="text-yellow-400">+{extraMining}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-[10px] text-text-primary pt-0.5 border-t border-card-border/30">
              <span>Total</span><span>{agent.cpuPerTurn} CPU/turn</span>
            </div>
          </div>

          {/* Set as Homeworld */}
          {!agent.isPrimary && (
            <button
              onClick={() => setPrimary(agent.id)}
              className="w-full px-2 py-1 mt-0.5 rounded text-[10px] text-yellow-400/70 border border-yellow-400/20 hover:bg-yellow-400/10 hover:text-yellow-400 transition-colors"
            >
              Set as Homeworld
            </button>
          )}
        </div>
      )}

      {/* Foreign agent stats */}
      {!isOwn && agent.userId && (
        <div className="px-2 py-1 mb-1 text-[10px] text-text-muted">
          <span className="capitalize">{agent.tier}</span> — owned by another empire
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-0.5">
        {visibleActions.map(action => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-text-muted transition-colors ${action.color}`}
          >
            <span className="text-sm">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

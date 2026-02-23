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
  { id: 'terminal', label: 'Open Terminal', icon: '\u2588', color: 'hover:bg-accent-cyan/15 hover:text-accent-cyan hover:border-accent-cyan/20', ownOnly: true },
  { id: 'mine', label: 'Mine Block', icon: '\u26CF', color: 'hover:bg-yellow-400/15 hover:text-yellow-400 hover:border-yellow-400/20', ownOnly: true },
  { id: 'inspect', label: 'Inspect', icon: '\u25CE', color: 'hover:bg-accent-cyan/15 hover:text-accent-cyan hover:border-accent-cyan/20' },
  { id: 'chat', label: 'Network Chat', icon: '\u25C7', color: 'hover:bg-accent-purple/15 hover:text-accent-purple hover:border-accent-purple/20' },
  { id: 'research', label: 'Research', icon: '\u2261', color: 'hover:bg-yellow-400/15 hover:text-yellow-400 hover:border-yellow-400/20', ownOnly: true },
  { id: 'manage', label: 'Manage', icon: '\u2699', color: 'hover:bg-green-400/15 hover:text-green-400 hover:border-green-400/20', ownOnly: true },
  { id: 'secure', label: 'ZK Secure', icon: '\u25A0', color: 'hover:bg-accent-cyan/15 hover:text-accent-cyan hover:border-accent-cyan/20', ownOnly: true },
  { id: 'vote', label: 'Vote', icon: '\u2610', color: 'hover:bg-accent-purple/15 hover:text-accent-purple hover:border-accent-purple/20', claimedOnly: true },
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
          className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold border border-card-border text-text-muted hover:text-red-400 hover:border-red-400/40 hover:bg-red-400/5 disabled:opacity-20 transition-all duration-150"
        >-</button>
        <span className={`text-[11px] font-mono w-8 text-center ${color}`}>{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold border border-card-border text-text-muted hover:text-green-400 hover:border-green-400/40 hover:bg-green-400/5 disabled:opacity-20 transition-all duration-150"
        >+</button>
        <span className="text-[9px] text-text-muted/60 w-6 font-mono">{unit}</span>
      </div>
    </div>
  );
}

export default function QuickActionMenu({ agent, isOwn, onClose, onAction }: QuickActionMenuProps) {
  const setPrimary = useGameStore((s) => s.setPrimary);
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const isUnclaimed = !agent.userId;

  if (isUnclaimed) {
    return (
      <div className="p-3 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-text-muted truncate font-mono">
            {agent.username || agent.id}
          </span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs ml-2 transition-colors">
            {'\u2715'}
          </button>
        </div>

        {/* Unclaimed status */}
        <div className="text-[10px] text-text-muted mb-3">
          <div className="text-yellow-400/80 font-semibold mb-0.5 flex items-center gap-1">
            <span className="text-[9px]">{'\u25CB'}</span>
            Unclaimed Neural Node
          </div>
          <div className="pl-3.5">
            {currentAgentId
              ? 'Deploy an agent via your terminal to claim this node.'
              : 'Claim this node as your Homenode to begin.'}
          </div>
        </div>

        {/* Claim as Homenode (first-time user) or Deploy via terminal */}
        {currentAgentId ? (
          <button
            onClick={() => onAction('deploy-via-terminal')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 border border-accent-cyan/25 hover:bg-accent-cyan/15 hover:text-accent-cyan hover:border-accent-cyan/40 hover:shadow-glow text-text-muted group"
          >
            <span className="text-[11px] text-text-muted group-hover:text-accent-cyan transition-colors">{'\u2604'}</span>
            <span>Deploy Agent Here</span>
          </button>
        ) : (
          <button
            onClick={() => onAction('claim-homenode')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 border border-yellow-400/25 hover:bg-yellow-400/15 hover:text-yellow-400 hover:border-yellow-400/40 hover:shadow-glow text-text-muted group"
          >
            <span className="text-[11px] text-text-muted group-hover:text-yellow-400 transition-colors">{'\u2605'}</span>
            <span>Claim as Homenode</span>
          </button>
        )}

        {/* Inspect */}
        <button
          onClick={() => onAction('inspect')}
          className="w-full flex items-center gap-2.5 px-3 py-2 mt-1 rounded-lg text-xs text-text-muted transition-all duration-200 hover:bg-accent-cyan/10 hover:text-accent-cyan border border-transparent hover:border-accent-cyan/15"
        >
          <span className="text-[11px]">{'\u25CE'}</span>
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
      <div className="flex items-center justify-between px-2 py-1.5 mb-1.5 border-b border-card-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-1.5 h-1.5 rounded-full ${
            agent.tier === 'opus' ? 'bg-accent-purple' : agent.tier === 'haiku' ? 'bg-yellow-400' : 'bg-accent-cyan'
          }`} />
          <span className="text-[11px] font-semibold text-text-primary truncate">
            {agent.username || agent.id}
          </span>
          <span className={`text-[9px] capitalize shrink-0 font-mono ${
            agent.tier === 'opus' ? 'text-accent-purple' : agent.tier === 'haiku' ? 'text-yellow-400' : 'text-accent-cyan'
          }`}>{agent.tier}</span>
          {agent.isPrimary && <span className="text-[9px] text-yellow-400 shrink-0">{'\u2605'}</span>}
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs ml-2 transition-colors">
          {'\u2715'}
        </button>
      </div>

      {/* CPU Overview — own agents only (read-only, adjust via terminal) */}
      {isOwn && (
        <div className="px-1 py-2 mb-1.5 space-y-1 border-b border-card-border/50">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-heading font-semibold text-accent-cyan tracking-wide">Node Status</span>
            <span className="text-[10px] font-mono text-yellow-400">{agent.cpuPerTurn} CPU/t</span>
          </div>

          {/* Read-only stats */}
          <div className="px-1 text-[9px] text-text-muted space-y-0.5 font-mono">
            <div className="flex justify-between">
              <span>Base ({agent.tier})</span><span>{TIER_CPU_COST[agent.tier]} CPU</span>
            </div>
            <div className="flex justify-between">
              <span>Mining</span><span className="text-yellow-300">{agent.miningRate ?? baseMining}/t</span>
            </div>
            <div className="flex justify-between">
              <span>Perimeter</span><span className="text-green-400">{agent.borderPressure}/20</span>
            </div>
            <div className="flex justify-between">
              <span>Staked</span><span className="text-accent-purple">{agent.stakedCpu ?? 0}/t</span>
            </div>
            <div className="flex justify-between">
              <span>Energy Limit</span><span className="text-accent-cyan">{agent.energyLimit ?? TIER_CPU_COST[agent.tier] * 5}</span>
            </div>
            {extraMining > 0 && (
              <div className="flex justify-between text-yellow-400/60">
                <span>Mining boost</span><span>+{extraMining}</span>
              </div>
            )}
            <div className="divider-gradient my-1" />
            <div className="flex justify-between font-semibold text-[10px] text-text-primary">
              <span>Total</span><span>{agent.cpuPerTurn} CPU/turn</span>
            </div>
            <div className="text-[8px] text-text-muted/40 pt-0.5">
              Adjust via agent terminal
            </div>
          </div>

          {/* Set as Primary Node */}
          {!agent.isPrimary && (
            <button
              onClick={() => setPrimary(agent.id)}
              className="w-full px-2 py-1.5 mt-0.5 rounded-lg text-[10px] text-yellow-400/60 border border-yellow-400/15 hover:bg-yellow-400/10 hover:text-yellow-400 hover:border-yellow-400/30 transition-all duration-200"
            >
<span className="mr-1">{'\u2605'}</span><span>Set as Primary Node</span>
            </button>
          )}
        </div>
      )}

      {/* Foreign agent stats */}
      {!isOwn && agent.userId && (
        <div className="px-2 py-1.5 mb-1 text-[10px] text-text-muted flex items-center gap-1">
          <span className="text-[8px]">{'\u25C8'}</span>
          <span className="capitalize">{agent.tier}</span> {'\u2014'} owned by another network
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-0.5">
        {visibleActions.map(action => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-text-muted transition-all duration-150 border border-transparent ${action.color}`}
          >
            <span className="text-[11px] w-4 text-center">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

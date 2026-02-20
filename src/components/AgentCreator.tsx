"use client";

import { useState } from 'react';
import { TIER_CPU_COST } from '@/types/agent';
import type { AgentTier } from '@/types';

interface AgentCreatorProps {
  energy: number;
  onCreateAgent: (tier: AgentTier) => void;
  onClose: () => void;
}

const TIERS: { tier: AgentTier; label: string; color: string }[] = [
  { tier: 'haiku', label: 'Haiku', color: 'text-text-muted border-text-muted/30' },
  { tier: 'sonnet', label: 'Sonnet', color: 'text-accent-purple border-accent-purple/30' },
  { tier: 'opus', label: 'Opus', color: 'text-accent-cyan border-accent-cyan/30' },
];

export default function AgentCreator({ energy, onCreateAgent, onClose }: AgentCreatorProps) {
  const [selectedTier, setSelectedTier] = useState<AgentTier>('sonnet');

  const upfrontCost = TIER_CPU_COST[selectedTier] * 5;
  const perTurnCost = TIER_CPU_COST[selectedTier];
  const canAfford = energy >= upfrontCost;

  return (
    <div className="glass-card p-3 w-56">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-text-primary">Create Agent</span>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs">
          ✕
        </button>
      </div>

      {/* Tier selection */}
      <div className="flex gap-1 mb-3">
        {TIERS.map(({ tier, label, color }) => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            className={`flex-1 py-1.5 rounded text-[10px] font-semibold border transition-all ${
              selectedTier === tier
                ? `${color} bg-white/5`
                : 'text-text-muted border-card-border hover:border-text-muted/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cost breakdown */}
      <div className="text-[10px] text-text-muted space-y-1 mb-3">
        <div className="flex justify-between">
          <span>Creation cost:</span>
          <span className={canAfford ? 'text-green-400' : 'text-red-400'}>
            {upfrontCost} CPU
          </span>
        </div>
        <div className="flex justify-between">
          <span>Maintenance:</span>
          <span>{perTurnCost} CPU/turn</span>
        </div>
        <div className="flex justify-between border-t border-card-border pt-1">
          <span>Your energy:</span>
          <span>{energy} CPU</span>
        </div>
      </div>

      {/* Create button */}
      <button
        onClick={() => canAfford && onCreateAgent(selectedTier)}
        disabled={!canAfford}
        className={`w-full py-2 rounded text-xs font-semibold transition-all ${
          canAfford
            ? 'bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30'
            : 'bg-card-border/20 text-text-muted cursor-not-allowed'
        }`}
      >
        {canAfford ? `Deploy ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Agent` : 'Not enough CPU'}
      </button>
    </div>
  );
}

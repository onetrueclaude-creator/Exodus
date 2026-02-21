"use client";

import { useState } from 'react';
import { TIER_CPU_COST } from '@/types/agent';
import type { AgentTier } from '@/types';

interface AgentCreatorProps {
  energy: number;
  onCreateAgent: (tier: AgentTier) => void;
  onClose: () => void;
}

const TIERS: { tier: AgentTier; label: string; color: string; borderColor: string; bgColor: string; shadowColor: string; symbol: string }[] = [
  {
    tier: 'haiku',
    label: 'Haiku',
    color: 'text-yellow-400 border-yellow-400/30',
    borderColor: 'border-yellow-400/50',
    bgColor: 'bg-yellow-400/10',
    shadowColor: 'shadow-[0_0_12px_rgba(250,204,21,0.2)]',
    symbol: '\u25CB', // ○
  },
  {
    tier: 'sonnet',
    label: 'Sonnet',
    color: 'text-accent-cyan border-accent-cyan/30',
    borderColor: 'border-accent-cyan/50',
    bgColor: 'bg-accent-cyan/10',
    shadowColor: 'shadow-[0_0_12px_rgba(0,212,255,0.2)]',
    symbol: '\u25C6', // ◆
  },
  {
    tier: 'opus',
    label: 'Opus',
    color: 'text-accent-purple border-accent-purple/30',
    borderColor: 'border-accent-purple/50',
    bgColor: 'bg-accent-purple/10',
    shadowColor: 'shadow-[0_0_12px_rgba(139,92,246,0.2)]',
    symbol: '\u2726', // ✦
  },
];

export default function AgentCreator({ energy, onCreateAgent, onClose }: AgentCreatorProps) {
  const [selectedTier, setSelectedTier] = useState<AgentTier>('sonnet');

  const upfrontCost = TIER_CPU_COST[selectedTier] * 5;
  const perTurnCost = TIER_CPU_COST[selectedTier];
  const canAfford = energy >= upfrontCost;

  const currentTierData = TIERS.find(t => t.tier === selectedTier)!;

  return (
    <div className="glass-card p-3 w-56 animate-slide-up">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-heading font-semibold text-text-primary tracking-wide">Create Agent</span>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs transition-colors">
          &#x2715;
        </button>
      </div>

      {/* Tier selection */}
      <div className="flex gap-1.5 mb-3">
        {TIERS.map(({ tier, label, color, borderColor, bgColor, shadowColor, symbol }) => {
          const isSelected = selectedTier === tier;
          return (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`flex-1 py-2 rounded-lg text-[10px] font-semibold border transition-all duration-200 flex flex-col items-center gap-0.5 ${
                isSelected
                  ? `${color} ${bgColor} ${borderColor} ${shadowColor}`
                  : 'text-text-muted border-card-border hover:border-text-muted/30 hover:bg-white/[0.02]'
              }`}
            >
              <span className={`text-sm transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`}>
                {symbol}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Cost breakdown */}
      <div className="text-[10px] text-text-muted space-y-1 mb-3 px-0.5">
        <div className="flex justify-between">
          <span>Creation cost:</span>
          <span className={`font-mono ${canAfford ? 'text-success' : 'text-danger'}`}>
            {upfrontCost} CPU
          </span>
        </div>
        <div className="flex justify-between">
          <span>Maintenance:</span>
          <span className="font-mono">{perTurnCost} CPU/turn</span>
        </div>
        <div className="divider-gradient my-1.5" />
        <div className="flex justify-between">
          <span>Your energy:</span>
          <span className="font-mono text-text-secondary">{energy} CPU</span>
        </div>
      </div>

      {/* Create button */}
      <button
        onClick={() => canAfford && onCreateAgent(selectedTier)}
        disabled={!canAfford}
        className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
          canAfford
            ? `${currentTierData.bgColor} ${currentTierData.color.split(' ')[0]} border ${currentTierData.borderColor} hover:shadow-glow active:scale-[0.98]`
            : 'bg-card-border/20 text-text-muted cursor-not-allowed border border-transparent'
        }`}
      >
        {canAfford ? `Deploy ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Agent` : 'Not enough CPU'}
      </button>
    </div>
  );
}

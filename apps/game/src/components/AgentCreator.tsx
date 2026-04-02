"use client";

import { useState } from 'react';
import { TIER_CPU_COST, TIER_CLAIM_COST, TIER_MINING_RATE } from '@/types/agent';
import type { AgentTier } from '@/types';
import { useGameStore } from '@/store';

/** Tier rank for comparison: higher number = higher tier */
const TIER_RANK: Record<AgentTier, number> = { haiku: 0, sonnet: 1, opus: 2 };

interface AgentCreatorProps {
  currentAgentTier: AgentTier;
  energy: number;
  minerals: number;
  unclaimedNodes: { id: string; x: number; y: number; dist: number }[];
  onClaimNode: (slotId: string, tier: AgentTier) => void;
  onClose: () => void;
}

const TIER_STYLES: Record<AgentTier, { label: string; color: string; borderColor: string; bgColor: string; symbol: string }> = {
  haiku: {
    label: 'Haiku',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-400/50',
    bgColor: 'bg-yellow-400/10',
    symbol: '\u25CB',
  },
  sonnet: {
    label: 'Sonnet',
    color: 'text-accent-cyan',
    borderColor: 'border-accent-cyan/50',
    bgColor: 'bg-accent-cyan/10',
    symbol: '\u25C6',
  },
  opus: {
    label: 'Opus',
    color: 'text-accent-purple',
    borderColor: 'border-accent-purple/50',
    bgColor: 'bg-accent-purple/10',
    symbol: '\u2726',
  },
};

/** Tier hierarchy: which tiers can this agent deploy, capped by subscription? */
function getDeployableTiers(tier: AgentTier, maxDeployTier: AgentTier): AgentTier[] {
  const all: AgentTier[] =
    tier === 'opus' ? ['sonnet', 'haiku']
    : tier === 'sonnet' ? ['haiku']
    : []; // haiku can't deploy
  // Filter by subscription cap: only tiers at or below maxDeployTier
  return all.filter(t => TIER_RANK[t] <= TIER_RANK[maxDeployTier]);
}

export default function AgentCreator({
  currentAgentTier,
  energy,
  minerals,
  unclaimedNodes,
  onClaimNode,
  onClose,
}: AgentCreatorProps) {
  const maxDeployTier = useGameStore((s) => s.maxDeployTier);
  const [step, setStep] = useState<'pick-node' | 'pick-tier'>('pick-node');
  const [selectedNode, setSelectedNode] = useState<{ id: string; x: number; y: number; dist: number } | null>(null);

  const deployableTiers = getDeployableTiers(currentAgentTier, maxDeployTier);

  // Step 1: Pick an unclaimed neural node
  if (step === 'pick-node') {
    return (
      <div className="glass-card p-3 w-64 animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-heading font-semibold text-text-primary tracking-wide">Claim Neural Node</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs transition-colors">
            {'\u2715'}
          </button>
        </div>
        <div className="text-[9px] text-text-muted mb-2 font-mono tracking-widest">SELECT TARGET:</div>
        {unclaimedNodes.length === 0 ? (
          <p className="text-[10px] text-text-muted italic py-2">No unclaimed neural nodes in range.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {unclaimedNodes.map(node => (
              <button
                key={node.id}
                onClick={() => { setSelectedNode(node); setStep('pick-tier'); }}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all duration-150 hover:bg-card-border/50 border border-transparent hover:border-card-border-hover"
              >
                <div>
                  <div className="text-[10px] font-mono font-semibold text-text-primary">[{node.id.slice(0, 8)}]</div>
                  <div className="text-[9px] text-text-muted font-mono">
                    ({node.x.toFixed(0)}, {node.y.toFixed(0)})
                  </div>
                </div>
                <span className="text-[9px] font-mono text-accent-cyan">{node.dist.toFixed(0)}u</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Step 2: Pick agent tier for the selected node
  return (
    <div className="glass-card p-3 w-64 animate-slide-up">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-heading font-semibold text-text-primary tracking-wide">Select Model</span>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xs transition-colors">
          {'\u2715'}
        </button>
      </div>

      {selectedNode && (
        <div className="text-[9px] text-text-muted mb-2 font-mono px-0.5">
          Node: [{selectedNode.id.slice(0, 8)}] ({selectedNode.x.toFixed(0)}, {selectedNode.y.toFixed(0)})
        </div>
      )}

      <div className="space-y-1.5">
        {deployableTiers.map(tier => {
          const style = TIER_STYLES[tier];
          const eCost = TIER_CLAIM_COST[tier];
          const mCost = Math.ceil(eCost * 0.3);
          const canAfford = energy >= eCost && minerals >= mCost;
          return (
            <button
              key={tier}
              onClick={() => { if (canAfford && selectedNode) onClaimNode(selectedNode.id, tier); }}
              disabled={!canAfford}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border transition-all duration-200 ${
                canAfford
                  ? `${style.borderColor} ${style.bgColor} hover:shadow-glow active:scale-[0.98] cursor-pointer`
                  : 'border-card-border/20 opacity-30 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm ${style.color}`}>{style.symbol}</span>
                <div>
                  <div className={`text-[11px] font-semibold capitalize ${style.color}`}>{tier}</div>
                  <div className="text-[9px] text-text-muted font-mono">
                    CPU: {TIER_CPU_COST[tier]}/t {'\u00B7'} Mining: {TIER_MINING_RATE[tier]}/t
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-[10px] font-mono ${canAfford ? 'text-success' : 'text-danger'}`}>
                  {eCost}E + {mCost}M
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Cost summary */}
      <div className="text-[9px] text-text-muted mt-2 px-0.5 font-mono">
        <div className="flex justify-between">
          <span>Energy:</span>
          <span className="text-text-secondary">{energy.toFixed(0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Data Frags:</span>
          <span className="text-text-secondary">{minerals}</span>
        </div>
      </div>

      <button
        onClick={() => { setStep('pick-node'); setSelectedNode(null); }}
        className="w-full px-2.5 py-1.5 mt-2 rounded-lg text-[10px] text-text-muted hover:text-text-secondary transition-colors font-mono"
      >
        {'\u2190'} Back
      </button>
    </div>
  );
}

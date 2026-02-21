"use client";

import { useMemo } from 'react';
import { useGameStore } from '@/store';
import type { Agent } from '@/types';

const TIER_COLOR: Record<string, { dot: string; text: string; border: string }> = {
  opus:   { dot: 'bg-accent-purple', text: 'text-accent-purple', border: 'border-accent-purple/25' },
  sonnet: { dot: 'bg-accent-cyan',   text: 'text-accent-cyan',   border: 'border-accent-cyan/25' },
  haiku:  { dot: 'bg-yellow-400',    text: 'text-yellow-400',    border: 'border-yellow-400/20' },
};

interface SecuredNodesProps {
  onFocusNode: (nodeId: string) => void;
}

export default function SecuredNodes({ onFocusNode }: SecuredNodesProps) {
  const agents = useGameStore((s) => s.agents);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const switchAgent = useGameStore((s) => s.switchAgent);

  const ownedAgents = useMemo(() => {
    return Object.values(agents)
      .filter((a: Agent) => a.userId === currentUserId)
      .sort((a, b) => {
        // Primary agent first, then by tier rank, then by name
        if (a.isPrimary) return -1;
        if (b.isPrimary) return 1;
        const tierRank: Record<string, number> = { opus: 0, sonnet: 1, haiku: 2 };
        return (tierRank[a.tier] ?? 9) - (tierRank[b.tier] ?? 9);
      });
  }, [agents, currentUserId]);

  const handleSelect = (agentId: string) => {
    switchAgent(agentId);
    onFocusNode(agentId);
  };

  if (ownedAgents.length === 0) {
    return (
      <div className="p-4 text-text-muted text-xs font-mono">
        No secured nodes yet. Deploy an agent to claim a node.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-white/[0.04]">
        <div className="text-[9px] text-text-muted/60 tracking-[0.15em] uppercase" style={{ fontFamily: "'Fira Code', monospace" }}>
          Secured Nodes ({ownedAgents.length})
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5">
        {ownedAgents.map((agent) => {
          const isActive = agent.id === currentAgentId;
          const colors = TIER_COLOR[agent.tier] ?? TIER_COLOR.sonnet;
          return (
            <button
              key={agent.id}
              onClick={() => handleSelect(agent.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                isActive
                  ? `bg-white/[0.04] border ${colors.border}`
                  : 'border border-transparent hover:bg-white/[0.03] hover:border-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {/* Status dot */}
                <div className="relative">
                  <div className={`w-2 h-2 rounded-full ${colors.dot} ${isActive ? 'animate-pulse' : 'opacity-60 group-hover:opacity-100'} transition-opacity`} />
                  {agent.isPrimary && (
                    <span className="absolute -top-1 -right-1 text-[7px] text-yellow-400">{'\u2605'}</span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-text-primary" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {agent.username || `Node-${agent.id.slice(0, 6)}`}
                    </span>
                    <span className={`text-[8px] ${colors.text} tracking-wider uppercase`} style={{ fontFamily: "'Fira Code', monospace" }}>
                      {agent.tier}
                    </span>
                  </div>
                  <div className="text-[9px] text-text-muted/40" style={{ fontFamily: "'Fira Code', monospace" }}>
                    ({agent.position.x.toFixed(0)}, {agent.position.y.toFixed(0)})
                  </div>
                </div>
              </div>

              {/* Right: stats */}
              <div className="text-right">
                <div className="text-[9px] text-text-muted/50" style={{ fontFamily: "'Fira Code', monospace" }}>
                  <span className="text-yellow-400/60">{agent.cpuPerTurn}</span>
                  <span className="text-text-muted/30"> cpu</span>
                </div>
                {isActive && (
                  <div className={`text-[8px] ${colors.text}/60 tracking-wider`} style={{ fontFamily: "'Fira Code', monospace" }}>
                    ACTIVE
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

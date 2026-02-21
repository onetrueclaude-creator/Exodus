"use client";

import { useState } from 'react';
import { useGameStore } from '@/store';

interface AgentDropdownProps {
  onSelectAgent: (agentId: string) => void;
}

const TIER_DOT: Record<string, string> = {
  opus: 'bg-accent-purple',
  sonnet: 'bg-accent-cyan',
  haiku: 'bg-yellow-400',
};

const TIER_LABEL: Record<string, string> = {
  opus: 'Opus',
  sonnet: 'Sonnet',
  haiku: 'Haiku',
};

export default function AgentDropdown({ onSelectAgent }: AgentDropdownProps) {
  const [expanded, setExpanded] = useState(false);
  const agents = useGameStore((s) => s.agents);
  const currentAgentId = useGameStore((s) => s.currentAgentId);

  const agentList = Object.values(agents);
  const currentAgent = currentAgentId ? agents[currentAgentId] : null;

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="glass-card px-3 py-1.5 text-[11px] font-semibold text-text-primary hover:text-accent-cyan transition-colors flex items-center gap-2"
      >
        <span className="text-text-muted">Agents</span>
        <span className="text-accent-cyan font-mono">{agentList.length}</span>
        <span className="text-[8px] text-text-muted">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="absolute top-full mt-1 left-0 glass-card w-64 max-h-80 overflow-y-auto z-30">
          {agentList.length === 0 ? (
            <div className="p-3 text-xs text-text-muted">No agents</div>
          ) : (
            agentList.map(agent => (
              <button
                key={agent.id}
                onClick={() => {
                  onSelectAgent(agent.id);
                  setExpanded(false);
                }}
                className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-white/5 transition-colors ${
                  agent.id === currentAgentId ? 'bg-white/5' : ''
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${TIER_DOT[agent.tier]}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-primary truncate">
                    {agent.username || agent.id}
                    {agent.id === currentAgentId && (
                      <span className="ml-1 text-[9px] text-accent-cyan">(you)</span>
                    )}
                  </div>
                  <div className="text-[10px] text-text-muted font-mono">
                    {TIER_LABEL[agent.tier]} · ({Math.round(agent.position.x)}, {Math.round(agent.position.y)})
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

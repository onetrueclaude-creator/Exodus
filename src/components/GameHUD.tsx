"use client";

import { useGameStore } from '@/store';

export default function GameHUD() {
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const agents = useGameStore((s) => s.agents);
  const agent = currentAgentId ? agents[currentAgentId] : null;

  if (!agent) return null;

  return (
    <div className="glass-card px-4 py-2 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-accent-cyan animate-pulse" />
        <span className="text-sm font-heading text-text-primary">
          {agent.username || 'Your Empire'}
        </span>
      </div>
      <span className="text-xs font-mono text-text-muted capitalize">{agent.tier}</span>
      <span className="text-xs text-text-muted">
        ({Math.round(agent.position.x)}, {Math.round(agent.position.y)})
      </span>
    </div>
  );
}

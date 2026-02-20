"use client";

import { useGameStore } from '@/store';

export default function ResourceBar() {
  const energy = useGameStore((s) => s.energy);
  const minerals = useGameStore((s) => s.minerals);
  const agntcBalance = useGameStore((s) => s.agntcBalance);
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const agents = useGameStore((s) => s.agents);
  const agent = currentAgentId ? agents[currentAgentId] : null;

  return (
    <div className="h-10 bg-background-light border-b border-card-border flex items-center px-4 gap-6 shrink-0">
      {/* Empire name */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
        <span className="text-sm font-heading text-text-primary">
          {agent?.username || 'Your Empire'}
        </span>
        <span className="text-xs font-mono text-text-muted capitalize">{agent?.tier || 'sonnet'}</span>
      </div>

      <div className="h-4 w-px bg-card-border" />

      {/* Resources */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-yellow-400 font-semibold">Energy</span>
        <span className="text-sm font-mono text-yellow-300">{energy}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-green-400 font-semibold">Minerals</span>
        <span className="text-sm font-mono text-green-300">{minerals}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-accent-cyan font-semibold">AGNTC</span>
        <span className="text-sm font-mono text-accent-cyan">{agntcBalance}</span>
      </div>
    </div>
  );
}

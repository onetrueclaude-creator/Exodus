"use client";

import type { Agent, FogLevel } from '@/types';

interface AgentPanelProps {
  agent: Agent;
  fogLevel: FogLevel;
  clarityLevel: number;  // 0-4
  onClose: () => void;
}

export default function AgentPanel({ agent, fogLevel, clarityLevel, onClose }: AgentPanelProps) {
  const tierLabel = { opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku' };
  const tierColor = { opus: 'text-accent-cyan', sonnet: 'text-accent-purple', haiku: 'text-text-muted' };

  return (
    <div className="glass-card p-5 w-72 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-semibold text-text-primary">
          {clarityLevel >= 1 ? (agent.username || 'Unknown') : '???'}
        </h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">
          &times;
        </button>
      </div>

      {/* Tier badge — always visible */}
      <div className="mb-3">
        <span className={`text-xs font-mono ${tierColor[agent.tier]}`}>
          {tierLabel[agent.tier]} Star System
        </span>
      </div>

      {/* Position — always visible */}
      <div className="text-xs text-text-muted mb-3">
        Coordinates: ({Math.round(agent.position.x)}, {Math.round(agent.position.y)})
      </div>

      {/* Bio — clarity level 2+ */}
      {clarityLevel >= 2 && agent.bio && (
        <p className="text-sm text-text-secondary mb-3">{agent.bio}</p>
      )}

      {/* Planets — clarity level 3+ */}
      {clarityLevel >= 3 && agent.planets.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-text-primary mb-1">Planets</h4>
          <div className="space-y-1">
            {agent.planets.map(pid => (
              <div key={pid} className="text-xs text-text-muted">
                {pid}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fog status */}
      <div className="mt-4 pt-3 border-t border-card-border">
        <div className="flex justify-between text-xs text-text-muted">
          <span>Visibility</span>
          <span className="capitalize">{fogLevel}</span>
        </div>
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>Diplomatic Level</span>
          <span>{clarityLevel}/4</span>
        </div>
      </div>
    </div>
  );
}

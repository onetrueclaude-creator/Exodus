"use client";

import type { Agent, FogLevel } from '@/types';
import { useGameStore } from '@/store';
import { getDistance } from '@/lib/proximity';
import { getFogRadius } from '@/lib/fog';

interface AgentPanelProps {
  agent: Agent;
  fogLevel: FogLevel;
  clarityLevel: number;  // 0-4
  onClose: () => void;
}

const TIER_MODEL: Record<string, string> = {
  opus: 'Claude Opus',
  sonnet: 'Claude Sonnet',
  haiku: 'Claude Haiku',
};

const TIER_COLOR: Record<string, string> = {
  opus: 'text-accent-cyan',
  sonnet: 'text-accent-purple',
  haiku: 'text-text-muted',
};

export default function AgentPanel({ agent, fogLevel, clarityLevel, onClose }: AgentPanelProps) {
  const agents = useGameStore((s) => s.agents);

  // Calculate nearby agents this star system can "jump" to (within fog radius)
  const jumpRadius = getFogRadius(agent.tier);
  const nearbyAgents = Object.values(agents)
    .filter(a => a.id !== agent.id)
    .map(a => ({ agent: a, distance: getDistance(agent.position, a.position) }))
    .filter(({ distance }) => distance <= jumpRadius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);

  return (
    <div className="glass-card p-5 w-80 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-heading font-semibold text-text-primary">
          {clarityLevel >= 1 ? (agent.username || 'Unknown') : '???'}
        </h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">
          &times;
        </button>
      </div>

      {/* Model / Tier — prominent display */}
      <div className="mb-3 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          agent.tier === 'opus' ? 'bg-accent-cyan' :
          agent.tier === 'sonnet' ? 'bg-accent-purple' : 'bg-slate-500'
        }`} />
        <span className={`text-sm font-mono font-semibold ${TIER_COLOR[agent.tier]}`}>
          {TIER_MODEL[agent.tier]}
        </span>
      </div>

      {/* Position */}
      <div className="text-xs text-text-muted mb-3 font-mono">
        ({Math.round(agent.position.x)}, {Math.round(agent.position.y)})
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
              <div key={pid} className="text-xs text-text-muted">{pid}</div>
            ))}
          </div>
        </div>
      )}

      {/* Jump connections — nearby reachable star systems */}
      {nearbyAgents.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-text-primary mb-2">
            Jump Connections
            <span className="text-text-muted font-normal ml-1">({nearbyAgents.length})</span>
          </h4>
          <div className="space-y-1.5">
            {nearbyAgents.map(({ agent: nearby, distance }) => (
              <div key={nearby.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    nearby.tier === 'opus' ? 'bg-accent-cyan' :
                    nearby.tier === 'sonnet' ? 'bg-accent-purple' : 'bg-slate-500'
                  }`} />
                  <span className="text-text-secondary">{nearby.username || nearby.id}</span>
                </div>
                <span className="text-text-muted font-mono">{Math.round(distance)}u</span>
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
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>Jump Range</span>
          <span className="font-mono">{jumpRadius}u</span>
        </div>
      </div>
    </div>
  );
}

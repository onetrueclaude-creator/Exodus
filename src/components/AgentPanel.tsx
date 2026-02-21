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
  opus: 'text-accent-purple',
  sonnet: 'text-accent-cyan',
  haiku: 'text-yellow-400',
};

const TIER_BG: Record<string, string> = {
  opus: 'bg-accent-purple',
  sonnet: 'bg-accent-cyan',
  haiku: 'bg-yellow-400',
};

const TIER_BORDER: Record<string, string> = {
  opus: 'border-accent-purple/20',
  sonnet: 'border-accent-cyan/20',
  haiku: 'border-yellow-400/20',
};

const TIER_GLOW: Record<string, string> = {
  opus: 'shadow-[0_0_12px_rgba(139,92,246,0.1)]',
  sonnet: 'shadow-[0_0_12px_rgba(0,212,255,0.1)]',
  haiku: 'shadow-[0_0_12px_rgba(250,204,21,0.1)]',
};

const FOG_DISPLAY: Record<FogLevel, { label: string; color: string }> = {
  clear: { label: 'Clear', color: 'text-success' },
  hazy: { label: 'Hazy', color: 'text-accent-cyan' },
  fogged: { label: 'Fogged', color: 'text-yellow-400' },
  hidden: { label: 'Hidden', color: 'text-text-muted' },
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

  const fogInfo = FOG_DISPLAY[fogLevel] || FOG_DISPLAY.hidden;

  return (
    <div className={`glass-card p-5 w-80 max-h-[80vh] overflow-y-auto animate-slide-up border ${TIER_BORDER[agent.tier]} ${TIER_GLOW[agent.tier]}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-heading font-semibold text-text-primary tracking-wide">
          {clarityLevel >= 1 ? (agent.username || 'Unknown') : '???'}
        </h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg transition-colors">
          &times;
        </button>
      </div>

      {/* Model / Tier — prominent display */}
      <div className="mb-3 flex items-center gap-2.5 bg-white/[0.02] rounded-lg px-3 py-2 border border-card-border">
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${TIER_BG[agent.tier]}`} />
          <div className={`absolute inset-0 w-3 h-3 rounded-full ${TIER_BG[agent.tier]} opacity-40 animate-ping`} />
        </div>
        <span className={`text-sm font-mono font-semibold ${TIER_COLOR[agent.tier]}`}>
          {TIER_MODEL[agent.tier]}
        </span>
      </div>

      {/* Position */}
      <div className="text-xs text-text-muted mb-3 font-mono flex items-center gap-1.5">
        <span className="text-[9px] text-text-muted/50">{'\u25C8'}</span>
        ({Math.round(agent.position.x)}, {Math.round(agent.position.y)})
      </div>

      {/* Bio — clarity level 2+ */}
      {clarityLevel >= 2 && agent.bio && (
        <p className="text-sm text-text-secondary mb-3 leading-relaxed">{agent.bio}</p>
      )}

      {/* Planets — clarity level 3+ */}
      {clarityLevel >= 3 && agent.planets.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-heading font-semibold text-text-primary mb-2 flex items-center gap-1.5">
            <span className="text-accent-cyan text-[9px]">{'\u25A3'}</span>
            Data Packets
          </h4>
          <div className="space-y-1">
            {agent.planets.map(pid => (
              <div key={pid} className="text-xs text-text-muted font-mono bg-white/[0.02] rounded px-2 py-1 border border-card-border/50 truncate">{pid}</div>
            ))}
          </div>
        </div>
      )}

      {/* Jump connections — nearby reachable star systems */}
      {nearbyAgents.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-heading font-semibold text-text-primary mb-2 flex items-center gap-1.5">
            <span className="text-accent-purple text-[9px]">{'\u25C7'}</span>
            Signal Links
            <span className="text-text-muted font-normal font-mono text-[9px] ml-0.5">({nearbyAgents.length})</span>
          </h4>
          <div className="space-y-1">
            {nearbyAgents.map(({ agent: nearby, distance }) => (
              <div key={nearby.id} className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${TIER_BG[nearby.tier] || 'bg-text-muted'}`} />
                  <span className="text-text-secondary">{nearby.username || nearby.id}</span>
                </div>
                <span className="text-text-muted font-mono text-[10px]">{Math.round(distance)}u</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fog status */}
      <div className="mt-4 pt-3 border-t border-card-border space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Visibility</span>
          <span className={`capitalize font-mono ${fogInfo.color}`}>{fogLevel}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Trust Level</span>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${
                  i < clarityLevel ? TIER_BG[agent.tier] || 'bg-accent-cyan' : 'bg-white/10'
                }`} />
              ))}
            </div>
            <span className="font-mono text-text-secondary ml-1">{clarityLevel}/4</span>
          </div>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">Signal Range</span>
          <span className="font-mono text-text-secondary">{jumpRadius}u</span>
        </div>
      </div>
    </div>
  );
}

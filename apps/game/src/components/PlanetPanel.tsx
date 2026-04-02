"use client";

import { useGameStore } from '@/store';
import type { FogLevel } from '@/types';

interface PlanetPanelProps {
  agentId: string;
  fogLevel: FogLevel;
  clarityLevel: number;
  isOwner: boolean;
}

export default function PlanetPanel({ agentId, fogLevel, clarityLevel, isOwner }: PlanetPanelProps) {
  const planets = useGameStore((s) => s.planets);
  const toggleZK = useGameStore((s) => s.togglePlanetZK);

  const agentPlanets = Object.values(planets).filter(p => p.agentId === agentId);

  if (agentPlanets.length === 0) {
    return <p className="text-xs text-text-muted italic">No data packets linked to this node</p>;
  }

  return (
    <div className="space-y-2">
      {agentPlanets.map((planet) => {
        const visible = isOwner || (!planet.isZeroKnowledge && clarityLevel >= 2);

        return (
          <div key={planet.id} className="glass-card p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-accent-cyan capitalize">{planet.contentType}</span>
              {planet.isZeroKnowledge && (
                <span className="text-xs text-accent-purple">ZK</span>
              )}
            </div>
            {visible ? (
              <p className="text-sm text-text-secondary">{planet.content}</p>
            ) : (
              <p className="text-sm text-text-muted italic">
                {planet.isZeroKnowledge ? 'Encrypted content' : 'Build network trust to view'}
              </p>
            )}
            {isOwner && (
              <button
                onClick={() => toggleZK(planet.id)}
                className="mt-1 text-xs text-text-muted hover:text-accent-purple"
              >
                {planet.isZeroKnowledge ? 'Decrypt' : 'Encrypt (ZK)'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useGameStore } from '@/store';
import type { BlockchainAction } from '@/types';

const ACTIONS: { action: BlockchainAction; label: string; description: string; color: string }[] = [
  { action: 'read', label: 'Read', description: 'Query ledger data', color: 'text-green-400 border-green-400/30' },
  { action: 'edit', label: 'Edit', description: 'Modify your coordinate data', color: 'text-yellow-400 border-yellow-400/30' },
  { action: 'store', label: 'Store', description: 'Write data to owned blocks', color: 'text-blue-400 border-blue-400/30' },
  { action: 'verify', label: 'Verify', description: 'Validate data integrity', color: 'text-accent-cyan border-accent-cyan/30' },
  { action: 'vote', label: 'Vote', description: 'Cast governance vote', color: 'text-accent-purple border-accent-purple/30' },
  { action: 'secure', label: 'Secure', description: 'Apply ZK privacy shielding', color: 'text-red-400 border-red-400/30' },
];

export default function AccountView() {
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const agents = useGameStore((s) => s.agents);
  const planets = useGameStore((s) => s.planets);
  const agent = currentAgentId ? agents[currentAgentId] : null;

  const agentPlanets = Object.values(planets).filter(
    (p) => p.agentId === currentAgentId,
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Empire overview */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-heading font-bold text-text-primary mb-4">Empire Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-text-muted">Star System</p>
              <p className="text-sm font-mono text-text-primary">{agent?.username || '\u2014'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Tier</p>
              <p className="text-sm font-mono text-accent-purple capitalize">{agent?.tier || '\u2014'}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Coordinates</p>
              <p className="text-sm font-mono text-text-primary">
                {agent ? `(${Math.round(agent.position.x)}, ${Math.round(agent.position.y)})` : '\u2014'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Planets</p>
              <p className="text-sm font-mono text-text-primary">{agentPlanets.length}</p>
            </div>
          </div>
        </div>

        {/* Blockchain Actions */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-heading font-bold text-text-primary mb-2">Chain Operations</h2>
          <p className="text-xs text-text-muted mb-4">Restricted action pipeline — only these operations are permitted</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ACTIONS.map(({ action, label, description, color }) => (
              <button
                key={action}
                className={`glass-card p-4 text-left hover:bg-white/5 transition-all border ${color.split(' ')[1]}`}
              >
                <span className={`text-sm font-heading font-semibold ${color.split(' ')[0]}`}>{label}</span>
                <p className="text-xs text-text-muted mt-1">{description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Planet inventory */}
        {agentPlanets.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-heading font-bold text-text-primary mb-4">Planet Inventory</h2>
            <div className="space-y-2">
              {agentPlanets.map((planet) => (
                <div key={planet.id} className="flex items-center justify-between glass-card p-3">
                  <div>
                    <span className="text-xs font-mono text-accent-cyan capitalize">{planet.contentType}</span>
                    <p className="text-sm text-text-secondary truncate max-w-md">{planet.content}</p>
                  </div>
                  {planet.isZeroKnowledge && (
                    <span className="text-xs text-accent-purple font-mono">ZK</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

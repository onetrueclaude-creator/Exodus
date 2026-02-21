"use client";

import { useGameStore } from '@/store';
import type { BlockchainAction } from '@/types';

const ACTIONS: { action: BlockchainAction; label: string; description: string; color: string; symbol: string }[] = [
  { action: 'read', label: 'Read', description: 'Query ledger data', color: 'text-green-400 border-green-400/30', symbol: '\u25B7' },
  { action: 'edit', label: 'Edit', description: 'Modify your coordinate data', color: 'text-yellow-400 border-yellow-400/30', symbol: '\u25C6' },
  { action: 'store', label: 'Store', description: 'Write data to owned blocks', color: 'text-blue-400 border-blue-400/30', symbol: '\u25A3' },
  { action: 'verify', label: 'Verify', description: 'Validate data integrity', color: 'text-accent-cyan border-accent-cyan/30', symbol: '\u25CE' },
  { action: 'vote', label: 'Vote', description: 'Cast governance vote', color: 'text-accent-purple border-accent-purple/30', symbol: '\u2610' },
  { action: 'secure', label: 'Secure', description: 'Apply ZK privacy shielding', color: 'text-red-400 border-red-400/30', symbol: '\u25A0' },
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
          <div className="flex items-center gap-2 mb-5">
            <span className="text-accent-cyan text-sm">{'\u25C8'}</span>
            <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">Network Overview</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/[0.02] rounded-lg p-3 border border-card-border">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Neural Node</p>
              <p className="text-sm font-mono text-text-primary">{agent?.username || '\u2014'}</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3 border border-card-border">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Tier</p>
              <p className={`text-sm font-mono capitalize ${
                agent?.tier === 'opus' ? 'text-accent-purple' :
                agent?.tier === 'haiku' ? 'text-yellow-400' : 'text-accent-cyan'
              }`}>{agent?.tier || '\u2014'}</p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3 border border-card-border">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Coordinates</p>
              <p className="text-sm font-mono text-text-primary">
                {agent ? `(${Math.round(agent.position.x)}, ${Math.round(agent.position.y)})` : '\u2014'}
              </p>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3 border border-card-border">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Data Packets</p>
              <p className="text-sm font-mono text-text-primary">{agentPlanets.length}</p>
            </div>
          </div>
        </div>

        {/* Blockchain Actions */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-accent-purple text-sm">{'\u2263'}</span>
            <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">Chain Operations</h2>
          </div>
          <p className="text-xs text-text-muted mb-5 pl-6">Restricted action pipeline {'\u2014'} only these operations are permitted</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ACTIONS.map(({ action, label, description, color, symbol }) => (
              <button
                key={action}
                className={`glass-card-interactive p-4 text-left border ${color.split(' ')[1]} group`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm ${color.split(' ')[0]} opacity-60 group-hover:opacity-100 transition-opacity`}>{symbol}</span>
                  <span className={`text-sm font-heading font-semibold ${color.split(' ')[0]}`}>{label}</span>
                </div>
                <p className="text-xs text-text-muted mt-1 pl-6">{description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Planet inventory */}
        {agentPlanets.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-yellow-400 text-sm">{'\u25C6'}</span>
              <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">Data Packet Inventory</h2>
            </div>
            <div className="space-y-2">
              {agentPlanets.map((planet) => (
                <div key={planet.id} className="flex items-center justify-between glass-card p-3 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-accent-cyan text-[10px]">{'\u25A3'}</span>
                    <div>
                      <span className="text-[10px] font-mono text-accent-cyan uppercase tracking-wider">{planet.contentType}</span>
                      <p className="text-sm text-text-secondary truncate max-w-md">{planet.content}</p>
                    </div>
                  </div>
                  {planet.isZeroKnowledge && (
                    <span className="text-[10px] text-accent-purple font-mono bg-accent-purple/10 px-2 py-0.5 rounded-full border border-accent-purple/20">ZK</span>
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

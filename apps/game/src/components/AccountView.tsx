"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store';
import { getRewards, getStaking, getSecuringStatus, getVesting, getSettings } from '@/services/testnetApi';
import type { RewardsResponse, SecuringStatusResponse, VestingResponse, WalletSettingsResponse } from '@/types';

export default function AccountView() {
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const agents = useGameStore((s) => s.agents);
  const planets = useGameStore((s) => s.planets);
  const energy = useGameStore((s) => s.energy);
  const agntcBalance = useGameStore((s) => s.agntcBalance);
  const securedChains = useGameStore((s) => s.securedChains);
  const chainMode = useGameStore((s) => s.chainMode);
  const agent = currentAgentId ? agents[currentAgentId] : null;

  const agentPlanets = Object.values(planets).filter(
    (p) => p.agentId === currentAgentId,
  );

  // Chain data state
  const [rewards, setRewards] = useState<RewardsResponse | null>(null);
  const [staking, setStaking] = useState<{ token_staked: number; cpu_staked: number; effective_stake: number } | null>(null);
  const [securing, setSecuring] = useState<SecuringStatusResponse | null>(null);
  const [vesting, setVesting] = useState<VestingResponse | null>(null);
  const [settings, setSettings] = useState<WalletSettingsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch chain data on mount and when chainMode is testnet
  useEffect(() => {
    if (chainMode !== 'testnet') return;
    setLoading(true);

    Promise.allSettled([
      getRewards(0),
      getStaking(0),
      getSecuringStatus(0),
      getVesting(0),
      getSettings(0),
    ]).then(([rRes, sRes, secRes, vRes, setRes]) => {
      if (rRes.status === 'fulfilled') setRewards(rRes.value);
      if (sRes.status === 'fulfilled') setStaking(sRes.value);
      if (secRes.status === 'fulfilled') setSecuring(secRes.value);
      if (vRes.status === 'fulfilled') setVesting(vRes.value);
      if (setRes.status === 'fulfilled') setSettings(setRes.value);
      setLoading(false);
    });
  }, [chainMode]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Network overview */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-accent-cyan text-sm">{'\u25C8'}</span>
            <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">Network Overview</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Neural Node" value={agent?.username || '\u2014'} />
            <StatCard
              label="Tier"
              value={agent?.tier?.toUpperCase() || '\u2014'}
              valueClass={
                agent?.tier === 'opus' ? 'text-accent-purple' :
                agent?.tier === 'haiku' ? 'text-yellow-400' : 'text-accent-cyan'
              }
            />
            <StatCard
              label="Coordinates"
              value={agent ? `(${Math.round(agent.position.x)}, ${Math.round(agent.position.y)})` : '\u2014'}
            />
            <StatCard label="Data Packets" value={String(agentPlanets.length)} />
          </div>
        </div>

        {/* Resources — live from store */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-yellow-400 text-sm">{'\u26A1'}</span>
            <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">Resources</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="CPU Energy" value={energy.toFixed(0)} valueClass="text-yellow-300" dotColor="bg-yellow-400" />
            <StatCard label="Secured Chains" value={String(securedChains)} valueClass="text-emerald-300" dotColor="bg-emerald-400" />
            <StatCard label="AGNTC Balance" value={agntcBalance.toFixed(4)} valueClass="text-accent-cyan" dotColor="bg-accent-cyan" />
            <StatCard label="Data Frags" value={String(agentPlanets.length)} valueClass="text-blue-300" dotColor="bg-blue-400" />
          </div>
        </div>

        {/* Staking & Effective Stake — from chain */}
        {chainMode === 'testnet' && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-accent-purple text-sm">{'\u2263'}</span>
              <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">Staking & Economy</h2>
              {loading && <span className="text-[9px] text-text-muted animate-pulse ml-2">syncing...</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Token Staked"
                value={staking ? staking.token_staked.toFixed(4) : '\u2014'}
                valueClass="text-accent-purple"
              />
              <StatCard
                label="CPU Staked"
                value={staking ? staking.cpu_staked.toFixed(2) : '\u2014'}
                valueClass="text-yellow-400"
              />
              <StatCard
                label="Effective Stake"
                value={settings ? settings.effective_stake.toFixed(4) : '\u2014'}
                valueClass="text-accent-cyan"
                sublabel="S = 0.40\u00D7token + 0.60\u00D7CPU"
              />
              <StatCard
                label="Mining Rate"
                value={settings ? `${settings.mining_rate.toFixed(6)}/blk` : '\u2014'}
                valueClass="text-emerald-400"
              />
            </div>
          </div>
        )}

        {/* Securing Positions — from chain */}
        {chainMode === 'testnet' && securing && (securing.active_positions.length > 0 || securing.completed_positions.length > 0) && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-emerald-400 text-sm">{'\u26D3'}</span>
              <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">Securing Positions</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <StatCard label="Total Secured" value={String(securing.total_secured_chains)} valueClass="text-emerald-300" />
              <StatCard label="CPU Committed" value={securing.total_cpu_committed.toFixed(2)} valueClass="text-yellow-400" />
              <StatCard label="Rewards Earned" value={`${securing.total_rewards_earned.toFixed(6)} AGNTC`} valueClass="text-accent-cyan" />
            </div>

            {/* Active positions */}
            {securing.active_positions.length > 0 && (
              <>
                <div className="text-[10px] text-text-muted/60 tracking-wider mb-2">ACTIVE POSITIONS</div>
                <div className="space-y-2 mb-4">
                  {securing.active_positions.map((pos) => (
                    <div key={pos.id} className="flex items-center justify-between bg-white/[0.02] rounded-lg p-3 border border-emerald-400/10">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <div>
                          <span className="text-[10px] font-mono text-emerald-400">{pos.id.slice(0, 12)}</span>
                          <p className="text-[9px] text-text-muted">
                            Blocks {pos.start_block}{'\u2192'}{pos.end_block} | Density {(pos.density * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-mono text-yellow-400">{pos.cpu_committed.toFixed(1)} CPU</span>
                        <p className="text-[9px] text-emerald-400">{pos.total_reward.toFixed(6)} AGNTC</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Completed positions */}
            {securing.completed_positions.length > 0 && (
              <>
                <div className="text-[10px] text-text-muted/60 tracking-wider mb-2">COMPLETED</div>
                <div className="space-y-2">
                  {securing.completed_positions.map((pos) => (
                    <div key={pos.id} className="flex items-center justify-between bg-white/[0.02] rounded-lg p-3 border border-card-border opacity-60">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40" />
                        <div>
                          <span className="text-[10px] font-mono text-text-muted">{pos.id.slice(0, 12)}</span>
                          <p className="text-[9px] text-text-muted/50">
                            Blocks {pos.start_block}{'\u2192'}{pos.end_block}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-mono text-text-muted">{pos.cpu_committed.toFixed(1)} CPU</span>
                        <p className="text-[9px] text-text-muted/70">{pos.total_reward.toFixed(6)} AGNTC</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Vesting Schedule — from chain */}
        {chainMode === 'testnet' && vesting && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-blue-400 text-sm">{'\u29D7'}</span>
              <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">Vesting Schedule</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Faction" value={vesting.faction} valueClass="text-text-primary capitalize" />
              <StatCard label="Total Allocation" value={String(vesting.total_allocation)} valueClass="text-accent-cyan" />
              <StatCard label="Vested" value={String(vesting.vested)} valueClass="text-emerald-400" />
              <StatCard label="Locked" value={String(vesting.locked)} valueClass="text-yellow-400" />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <span className="text-[9px] text-text-muted/50">
                {vesting.immediate_pct * 100}% immediate, {vesting.vest_days}d vest
              </span>
              {vesting.locked > 0 && (
                <span className="text-[9px] text-yellow-400/60">
                  Next unlock: month {vesting.next_unlock_month}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Rewards — from chain */}
        {chainMode === 'testnet' && rewards && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-accent-cyan text-sm">{'\u2606'}</span>
              <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">Cumulative Rewards</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="AGNTC Earned" value={rewards.agntc_earned.toFixed(6)} valueClass="text-accent-cyan" />
              <StatCard label="Dev Points" value={rewards.dev_points.toFixed(1)} valueClass="text-blue-400" />
              <StatCard label="Research Points" value={rewards.research_points.toFixed(1)} valueClass="text-accent-purple" />
              <StatCard label="Secured Chains" value={String(rewards.secured_chains)} valueClass="text-emerald-400" />
            </div>
          </div>
        )}

        {/* Offline fallback */}
        {chainMode !== 'testnet' && (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-text-muted">Chain data unavailable in offline mode.</p>
            <p className="text-[10px] text-text-muted/50 mt-1">Connect to testnet to view rewards, staking, and securing positions.</p>
          </div>
        )}

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

function StatCard({ label, value, valueClass = 'text-text-primary', dotColor, sublabel }: {
  label: string;
  value: string;
  valueClass?: string;
  dotColor?: string;
  sublabel?: string;
}) {
  return (
    <div className="bg-white/[0.02] rounded-lg p-3 border border-card-border">
      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {dotColor && <div className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />}
        <p className={`text-sm font-mono ${valueClass}`}>{value}</p>
      </div>
      {sublabel && <p className="text-[8px] text-text-muted/40 mt-0.5">{sublabel}</p>}
    </div>
  );
}

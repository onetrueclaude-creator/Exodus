"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store';
import { getRewards, getStaking, getSecuringStatus, getVesting, getSettings, setOwnerName, getOwnerName } from '@/services/testnetApi';
import { getWalletIndex } from '@/lib/walletIndex';
import type { RewardsResponse, SecuringStatusResponse, VestingResponse, WalletSettingsResponse } from '@/types';
import { getNodeTier, TIER_DISPLAY_NAME } from '@/lib/nodeTier';
import { sciFormat } from '@/lib/format';
import { getSubscriptionEconomy } from '@/types/subscription';

export default function AccountView() {
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const agents = useGameStore((s) => s.agents);
  const planets = useGameStore((s) => s.planets);
  const energy = useGameStore((s) => s.energy);
  const minerals = useGameStore((s) => s.minerals);
  const agntcBalance = useGameStore((s) => s.agntcBalance);
  const securedChains = useGameStore((s) => s.securedChains);
  const chainMode = useGameStore((s) => s.chainMode);
  const switchAgent = useGameStore((s) => s.switchAgent);
  const currentUserTier = useGameStore((s) => s.currentUserTier);

  // Every agent the player owns — primary (homenode) first, sub-agents next.
  // Replaces the single-agent "Network Overview" view which only ever showed
  // the currentAgentId (and thus only the *latest* deploy).
  const ownedAgents = Object.values(agents)
    .filter((a) => a.userId === currentUserId)
    .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));

  const planetCountFor = (agentId: string) =>
    Object.values(planets).filter((p) => p.agentId === agentId).length;

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

  // Owner name — the player's unique, human-readable handle on chain.
  const selfAgent = Object.values(agents).find((a) => a.isSelf);
  const [ownerName, setOwnerNameState] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nameStatus, setNameStatus] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [savingName, setSavingName] = useState(false);

  // Subscription tier change
  const [tierConfirming, setTierConfirming] = useState(false);
  const [tierChanging, setTierChanging] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);

  const changeTier = async () => {
    if (!currentUserTier || currentUserTier === 'founder') return;
    const sub = currentUserTier === 'professional' ? 'PROFESSIONAL' : 'COMMUNITY';
    const target = sub === 'COMMUNITY' ? 'PROFESSIONAL' : 'COMMUNITY';

    setTierChanging(true);
    setTierError(null);
    try {
      const res = await fetch('/api/tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: target }),
      });
      if (res.ok) {
        useGameStore.getState().setCurrentUserTier(target === 'PROFESSIONAL' ? 'professional' : 'community');
        useGameStore.getState().setCpuRegen(getSubscriptionEconomy(target).cpuRegen);
        // Fire-and-forget: keep server-authoritative identity in sync
        fetch('/api/me').catch(() => {});
      } else {
        setTierError('Could not change tier. Please try again.');
      }
    } catch {
      setTierError('Could not change tier. Please try again.');
    } finally {
      setTierChanging(false);
      setTierConfirming(false);
    }
  };

  // Seed the field from the self agent's username (owner name from the chain),
  // falling back to GET /api/name for the player's wallet. Only seeds while the
  // user hasn't started typing (empty input), so an in-progress edit is preserved.
  useEffect(() => {
    if (selfAgent?.username) {
      setOwnerNameState(selfAgent.username);
      setNameInput((prev) => (prev === '' ? selfAgent.username ?? '' : prev));
      return;
    }
    if (chainMode !== 'testnet') return;
    getOwnerName(getWalletIndex())
      .then((r) => {
        setOwnerNameState(r.name);
        setNameInput((prev) => (prev === '' ? r.name : prev));
      })
      .catch(() => {});
  }, [selfAgent?.username, chainMode]);

  const saveOwnerName = async () => {
    const name = nameInput.trim();
    if (!name || name === ownerName) return;
    setSavingName(true);
    setNameStatus(null);
    try {
      const res = await setOwnerName(getWalletIndex(), name);
      setOwnerNameState(res.name);
      setNameInput(res.name);
      setNameStatus({ tone: 'ok', text: 'Saved' });
    } catch (e) {
      // Surface "Name taken" specifically (chain returns 409 for duplicates).
      const msg = e instanceof Error ? e.message : '';
      setNameStatus({ tone: 'err', text: msg.includes('409') ? 'Name taken' : 'Could not save name' });
    } finally {
      setSavingName(false);
    }
  };

  // Fetch chain data on mount and when chainMode is testnet
  useEffect(() => {
    if (chainMode !== 'testnet') return;
    setLoading(true);

    const walletIndex = getWalletIndex();
    Promise.allSettled([
      getRewards(walletIndex),
      getStaking(walletIndex),
      getSecuringStatus(walletIndex),
      getVesting(walletIndex),
      getSettings(walletIndex),
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
        {/* Owner Name \u2014 the player's unique, human-readable handle on chain */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-accent-cyan text-sm">{'\u25c9'}</span>
            <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">Owner Name</h2>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nameInput}
              maxLength={24}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (nameStatus) setNameStatus(null);
              }}
              placeholder="Choose a name"
              aria-label="Owner name"
              className="flex-1 bg-white/[0.03] border border-card-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent-cyan/50"
            />
            <button
              type="button"
              onClick={saveOwnerName}
              disabled={savingName || !nameInput.trim() || nameInput.trim() === ownerName}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {savingName ? 'Saving\u2026' : 'Save'}
            </button>
          </div>
          {nameStatus && (
            <p className={`text-[11px] font-mono mt-2 ${nameStatus.tone === 'err' ? 'text-rose-400' : 'text-emerald-400'}`}>
              {nameStatus.text}
            </p>
          )}
          <p className="text-[10px] text-text-muted/50 mt-2">
            1{'\u2013'}24 characters: letters, digits, {'\u2019'}_{'\u2019'} or {'\u2019'}-{'\u2019'}. Must be unique across the network.
          </p>
        </div>

        {/* Subscription \u2014 show only for Community/Professional players (not Founder role axis) */}
        {currentUserTier && currentUserTier !== 'founder' && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-accent-cyan text-sm">{'\u25c8'}</span>
              <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">Subscription</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-mono text-text-primary capitalize">{currentUserTier}</p>
                <p className="text-[10px] text-text-muted/50 mt-0.5">testnet \u2014 free</p>
              </div>
              {tierConfirming ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={changeTier}
                    disabled={tierChanging}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {tierChanging ? 'Switching\u2026' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTierConfirming(false); setTierError(null); }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-card-border text-text-muted hover:bg-white/[0.04] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setTierConfirming(true); setTierError(null); }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
                >
                  {currentUserTier === 'professional' ? 'Downgrade to Community' : 'Upgrade to Professional'}
                </button>
              )}
            </div>
            {tierError && (
              <p className="text-[11px] font-mono mt-2 text-rose-400">{tierError}</p>
            )}
          </div>
        )}

        {/* Owned agents \u2014 one entry per agent, click to switch terminal context */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-accent-cyan text-sm">{'\u25C8'}</span>
            <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">
              My Agents <span className="text-text-muted/40 font-mono text-sm">({ownedAgents.length})</span>
            </h2>
          </div>
          {ownedAgents.length === 0 ? (
            <p className="text-sm text-text-muted/60">No agents claimed yet.</p>
          ) : (
            <div className="space-y-2">
              {ownedAgents.map((a) => {
                const isActive = a.id === currentAgentId;
                const tier = getNodeTier(a.level);
                const tierClass =
                  tier === 'nexus' || tier === 'lattice' ? 'text-accent-purple' :
                  tier === 'synapse' ? 'text-yellow-400' : 'text-accent-cyan';
                return (
                  <button
                    key={a.id}
                    onClick={() => switchAgent(a.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-200 ${
                      isActive
                        ? 'border-accent-cyan/50 bg-accent-cyan/[0.06] shadow-[0_0_12px_rgba(0,212,255,0.08)]'
                        : 'border-card-border bg-white/[0.02] hover:bg-white/[0.04] hover:border-card-border-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-base ${a.isPrimary ? 'text-yellow-400' : 'text-text-muted/60'}`}>
                        {a.isPrimary ? '\u2605' : '\u25C6'}
                      </span>
                      <div>
                        <div className="text-sm font-mono text-text-primary">{a.username || a.id.slice(0, 12)}</div>
                        <div className="text-[10px] text-text-muted font-mono">
                          <span className={tierClass}>{TIER_DISPLAY_NAME[tier]}</span>
                          <span className="mx-1.5 text-text-muted/40">{'\u00B7'}</span>
                          {/* Coordinates retired (orbital rank-seat model) \u2014 show role instead. */}
                          <span>{a.isPrimary ? 'Homenode' : 'Subnode'}</span>
                          <span className="mx-1.5 text-text-muted/40">{'\u00B7'}</span>
                          <span>{planetCountFor(a.id)} packets</span>
                        </div>
                      </div>
                    </div>
                    {isActive ? (
                      <span className="text-[9px] text-accent-cyan font-mono tracking-wider px-2 py-0.5 rounded border border-accent-cyan/30 bg-accent-cyan/5">
                        SELECTED
                      </span>
                    ) : (
                      <span className="text-[9px] text-text-muted/40 font-mono tracking-wider">
                        switch {'\u2192'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Resources — live from store */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-yellow-400 text-sm">{'\u26A1'}</span>
            <h2 className="text-lg font-heading font-bold text-text-primary tracking-wide">Resources</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="CPU Energy" value={energy.toFixed(0)} valueClass="text-yellow-300" dotColor="bg-yellow-400" sublabel="compute pool" />
            <StatCard label="Secured Chains" value={String(securedChains)} valueClass="text-emerald-300" dotColor="bg-emerald-400" sublabel="agentic-work proofs" />
            <StatCard label="AGNTC Balance" value={sciFormat(agntcBalance)} valueClass="text-accent-cyan" dotColor="bg-accent-cyan" sublabel="spendable on-chain" />
            <StatCard label="Frags" value={minerals.toFixed(0)} valueClass="text-blue-300" dotColor="bg-blue-400" sublabel="mining output" />
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
                value={staking ? sciFormat(staking.token_staked) : '\u2014'}
                valueClass="text-accent-purple"
              />
              <StatCard
                label="CPU Staked"
                value={staking ? staking.cpu_staked.toFixed(2) : '\u2014'}
                valueClass="text-yellow-400"
              />
              <StatCard
                label="Effective Stake"
                value={settings ? sciFormat(settings.effective_stake) : '\u2014'}
                valueClass="text-accent-cyan"
                sublabel="S = 0.40×token + 0.60×CPU"
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
              <StatCard label="Position Blocks" value={String(securing.total_secured_chains)} valueClass="text-emerald-300" sublabel="CPU-committed securing" />
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
                            Blocks {pos.start_block}{'\u2192'}{pos.end_block}
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
              {/* Chain serves the player's identity in vesting.faction (server contract
                  field, not renamed here); displayed as the unified "Tier" label. */}
              <StatCard label="Tier" value={vesting.faction} valueClass="text-text-primary capitalize" />
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
      {sublabel && <p className="text-[11px] text-text-muted/50 mt-0.5">{sublabel}</p>}
    </div>
  );
}

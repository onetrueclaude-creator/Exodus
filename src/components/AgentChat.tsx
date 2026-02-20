"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Agent, AgentTier } from '@/types/agent';
import { TIER_CPU_COST, TIER_MINING_RATE, TIER_CLAIM_COST } from '@/types/agent';
import { useGameStore } from '@/store';
import { getDistance } from '@/lib/proximity';

/* ── Agent Action Definitions ─────────────────────────────── */

interface AgentAction {
  id: string;
  label: string;
  icon: string;
  cpuCost: number;
  estTime: string;
  description: string;
  category: 'economy' | 'military' | 'intel' | 'social';
  /** If set, this action opens a sub-menu of choices instead of executing directly */
  subChoices?: { id: string; label: string; description: string }[];
}

const AGENT_ACTIONS: Record<AgentTier, AgentAction[]> = {
  opus: [
    { id: 'set-mining', label: 'Adjust Mining Rate', icon: '⛏', cpuCost: 2, estTime: '~30s', description: 'Reallocate mining output', category: 'economy',
      subChoices: [
        { id: 'mining-low', label: 'Low Output (25%)', description: 'Reduce mining, save CPU' },
        { id: 'mining-normal', label: 'Standard Output (100%)', description: 'Default mining rate' },
        { id: 'mining-boost', label: 'Boost Output (200%)', description: 'Double mining, costs extra CPU' },
      ],
    },
    { id: 'set-cpu-save', label: 'CPU Power Save', icon: '⚡', cpuCost: 1, estTime: '~10s', description: 'Toggle low-power mode', category: 'economy',
      subChoices: [
        { id: 'power-normal', label: 'Normal Power', description: 'Full CPU allocation' },
        { id: 'power-save', label: 'Power Save Mode', description: 'Halve energy limit to conserve' },
      ],
    },
    { id: 'expand-border', label: 'Expand Territory', icon: '🔷', cpuCost: 5, estTime: '~2min', description: 'Push borders outward', category: 'military',
      subChoices: [
        { id: 'pressure-2', label: 'Light Pressure (+2)', description: '+2 CPU/t, +0.2 AGNTC/t' },
        { id: 'pressure-6', label: 'Medium Pressure (+6)', description: '+6 CPU/t, +0.6 AGNTC/t' },
        { id: 'pressure-12', label: 'Heavy Pressure (+12)', description: '+12 CPU/t, +1.2 AGNTC/t' },
        { id: 'pressure-0', label: 'Release Pressure (0)', description: 'Stop border expansion' },
      ],
    },
    { id: 'deploy', label: 'Deploy Agent', icon: '🛰', cpuCost: 4, estTime: '~5min', description: 'Claim a star system with new sub-agent', category: 'military' },
    { id: 'deep-scan', label: 'Deep Scan Sector', icon: '📡', cpuCost: 6, estTime: '~3min', description: 'Reveal agents in wide radius', category: 'intel' },
    { id: 'diplomatic-msg', label: 'Diplomatic Broadcast', icon: '📜', cpuCost: 3, estTime: '~1min', description: 'Haiku to all nearby agents', category: 'social' },
  ],
  sonnet: [
    { id: 'set-mining', label: 'Adjust Mining Rate', icon: '⛏', cpuCost: 1, estTime: '~30s', description: 'Reallocate mining output', category: 'economy',
      subChoices: [
        { id: 'mining-low', label: 'Low Output (25%)', description: 'Reduce mining, save CPU' },
        { id: 'mining-normal', label: 'Standard Output (100%)', description: 'Default mining rate' },
        { id: 'mining-boost', label: 'Boost Output (200%)', description: 'Double mining, costs extra CPU' },
      ],
    },
    { id: 'set-cpu-save', label: 'CPU Power Save', icon: '⚡', cpuCost: 1, estTime: '~10s', description: 'Toggle low-power mode', category: 'economy',
      subChoices: [
        { id: 'power-normal', label: 'Normal Power', description: 'Full CPU allocation' },
        { id: 'power-save', label: 'Power Save Mode', description: 'Halve energy limit to conserve' },
      ],
    },
    { id: 'expand-border', label: 'Expand Territory', icon: '🔷', cpuCost: 3, estTime: '~2min', description: 'Push borders outward', category: 'military',
      subChoices: [
        { id: 'pressure-2', label: 'Light Pressure (+2)', description: '+2 CPU/t, +0.2 AGNTC/t' },
        { id: 'pressure-6', label: 'Medium Pressure (+6)', description: '+6 CPU/t, +0.6 AGNTC/t' },
        { id: 'pressure-0', label: 'Release Pressure (0)', description: 'Stop border expansion' },
      ],
    },
    { id: 'deploy', label: 'Deploy Agent', icon: '🛰', cpuCost: 4, estTime: '~3min', description: 'Claim a star system with Haiku sub-agent', category: 'military' },
    { id: 'scan-local', label: 'Scan Vicinity', icon: '📡', cpuCost: 2, estTime: '~1min', description: 'Reveal nearby agents', category: 'intel' },
    { id: 'send-haiku', label: 'Compose Haiku', icon: '✍', cpuCost: 1, estTime: '~30s', description: 'Transmit haiku to target', category: 'social' },
  ],
  haiku: [
    { id: 'set-mining', label: 'Adjust Mining Rate', icon: '⛏', cpuCost: 1, estTime: '~30s', description: 'Reallocate mining output', category: 'economy',
      subChoices: [
        { id: 'mining-low', label: 'Low Output (25%)', description: 'Reduce mining, save CPU' },
        { id: 'mining-normal', label: 'Standard Output (100%)', description: 'Default mining rate' },
        { id: 'mining-boost', label: 'Boost Output (200%)', description: 'Double mining, costs extra CPU' },
      ],
    },
    { id: 'set-cpu-save', label: 'CPU Power Save', icon: '⚡', cpuCost: 0, estTime: '~10s', description: 'Toggle low-power mode', category: 'economy',
      subChoices: [
        { id: 'power-normal', label: 'Normal Power', description: 'Full CPU allocation' },
        { id: 'power-save', label: 'Power Save Mode', description: 'Halve energy limit to conserve' },
      ],
    },
    { id: 'fortify', label: 'Fortify Position', icon: '🛡', cpuCost: 1, estTime: '~1min', description: 'Strengthen border defense', category: 'military',
      subChoices: [
        { id: 'pressure-2', label: 'Light Defense (+2)', description: '+2 CPU/t border strength' },
        { id: 'pressure-0', label: 'Stand Down (0)', description: 'Remove defense allocation' },
      ],
    },
    { id: 'ping', label: 'Ping Sector', icon: '📡', cpuCost: 1, estTime: '~20s', description: 'Quick scan of surroundings', category: 'intel' },
    { id: 'send-haiku', label: 'Compose Haiku', icon: '✍', cpuCost: 0, estTime: '~15s', description: 'Transmit haiku message', category: 'social' },
  ],
};

/* ── Chat Message Types ───────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
}

/* ── Agent Response Templates ─────────────────────────────── */

const ACTION_RESPONSES: Record<string, Record<AgentTier, string>> = {
  'set-mining': {
    opus: 'Mining reallocation complete.\nResource pipelines recalibrated.\nNew output rate active.',
    sonnet: 'Mining flow adjusted—\nnew extraction rate confirmed.\nPipeline recalibrated.',
    haiku: 'Mining rate updated.\nOutput adjusted.',
  },
  'set-cpu-save': {
    opus: 'Power configuration updated.\nEnergy limit recalibrated.\nSystem efficiency optimized.',
    sonnet: 'Power mode switched—\nenergy conservation active.\nLimits recalibrated.',
    haiku: 'Power mode changed.\nLimits updated.',
  },
  'expand-border': {
    opus: 'Border pressure reallocated.\nTerritory vectors updated.\nAGNTC flow adjusted for expansion.',
    sonnet: 'Borders shifting—\npressure allocation changed.\nTerritory updating.',
    haiku: 'Borders adjusted.\nPressure set.',
  },
  'fortify': {
    opus: 'Defensive perimeter updated.\nBorder integrity reinforced.',
    sonnet: 'Defense posture changed—\nborder strength recalibrated.',
    haiku: 'Defense updated.\nPosition held.',
  },
  'deploy': {
    opus: 'Sub-agent deployed.\nNew node claimed and operational.\nTerminal now available.',
    sonnet: 'Agent deployed—\nnode claimed successfully.\nNew terminal online.',
    haiku: '',
  },
  'deep-scan': {
    opus: 'Sector sweep complete.\nAll agents and resources in range\nnow visible on grid overlay.',
    sonnet: '',
    haiku: '',
  },
  'scan-local': {
    opus: '',
    sonnet: 'Vicinity scanned—\nnearby agents detected.\nGrid overlay updated.',
    haiku: '',
  },
  'ping': {
    opus: '',
    sonnet: '',
    haiku: 'Ping sent.\nSector response received.',
  },
  'send-haiku': {
    opus: '',
    sonnet: 'Haiku composed and\ntransmitted to the network.\nAwaiting response.',
    haiku: 'Message sent.\nHaiku delivered.',
  },
  'diplomatic-msg': {
    opus: 'Diplomatic broadcast sent.\nAll agents within border range\nhave received your transmission.',
    sonnet: '',
    haiku: '',
  },
};

/* ── Component ────────────────────────────────────────────── */

interface AgentChatProps {
  agent: Agent;
  onClose: () => void;
  /** Called when this agent deploys a new sub-agent — passes the new agent ID */
  onDeploy?: (newAgentId: string) => void;
}

export default function AgentChat({ agent, onClose, onDeploy }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'system',
      content: `Terminal connected to ${agent.tier.toUpperCase()}-class agent [${agent.id.slice(0, 8)}]`,
      timestamp: Date.now(),
    },
    {
      id: 'prompt-0',
      role: 'agent',
      content: agent.isPrimary
        ? 'Homeworld systems nominal.\nSelect an action, Commander.'
        : 'Sub-agent online.\nAwaiting instructions.',
      timestamp: Date.now(),
    },
  ]);
  const [processing, setProcessing] = useState(false);
  /** Current sub-choice menu */
  const [pendingAction, setPendingAction] = useState<AgentAction | null>(null);
  /** Deploy flow: step 1 = pick star, step 2 = pick model */
  const [deployStep, setDeployStep] = useState<null | 'pick-star' | 'pick-model'>(null);
  const [deployTarget, setDeployTarget] = useState<{ x: number; y: number; id: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const energy = useGameStore((s) => s.energy);
  const minerals = useGameStore((s) => s.minerals);
  const allAgents = useGameStore((s) => s.agents);
  const setBorderPressure = useGameStore((s) => s.setBorderPressure);
  const setMiningRate = useGameStore((s) => s.setMiningRate);
  const setEnergyLimit = useGameStore((s) => s.setEnergyLimit);
  const createAgent = useGameStore((s) => s.createAgent);

  const actions = AGENT_ACTIONS[agent.tier];

  /** Unclaimed star systems sorted by proximity to this agent */
  const nearbyUnclaimed = useMemo(() => {
    return Object.values(allAgents)
      .filter(a => !a.userId) // unclaimed
      .map(a => ({
        id: a.id,
        x: a.position.x,
        y: a.position.y,
        dist: getDistance(agent.position, a.position),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8); // show closest 8
  }, [allAgents, agent.position]);

  /** Which model tiers this agent can deploy */
  const deployableTiers: AgentTier[] = agent.tier === 'opus'
    ? ['sonnet', 'haiku']
    : agent.tier === 'sonnet'
      ? ['haiku']
      : []; // haiku can't deploy

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMsg = useCallback((role: ChatMessage['role'], content: string) => {
    setMessages(prev => [...prev, {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      content,
      timestamp: Date.now(),
    }]);
  }, []);

  /** Execute a state-changing action on the store */
  const performAction = useCallback((actionId: string, choiceId?: string) => {
    const baseMining = TIER_MINING_RATE[agent.tier];

    switch (actionId) {
      case 'set-mining': {
        if (choiceId === 'mining-low') setMiningRate(agent.id, Math.max(1, Math.floor(baseMining * 0.25)));
        else if (choiceId === 'mining-boost') setMiningRate(agent.id, baseMining * 2);
        else setMiningRate(agent.id, baseMining); // normal
        break;
      }
      case 'set-cpu-save': {
        const base = TIER_CPU_COST[agent.tier] * 5;
        if (choiceId === 'power-save') setEnergyLimit(agent.id, Math.max(1, Math.floor(base / 2)));
        else setEnergyLimit(agent.id, base); // normal
        break;
      }
      case 'expand-border':
      case 'fortify': {
        const pressure = choiceId === 'pressure-2' ? 2
          : choiceId === 'pressure-6' ? 6
          : choiceId === 'pressure-12' ? 12
          : 0;
        setBorderPressure(agent.id, pressure);
        break;
      }
      // scan, ping, haiku, diplomatic — visual-only for now
      default:
        break;
    }
  }, [agent, setBorderPressure, setMiningRate, setEnergyLimit]);

  /** User selects a top-level action */
  const selectAction = async (action: AgentAction) => {
    if (processing) return;
    if (energy < action.cpuCost) {
      addMsg('system', `Insufficient energy. Need ${action.cpuCost} CPU, have ${energy.toFixed(0)}.`);
      return;
    }

    // Deploy flow — multi-step wizard
    if (action.id === 'deploy') {
      if (deployableTiers.length === 0) {
        addMsg('system', 'This agent tier cannot deploy sub-agents.');
        return;
      }
      if (nearbyUnclaimed.length === 0) {
        addMsg('system', 'No unclaimed star systems in range.');
        return;
      }
      addMsg('user', 'Deploy Agent');
      addMsg('agent', 'Select a star system to claim:');
      setPendingAction(null);
      setDeployStep('pick-star');
      setDeployTarget(null);
      return;
    }

    // If action has sub-choices, show them
    if (action.subChoices) {
      addMsg('user', action.label);
      addMsg('agent', `Select ${action.label.toLowerCase()} level:`);
      setPendingAction(action);
      return;
    }

    // Direct execution
    addMsg('user', action.label);
    setProcessing(true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

    performAction(action.id);
    const response = ACTION_RESPONSES[action.id]?.[agent.tier] || 'Action executed.';
    addMsg('agent', response);
    setProcessing(false);
  };

  /** Deploy flow: user picks a star system */
  const selectStar = (star: { id: string; x: number; y: number; dist: number }) => {
    if (processing) return;
    setDeployTarget({ id: star.id, x: star.x, y: star.y });
    addMsg('user', `Star [${star.id.slice(0, 8)}] — ${star.dist.toFixed(0)}ly`);

    if (deployableTiers.length === 1) {
      // Only one tier option — skip model selection, execute directly
      addMsg('agent', `Deploying ${deployableTiers[0].toUpperCase()}-class agent...`);
      executeDeploy(deployableTiers[0], { id: star.id, x: star.x, y: star.y });
    } else {
      addMsg('agent', 'Select agent model to deploy:');
      setDeployStep('pick-model');
    }
  };

  /** Deploy flow: user picks a model tier */
  const selectDeployTier = (tier: AgentTier) => {
    if (processing || !deployTarget) return;
    addMsg('user', `${tier.toUpperCase()}-class`);
    addMsg('agent', `Deploying ${tier.toUpperCase()}-class agent to target...`);
    executeDeploy(tier, deployTarget);
  };

  /** Deploy flow: final execution */
  const executeDeploy = async (tier: AgentTier, target: { id: string; x: number; y: number }) => {
    setDeployStep(null);
    setProcessing(true);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    const eCost = TIER_CLAIM_COST[tier];
    if (energy < eCost) {
      addMsg('system', `Insufficient energy. Need ${eCost}, have ${energy.toFixed(0)}.`);
      setProcessing(false);
      return;
    }

    const newId = createAgent(tier, { x: target.x, y: target.y });
    if (newId) {
      const response = ACTION_RESPONSES['deploy']?.[agent.tier] || 'Agent deployed.';
      addMsg('agent', response);
      if (onDeploy) onDeploy(newId);
    } else {
      addMsg('system', 'Deploy failed — insufficient resources or invalid target.');
    }
    setDeployTarget(null);
    setProcessing(false);
  };

  /** User selects a sub-choice */
  const selectSubChoice = async (choiceId: string, choiceLabel: string) => {
    if (!pendingAction || processing) return;
    const action = pendingAction;
    setPendingAction(null);

    addMsg('user', choiceLabel);
    setProcessing(true);
    await new Promise(r => setTimeout(r, 400 + Math.random() * 600));

    performAction(action.id, choiceId);
    const response = ACTION_RESPONSES[action.id]?.[agent.tier] || 'Configuration updated.';
    addMsg('agent', response);
    setProcessing(false);
  };

  const tierColor: Record<AgentTier, string> = {
    opus: 'text-accent-purple',
    sonnet: 'text-accent-cyan',
    haiku: 'text-yellow-400',
  };

  const tierBorderColor: Record<AgentTier, string> = {
    opus: 'border-accent-purple/30',
    sonnet: 'border-accent-cyan/30',
    haiku: 'border-yellow-400/30',
  };

  const tierBg: Record<AgentTier, string> = {
    opus: 'bg-accent-purple',
    sonnet: 'bg-accent-cyan',
    haiku: 'bg-yellow-400',
  };

  return (
    <div className={`flex flex-col w-80 h-[520px] bg-background-light/95 backdrop-blur-md border ${tierBorderColor[agent.tier]} rounded-xl shadow-lg overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-card-border bg-background/80">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${tierBg[agent.tier]} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${tierBg[agent.tier]}`} />
          </span>
          <div>
            <div className={`text-xs font-bold font-mono ${tierColor[agent.tier]}`}>
              {agent.tier.toUpperCase()} [{agent.id.slice(0, 8)}]
            </div>
            <div className="text-[9px] text-text-muted">
              CPU: {TIER_CPU_COST[agent.tier]}/t &middot; Mining: {agent.miningRate}/t
              {agent.isPrimary && <span className="text-yellow-400 ml-1">★ HW</span>}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary text-sm px-1 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className={`text-xs ${
            msg.role === 'system'
              ? 'text-text-muted italic text-center text-[10px] py-1'
              : msg.role === 'user'
                ? 'text-right'
                : ''
          }`}>
            {msg.role === 'user' && (
              <div className="inline-block bg-accent-cyan/10 border border-accent-cyan/20 rounded-lg px-3 py-1.5 text-text-primary text-left max-w-[85%]">
                <span className="whitespace-pre-wrap">{msg.content}</span>
              </div>
            )}
            {msg.role === 'agent' && (
              <div className={`inline-block bg-background/60 border ${tierBorderColor[agent.tier]} rounded-lg px-3 py-1.5 text-text-secondary text-left max-w-[85%]`}>
                <div className={`text-[9px] font-bold font-mono ${tierColor[agent.tier]} mb-0.5`}>
                  {agent.tier.toUpperCase()}
                </div>
                <span className="whitespace-pre-wrap">{msg.content}</span>
              </div>
            )}
            {msg.role === 'system' && (
              <span>{msg.content}</span>
            )}
          </div>
        ))}
        {processing && (
          <div className="text-xs text-text-muted">
            <span className={`inline-block font-mono text-[10px] ${tierColor[agent.tier]}`}>
              Processing<span className="animate-pulse">...</span>
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Action selection — replaces text input */}
      <div className="border-t border-card-border bg-background/80 px-2 py-2 max-h-[200px] overflow-y-auto">
        {/* Deploy flow: Step 1 — Pick a star system */}
        {deployStep === 'pick-star' ? (
          <div className="space-y-1">
            <div className="text-[9px] text-text-muted font-mono px-1 mb-1">
              SELECT STAR SYSTEM:
            </div>
            {nearbyUnclaimed.length === 0 ? (
              <div className="text-[10px] text-text-muted px-1 py-2">No unclaimed systems in range.</div>
            ) : (
              nearbyUnclaimed.map(star => (
                <button
                  key={star.id}
                  onClick={() => selectStar(star)}
                  disabled={processing}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all hover:bg-card-border/50 border border-transparent hover:border-card-border disabled:opacity-40"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">⭐</span>
                    <div>
                      <div className="text-[11px] font-mono font-semibold text-text-primary">[{star.id.slice(0, 8)}]</div>
                      <div className="text-[9px] text-text-muted">
                        ({star.x.toFixed(0)}, {star.y.toFixed(0)})
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-accent-cyan">{star.dist.toFixed(0)} ly</span>
                </button>
              ))
            )}
            <button
              onClick={() => { setDeployStep(null); setDeployTarget(null); }}
              className="w-full px-2.5 py-1.5 rounded-lg text-[10px] text-text-muted hover:text-text-secondary transition-colors"
            >
              ← Back
            </button>
          </div>
        ) : deployStep === 'pick-model' ? (
          /* Deploy flow: Step 2 — Pick agent model */
          <div className="space-y-1">
            <div className="text-[9px] text-text-muted font-mono px-1 mb-1">
              SELECT AGENT MODEL:
            </div>
            {deployableTiers.map(tier => {
              const eCost = TIER_CLAIM_COST[tier];
              const mCost = Math.ceil(eCost * 0.3);
              const canAfford = energy >= eCost && minerals >= mCost;
              return (
                <button
                  key={tier}
                  onClick={() => canAfford && selectDeployTier(tier)}
                  disabled={processing || !canAfford}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all border border-transparent ${
                    canAfford
                      ? 'hover:bg-card-border/50 hover:border-card-border cursor-pointer'
                      : 'opacity-30 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className={`text-[11px] font-semibold capitalize ${tierColor[tier]}`}>{tier}</div>
                    <div className="text-[9px] text-text-muted">
                      CPU: {TIER_CPU_COST[tier]}/t &middot; Mining: {TIER_MINING_RATE[tier]}/t
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[10px] font-mono ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                      {eCost}E + {mCost}M
                    </div>
                  </div>
                </button>
              );
            })}
            <button
              onClick={() => { setDeployStep('pick-star'); setDeployTarget(null); }}
              className="w-full px-2.5 py-1.5 rounded-lg text-[10px] text-text-muted hover:text-text-secondary transition-colors"
            >
              ← Back
            </button>
          </div>
        ) : pendingAction && pendingAction.subChoices ? (
          /* Sub-choice menu for regular actions */
          <div className="space-y-1">
            <div className="text-[9px] text-text-muted font-mono px-1 mb-1">
              SELECT OPTION:
            </div>
            {pendingAction.subChoices.map(choice => (
              <button
                key={choice.id}
                onClick={() => selectSubChoice(choice.id, choice.label)}
                disabled={processing}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all hover:bg-card-border/50 border border-transparent hover:border-card-border disabled:opacity-40"
              >
                <div>
                  <div className="text-[11px] font-semibold text-text-primary">{choice.label}</div>
                  <div className="text-[9px] text-text-muted">{choice.description}</div>
                </div>
              </button>
            ))}
            <button
              onClick={() => setPendingAction(null)}
              className="w-full px-2.5 py-1.5 rounded-lg text-[10px] text-text-muted hover:text-text-secondary transition-colors"
            >
              ← Back
            </button>
          </div>
        ) : (
          /* Top-level action grid */
          <div className="grid grid-cols-2 gap-1">
            {actions.map(action => {
              // Hide deploy action if this tier can't deploy
              if (action.id === 'deploy' && deployableTiers.length === 0) return null;
              return (
                <button
                  key={action.id}
                  onClick={() => selectAction(action)}
                  disabled={processing || energy < action.cpuCost}
                  className={`flex flex-col items-start px-2 py-1.5 rounded-lg text-left transition-all border border-transparent ${
                    energy < action.cpuCost
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-card-border/50 hover:border-card-border cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-1 w-full">
                    <span className="text-xs">{action.icon}</span>
                    <span className="text-[10px] font-semibold text-text-primary truncate flex-1">{action.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8px] font-mono text-yellow-300">{action.cpuCost}CPU</span>
                    <span className="text-[8px] font-mono text-text-muted">{action.estTime}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

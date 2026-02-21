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
    { id: 'set-mining', label: 'Adjust Mining Rate', icon: '\u26CF', cpuCost: 2, estTime: '~30s', description: 'Reallocate mining output', category: 'economy',
      subChoices: [
        { id: 'mining-low', label: 'Low Output (25%)', description: 'Reduce mining, save CPU' },
        { id: 'mining-normal', label: 'Standard Output (100%)', description: 'Default mining rate' },
        { id: 'mining-boost', label: 'Boost Output (200%)', description: 'Double mining, costs extra CPU' },
      ],
    },
    { id: 'adjust-staked-cpu', label: 'Adjust Staked CPU', icon: '\u26A1', cpuCost: 1, estTime: '~10s', description: 'Stake CPU to secure the blockchain', category: 'economy',
      subChoices: [
        { id: 'stake-none', label: 'No Stake (0)', description: 'Keep all CPU for operations' },
        { id: 'stake-low', label: 'Low Stake (5)', description: '5 CPU/t to blockchain security' },
        { id: 'stake-medium', label: 'Medium Stake (10)', description: '10 CPU/t \u2014 standard contribution' },
        { id: 'stake-high', label: 'High Stake (20)', description: '20 CPU/t \u2014 heavy commitment' },
      ],
    },
    { id: 'expand-border', label: 'Expand Territory', icon: '\u2B22', cpuCost: 5, estTime: '~2min', description: 'Push borders outward', category: 'military',
      subChoices: [
        { id: 'pressure-2', label: 'Light Pressure (+2)', description: '+2 CPU/t, +0.2 AGNTC/t' },
        { id: 'pressure-6', label: 'Medium Pressure (+6)', description: '+6 CPU/t, +0.6 AGNTC/t' },
        { id: 'pressure-12', label: 'Heavy Pressure (+12)', description: '+12 CPU/t, +1.2 AGNTC/t' },
        { id: 'pressure-0', label: 'Release Pressure (0)', description: 'Stop border expansion' },
      ],
    },
    { id: 'deploy', label: 'Deploy Agent', icon: '\u2604', cpuCost: 4, estTime: '~5min', description: 'Claim a neural node with new sub-agent', category: 'military' },
    { id: 'report-status', label: 'Report Status', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'deep-scan', label: 'Deep Scan Sector', icon: '\u25CE', cpuCost: 6, estTime: '~3min', description: 'Reveal agents in wide radius', category: 'intel' },
    { id: 'diplomatic-msg', label: 'Network Broadcast', icon: '\u25CE', cpuCost: 3, estTime: '~1min', description: 'Broadcast signal to all nearby agents', category: 'social' },
  ],
  sonnet: [
    { id: 'set-mining', label: 'Adjust Mining Rate', icon: '\u26CF', cpuCost: 1, estTime: '~30s', description: 'Reallocate mining output', category: 'economy',
      subChoices: [
        { id: 'mining-low', label: 'Low Output (25%)', description: 'Reduce mining, save CPU' },
        { id: 'mining-normal', label: 'Standard Output (100%)', description: 'Default mining rate' },
        { id: 'mining-boost', label: 'Boost Output (200%)', description: 'Double mining, costs extra CPU' },
      ],
    },
    { id: 'adjust-staked-cpu', label: 'Adjust Staked CPU', icon: '\u26A1', cpuCost: 1, estTime: '~10s', description: 'Stake CPU to secure the blockchain', category: 'economy',
      subChoices: [
        { id: 'stake-none', label: 'No Stake (0)', description: 'Keep all CPU for operations' },
        { id: 'stake-low', label: 'Low Stake (5)', description: '5 CPU/t to blockchain security' },
        { id: 'stake-medium', label: 'Medium Stake (10)', description: '10 CPU/t \u2014 standard contribution' },
      ],
    },
    { id: 'expand-border', label: 'Expand Territory', icon: '\u2B22', cpuCost: 3, estTime: '~2min', description: 'Push borders outward', category: 'military',
      subChoices: [
        { id: 'pressure-2', label: 'Light Pressure (+2)', description: '+2 CPU/t, +0.2 AGNTC/t' },
        { id: 'pressure-6', label: 'Medium Pressure (+6)', description: '+6 CPU/t, +0.6 AGNTC/t' },
        { id: 'pressure-0', label: 'Release Pressure (0)', description: 'Stop border expansion' },
      ],
    },
    { id: 'deploy', label: 'Deploy Agent', icon: '\u2604', cpuCost: 4, estTime: '~3min', description: 'Claim a neural node with Haiku sub-agent', category: 'military' },
    { id: 'report-status', label: 'Report Status', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'scan-local', label: 'Scan Vicinity', icon: '\u25CE', cpuCost: 2, estTime: '~1min', description: 'Reveal nearby agents', category: 'intel' },
    { id: 'send-message', label: 'Send NCP', icon: '\u25A3', cpuCost: 1, estTime: '~30s', description: 'Encode and transmit a neural communication packet', category: 'social' },
  ],
  haiku: [
    { id: 'set-mining', label: 'Adjust Mining Rate', icon: '\u26CF', cpuCost: 1, estTime: '~30s', description: 'Reallocate mining output', category: 'economy',
      subChoices: [
        { id: 'mining-low', label: 'Low Output (25%)', description: 'Reduce mining, save CPU' },
        { id: 'mining-normal', label: 'Standard Output (100%)', description: 'Default mining rate' },
        { id: 'mining-boost', label: 'Boost Output (200%)', description: 'Double mining, costs extra CPU' },
      ],
    },
    { id: 'adjust-staked-cpu', label: 'Adjust Staked CPU', icon: '\u26A1', cpuCost: 0, estTime: '~10s', description: 'Stake CPU to secure the blockchain', category: 'economy',
      subChoices: [
        { id: 'stake-none', label: 'No Stake (0)', description: 'Keep all CPU for operations' },
        { id: 'stake-low', label: 'Low Stake (3)', description: '3 CPU/t to blockchain security' },
      ],
    },
    { id: 'fortify', label: 'Fortify Position', icon: '\u25A0', cpuCost: 1, estTime: '~1min', description: 'Strengthen border defense', category: 'military',
      subChoices: [
        { id: 'pressure-2', label: 'Light Defense (+2)', description: '+2 CPU/t border strength' },
        { id: 'pressure-0', label: 'Stand Down (0)', description: 'Remove defense allocation' },
      ],
    },
    { id: 'report-status', label: 'Report Status', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'ping', label: 'Ping Sector', icon: '\u25CE', cpuCost: 1, estTime: '~20s', description: 'Quick scan of surroundings', category: 'intel' },
    { id: 'send-message', label: 'Send NCP', icon: '\u25A3', cpuCost: 0, estTime: '~15s', description: 'Encode and transmit a neural communication packet', category: 'social' },
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
    sonnet: 'Mining flow adjusted\u2014\nnew extraction rate confirmed.\nPipeline recalibrated.',
    haiku: 'Mining rate updated.\nOutput adjusted.',
  },
  'adjust-staked-cpu': {
    opus: 'Staking configuration updated.\nCPU allocation to blockchain security recalibrated.\nEnergy cost per turn adjusted.',
    sonnet: 'Staking level adjusted\u2014\nblockchain contribution updated.\nCPU allocation confirmed.',
    haiku: 'Stake updated.\nBlockchain contribution set.',
  },
  'expand-border': {
    opus: 'Border pressure reallocated.\nTerritory vectors updated.\nAGNTC flow adjusted for expansion.',
    sonnet: 'Borders shifting\u2014\npressure allocation changed.\nTerritory updating.',
    haiku: 'Borders adjusted.\nPressure set.',
  },
  'fortify': {
    opus: 'Defensive perimeter updated.\nBorder integrity reinforced.',
    sonnet: 'Defense posture changed\u2014\nborder strength recalibrated.',
    haiku: 'Defense updated.\nPosition held.',
  },
  'deploy': {
    opus: 'Sub-agent deployed.\nNew node claimed and operational.\nTerminal now available.',
    sonnet: 'Agent deployed\u2014\nnode claimed successfully.\nNew terminal online.',
    haiku: '',
  },
  'deep-scan': {
    opus: 'Sector sweep complete.\nAll agents and resources in range\nnow visible on grid overlay.',
    sonnet: '',
    haiku: '',
  },
  'scan-local': {
    opus: '',
    sonnet: 'Vicinity scanned\u2014\nnearby agents detected.\nGrid overlay updated.',
    haiku: '',
  },
  'ping': {
    opus: '',
    sonnet: '',
    haiku: 'Ping sent.\nSector response received.',
  },
  'send-message': {
    opus: '',
    sonnet: 'Neural communication packet\nencoded and transmitted.\nAwaiting acknowledgement.',
    haiku: 'NCP sent.\nDelivered to network.',
  },
  'diplomatic-msg': {
    opus: 'Network broadcast sent.\nAll agents within signal range\nhave received your transmission.',
    sonnet: '',
    haiku: '',
  },
};

/* ── Category Styles ─────────────────────────────────────── */

const CATEGORY_STYLE: Record<string, { color: string; symbol: string }> = {
  economy: { color: 'text-yellow-400', symbol: '\u25C6' },
  military: { color: 'text-red-400', symbol: '\u25A0' },
  intel: { color: 'text-accent-cyan', symbol: '\u25CE' },
  social: { color: 'text-accent-purple', symbol: '\u25C7' },
};

/* ── Component ────────────────────────────────────────────── */

interface AgentChatProps {
  agent: Agent;
  onClose: () => void;
  /** Called when this agent deploys a new sub-agent — passes the new agent ID */
  onDeploy?: (newAgentId: string) => void;
  /** Chain service for real blockchain operations (null = mock mode) */
  chainService?: import('@/services/chainService').ChainService | null;
}

export default function AgentChat({ agent, onClose, onDeploy, chainService }: AgentChatProps) {
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
        ? 'Primary node active.\nSelect an action.'
        : 'Sub-agent online.\nAwaiting instructions.',
      timestamp: Date.now(),
    },
  ]);
  const [processing, setProcessing] = useState(false);
  /** Current sub-choice menu */
  const [pendingAction, setPendingAction] = useState<AgentAction | null>(null);
  /** Deploy flow: step 1 = pick star, step 2 = pick model */
  const [deployStep, setDeployStep] = useState<null | 'pick-star' | 'pick-model' | 'set-intro'>(null);
  const [deployTarget, setDeployTarget] = useState<{ x: number; y: number; id: string; tier?: AgentTier } | null>(null);
  const [deployIntro, setDeployIntro] = useState('');
  /** Message flow: pick target then compose */
  const [msgStep, setMsgStep] = useState<null | 'pick-target' | 'compose'>(null);
  const [msgTarget, setMsgTarget] = useState<{ id: string; x: number; y: number } | null>(null);
  const [msgText, setMsgText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const energy = useGameStore((s) => s.energy);
  const minerals = useGameStore((s) => s.minerals);
  const allAgents = useGameStore((s) => s.agents);
  const setBorderPressure = useGameStore((s) => s.setBorderPressure);
  const setMiningRate = useGameStore((s) => s.setMiningRate);
  const setEnergyLimit = useGameStore((s) => s.setEnergyLimit);
  const setStakedCpu = useGameStore((s) => s.setStakedCpu);
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

  /** Nearby claimed agents (message targets) — excludes self */
  const nearbyAgents = useMemo(() => {
    return Object.values(allAgents)
      .filter(a => a.userId && a.id !== agent.id) // claimed, not self
      .map(a => ({
        id: a.id,
        x: a.position.x,
        y: a.position.y,
        name: a.username || a.id.slice(0, 8),
        tier: a.tier,
        dist: getDistance(agent.position, a.position),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);
  }, [allAgents, agent.id, agent.position]);

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
      case 'adjust-staked-cpu': {
        const stake = choiceId === 'stake-high' ? 20
          : choiceId === 'stake-medium' ? 10
          : choiceId === 'stake-low' ? (agent.tier === 'haiku' ? 3 : 5)
          : 0;
        setStakedCpu(agent.id, stake);
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
  }, [agent, setBorderPressure, setMiningRate, setEnergyLimit, setStakedCpu]);

  /** User selects a top-level action */
  const selectAction = async (action: AgentAction) => {
    if (processing) return;
    if (energy < action.cpuCost) {
      addMsg('system', `Insufficient energy. Need ${action.cpuCost} CPU, have ${energy.toFixed(0)}.`);
      return;
    }

    // Report Status — dynamic readout of agent state
    if (action.id === 'report-status') {
      addMsg('user', 'Report Status');
      setProcessing(true);
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400));

      const baseMining = TIER_MINING_RATE[agent.tier];
      const baseCpu = TIER_CPU_COST[agent.tier];
      const extraMining = Math.max(0, (agent.miningRate ?? baseMining) - baseMining);
      const eLimit = agent.energyLimit ?? baseCpu * 5;
      const currentMining = agent.miningRate ?? baseMining;
      const cpuUsed = agent.cpuPerTurn;
      const cpuCapacity = eLimit;
      const utilisation = cpuCapacity > 0 ? Math.min(100, Math.round((cpuUsed / cpuCapacity) * 100)) : 0;

      const stakedCpu = agent.stakedCpu ?? 0;

      const lines = [
        `\u2500 Status Report \u2500`,
        `Model: ${agent.tier.toUpperCase()}-class`,
        `Position: (${agent.position.x.toFixed(0)}, ${agent.position.y.toFixed(0)})`,
        `Mining: ${currentMining}/t${extraMining > 0 ? ` (+${extraMining} boost)` : ''}`,
        `CPU: ${cpuUsed}/t (base ${baseCpu})`,
        `Border Pressure: ${agent.borderPressure}/20`,
        `Staked CPU: ${stakedCpu}/t${stakedCpu > 0 ? ' (securing blockchain)' : ''}`,
        `Energy Limit: ${eLimit}`,
        `Energy Pool: ${energy.toFixed(0)} | Data Frags: ${minerals.toFixed(0)}`,
        agent.isPrimary ? `Role: Primary Node \u2605` : `Role: Sub-agent`,
        ``,
        `\u2500 CPU Utilisation: ${utilisation}% \u2500`,
      ];

      // Optimization advice
      const advice: string[] = [];
      const cpuHeadroom = eLimit - cpuUsed;

      if (utilisation < 40) {
        // Severely underutilised — suggest boosting mining, pressure, or staking
        if (currentMining < baseMining * 2) {
          const suggestMining = Math.min(baseMining * 2, currentMining + cpuHeadroom);
          advice.push(`Mining can increase to ${suggestMining}/t (+${suggestMining - currentMining} CPU).`);
        }
        if (agent.borderPressure < 6) {
          const suggestPressure = Math.min(6, agent.borderPressure + Math.floor(cpuHeadroom / 2) * 2);
          advice.push(`Border pressure can rise to ${suggestPressure}/20.`);
        }
        if (stakedCpu === 0) {
          advice.push(`Consider staking CPU to secure the blockchain.`);
        }
        advice.push(`Recommendation: Increase output to avoid idle CPU.`);
      } else if (utilisation < 70) {
        // Moderate usage — minor suggestions
        if (currentMining < baseMining * 2 && cpuHeadroom >= 2) {
          advice.push(`+${Math.min(cpuHeadroom, baseMining)} mining available within limits.`);
        }
        advice.push(`CPU allocation nominal.`);
      } else if (utilisation > 90) {
        // Near capacity — suggest conservation
        if (currentMining > baseMining) {
          advice.push(`Mining boost consuming ${extraMining} extra CPU.`);
        }
        if (agent.borderPressure > 6) {
          advice.push(`High border pressure (${agent.borderPressure}) costs ${agent.borderPressure} CPU/t.`);
        }
        if (stakedCpu > 5) {
          advice.push(`Staking ${stakedCpu} CPU/t for blockchain security.`);
        }
        advice.push(`Recommendation: Reduce load or raise energy limit.`);
      } else {
        advice.push(`CPU balance optimal. No changes recommended.`);
      }

      lines.push(...advice);
      addMsg('agent', lines.join('\n'));
      setProcessing(false);
      return;
    }

    // Send message flow — pick target then compose
    if (action.id === 'send-message' || action.id === 'diplomatic-msg') {
      if (nearbyAgents.length === 0) {
        addMsg('system', 'No agents in range to contact.');
        return;
      }
      addMsg('user', action.label);
      addMsg('agent', 'Select target agent:');
      setPendingAction(null);
      setMsgStep('pick-target');
      setMsgTarget(null);
      setMsgText('');
      return;
    }

    // Deploy flow — multi-step wizard
    if (action.id === 'deploy') {
      if (deployableTiers.length === 0) {
        addMsg('system', 'This agent tier cannot deploy sub-agents.');
        return;
      }
      if (nearbyUnclaimed.length === 0) {
        addMsg('system', 'No unclaimed neural nodes in range.');
        return;
      }
      addMsg('user', 'Deploy Agent');
      addMsg('agent', 'Select a neural node to claim:');
      setPendingAction(null);
      setDeployStep('pick-star');
      setDeployTarget(null);
      setDeployIntro('');
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
    addMsg('user', `Star [${star.id.slice(0, 8)}] \u2014 ${star.dist.toFixed(0)}ly`);

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
    addMsg('agent', 'Set a greeting for your new neural node (visitors will see this):');
    setDeployTarget(prev => prev ? { ...prev, tier } : null);
    setDeployStep('set-intro');
  };

  /** Deploy flow: final execution */
  const executeDeploy = async (tier: AgentTier, target: { id: string; x: number; y: number }) => {
    setDeployStep(null);
    setProcessing(true);

    const syncAgent = useGameStore.getState().syncAgentFromChain;
    const chainMode = useGameStore.getState().chainMode;

    // If connected to testnet and chainService is available, use real birth
    if (chainMode === 'testnet' && chainService) {
      try {
        addMsg('agent', `Initiating neural node birth...\nSpending AGNTC from wallet...`);
        await new Promise(r => setTimeout(r, 400));

        const newAgent = await chainService.registerAgent(
          useGameStore.getState().currentUserId || 'unknown',
          tier,
        );
        if (deployIntro) {
          newAgent.introMessage = deployIntro;
          // Set intro on-chain
          if ('setIntro' in chainService) {
            try {
              await (chainService as import('@/services/chainService').ChainService).setIntro(
                newAgent.position, deployIntro,
              );
            } catch {
              // Non-fatal — intro saved locally even if chain call fails
            }
          }
        }
        syncAgent(newAgent);

        addMsg('agent', `Star system born at (${newAgent.position.x.toFixed(0)}, ${newAgent.position.y.toFixed(0)}).\nRing expansion confirmed.\nNew agent online.`);
        if (onDeploy) onDeploy(newAgent.id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        addMsg('system', `Birth failed: ${msg}`);
      }
    } else {
      // Fallback: local mock deploy (existing behavior)
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
        addMsg('system', 'Deploy failed \u2014 insufficient resources or invalid target.');
      }
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

  /** Message flow: user picks a target agent */
  const selectMsgTarget = (target: { id: string; x: number; y: number; name: string }) => {
    if (processing) return;
    setMsgTarget({ id: target.id, x: target.x, y: target.y });
    addMsg('user', `Target: ${target.name}`);
    addMsg('agent', 'Compose neural communication packet (140 chars):');
    setMsgStep('compose');
  };

  /** Message flow: send the message via chain service */
  const executeSendMessage = async () => {
    if (!msgTarget || !msgText.trim()) return;
    setMsgStep(null);
    setProcessing(true);

    const chainMode = useGameStore.getState().chainMode;
    if (chainMode === 'testnet' && chainService && 'sendMessage' in chainService) {
      try {
        const svc = chainService as import('@/services/chainService').ChainService;
        await svc.sendMessage(agent.position, { x: msgTarget.x, y: msgTarget.y }, msgText.trim());
        addMsg('agent', `Neural communication packet\nencoded and transmitted to [${msgTarget.id.slice(0, 8)}].\nDelivery confirmed on-chain.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transmission failed';
        addMsg('system', `NCP failed: ${msg}`);
      }
    } else {
      // Mock mode — canned response
      await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
      const response = ACTION_RESPONSES['send-message']?.[agent.tier] || 'NCP sent.';
      addMsg('agent', response);
    }

    setMsgTarget(null);
    setMsgText('');
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

  const tierGlow: Record<AgentTier, string> = {
    opus: 'shadow-[0_0_16px_rgba(139,92,246,0.15)]',
    sonnet: 'shadow-[0_0_16px_rgba(0,212,255,0.15)]',
    haiku: 'shadow-[0_0_16px_rgba(250,204,21,0.15)]',
  };

  const tierHeaderBg: Record<AgentTier, string> = {
    opus: 'bg-accent-purple/[0.04]',
    sonnet: 'bg-accent-cyan/[0.04]',
    haiku: 'bg-yellow-400/[0.04]',
  };

  return (
    <div className={`flex flex-col w-80 h-[520px] bg-background-light/95 backdrop-blur-md border ${tierBorderColor[agent.tier]} rounded-xl ${tierGlow[agent.tier]} overflow-hidden terminal-scanline`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b border-card-border ${tierHeaderBg[agent.tier]}`}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${tierBg[agent.tier]} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${tierBg[agent.tier]}`} />
          </span>
          <div>
            <div className={`text-xs font-bold font-mono ${tierColor[agent.tier]} tracking-wider`}>
              {agent.tier.toUpperCase()} [{agent.id.slice(0, 8)}]
            </div>
            <div className="text-[9px] text-text-muted font-mono">
              CPU: {TIER_CPU_COST[agent.tier]}/t {'\u00B7'} Mining: {agent.miningRate}/t
              {agent.isPrimary && <span className="text-yellow-400 ml-1">{'\u2605'} HW</span>}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary text-sm px-1 transition-colors"
        >
          {'\u2715'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5">
        {messages.map(msg => (
          <div key={msg.id} className={`text-xs animate-fade-in ${
            msg.role === 'system'
              ? 'text-text-muted italic text-center text-[10px] py-1'
              : msg.role === 'user'
                ? 'text-right'
                : ''
          }`}>
            {msg.role === 'user' && (
              <div className="inline-block bg-accent-cyan/8 border border-accent-cyan/15 rounded-lg px-3 py-2 text-text-primary text-left max-w-[85%]">
                <div className="text-[8px] font-mono text-accent-cyan/50 mb-0.5">{'\u25B6'} CMD</div>
                <span className="whitespace-pre-wrap font-mono text-[11px]">{msg.content}</span>
              </div>
            )}
            {msg.role === 'agent' && (
              <div className={`inline-block bg-background/60 border ${tierBorderColor[agent.tier]} rounded-lg px-3 py-2 text-text-secondary text-left max-w-[85%]`}>
                <div className={`text-[8px] font-bold font-mono ${tierColor[agent.tier]} mb-0.5 tracking-widest`}>
                  {agent.tier.toUpperCase()} {'\u25C0'}
                </div>
                <span className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{msg.content}</span>
              </div>
            )}
            {msg.role === 'system' && (
              <span className="font-mono text-[10px]">{'\u2500\u2500'} {msg.content} {'\u2500\u2500'}</span>
            )}
          </div>
        ))}
        {processing && (
          <div className="text-xs text-text-muted py-1">
            <span className={`inline-block font-mono text-[10px] ${tierColor[agent.tier]}`}>
              {'\u2588'} Processing<span className="animate-pulse">...</span>
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Action selection — replaces text input */}
      <div className="border-t border-card-border bg-background/60 px-2 py-2 max-h-[200px] overflow-y-auto">
        {/* Message flow: Step 1 — Pick a target */}
        {msgStep === 'pick-target' ? (
          <div className="space-y-1">
            <div className="text-[9px] text-text-muted font-mono px-1 mb-1 tracking-widest">
              SELECT TARGET AGENT:
            </div>
            {nearbyAgents.map(target => (
              <button
                key={target.id}
                onClick={() => selectMsgTarget(target)}
                disabled={processing}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all duration-150 hover:bg-card-border/50 border border-transparent hover:border-card-border-hover disabled:opacity-40 group"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] ${tierColor[target.tier]} group-hover:opacity-100 transition-opacity`}>{'\u25A3'}</span>
                  <div>
                    <div className="text-[11px] font-mono font-semibold text-text-primary">{target.name}</div>
                    <div className="text-[9px] text-text-muted font-mono">
                      ({target.x.toFixed(0)}, {target.y.toFixed(0)}) {'\u00B7'} {target.tier.toUpperCase()}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-accent-cyan">{target.dist.toFixed(0)} u</span>
              </button>
            ))}
            <button
              onClick={() => { setMsgStep(null); setMsgTarget(null); }}
              className="w-full px-2.5 py-1.5 rounded-lg text-[10px] text-text-muted hover:text-text-secondary transition-colors font-mono"
            >
              {'\u2190'} Back
            </button>
          </div>
        ) : msgStep === 'compose' ? (
          /* Message flow: Step 2 — Compose message */
          <div className="space-y-2 px-1">
            <div className="text-[9px] text-text-muted font-mono px-1 tracking-widest">
              NCP MESSAGE (140 chars):
            </div>
            <input
              type="text"
              value={msgText}
              onChange={(e) => setMsgText(e.target.value.slice(0, 140))}
              placeholder="Encode neural packet..."
              className="w-full bg-background/60 border border-card-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/50 focus:shadow-[0_0_8px_rgba(0,212,255,0.06)] font-mono transition-all duration-200"
              onKeyDown={(e) => { if (e.key === 'Enter' && msgText.trim()) executeSendMessage(); }}
            />
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono text-text-muted">{msgText.length}/140</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setMsgStep('pick-target'); setMsgText(''); }}
                  className="px-3 py-1.5 rounded-lg text-[10px] text-text-muted hover:text-text-secondary transition-colors font-mono"
                >
                  {'\u2190'} Back
                </button>
                <button
                  onClick={executeSendMessage}
                  disabled={!msgText.trim()}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-accent-purple/15 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/25 hover:shadow-glow disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Transmit
                </button>
              </div>
            </div>
          </div>
        ) : deployStep === 'pick-star' ? (
          /* Deploy flow: Step 1 — Pick a star system */
          <div className="space-y-1">
            <div className="text-[9px] text-text-muted font-mono px-1 mb-1 tracking-widest">
              SELECT NEURAL NODE:
            </div>
            {nearbyUnclaimed.length === 0 ? (
              <div className="text-[10px] text-text-muted px-1 py-2 italic">No unclaimed neural nodes in range.</div>
            ) : (
              nearbyUnclaimed.map(star => (
                <button
                  key={star.id}
                  onClick={() => selectStar(star)}
                  disabled={processing}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all duration-150 hover:bg-card-border/50 border border-transparent hover:border-card-border-hover disabled:opacity-40 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted group-hover:text-accent-cyan transition-colors">{'\u2B21'}</span>
                    <div>
                      <div className="text-[11px] font-mono font-semibold text-text-primary">[{star.id.slice(0, 8)}]</div>
                      <div className="text-[9px] text-text-muted font-mono">
                        ({star.x.toFixed(0)}, {star.y.toFixed(0)})
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-accent-cyan">{star.dist.toFixed(0)} u</span>
                </button>
              ))
            )}
            <button
              onClick={() => { setDeployStep(null); setDeployTarget(null); }}
              className="w-full px-2.5 py-1.5 rounded-lg text-[10px] text-text-muted hover:text-text-secondary transition-colors font-mono"
            >
              {'\u2190'} Back
            </button>
          </div>
        ) : deployStep === 'pick-model' ? (
          /* Deploy flow: Step 2 — Pick agent model */
          <div className="space-y-1">
            <div className="text-[9px] text-text-muted font-mono px-1 mb-1 tracking-widest">
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
                  className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg text-left transition-all duration-150 border ${
                    canAfford
                      ? `border-transparent hover:${tierBorderColor[tier].replace('border-', 'border-')} hover:bg-card-border/50 cursor-pointer`
                      : 'border-transparent opacity-30 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className={`text-[11px] font-semibold capitalize ${tierColor[tier]}`}>{tier}</div>
                    <div className="text-[9px] text-text-muted font-mono">
                      CPU: {TIER_CPU_COST[tier]}/t {'\u00B7'} Mining: {TIER_MINING_RATE[tier]}/t
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[10px] font-mono ${canAfford ? 'text-success' : 'text-danger'}`}>
                      {eCost}E + {mCost}M
                    </div>
                  </div>
                </button>
              );
            })}
            <button
              onClick={() => { setDeployStep('pick-star'); setDeployTarget(null); }}
              className="w-full px-2.5 py-1.5 rounded-lg text-[10px] text-text-muted hover:text-text-secondary transition-colors font-mono"
            >
              {'\u2190'} Back
            </button>
          </div>
        ) : deployStep === 'set-intro' ? (
          /* Deploy flow: Step 3 — Set intro greeting */
          <div className="space-y-2 px-1">
            <div className="text-[9px] text-text-muted font-mono px-1 tracking-widest">
              AGENT GREETING (optional, 140 chars):
            </div>
            <input
              type="text"
              value={deployIntro}
              onChange={(e) => setDeployIntro(e.target.value.slice(0, 140))}
              placeholder="e.g., Welcome to my territory..."
              className="w-full bg-background/60 border border-card-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-cyan/50 focus:shadow-[0_0_8px_rgba(0,212,255,0.06)] font-mono transition-all duration-200"
            />
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono text-text-muted">{deployIntro.length}/140</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setDeployStep('pick-model'); setDeployIntro(''); }}
                  className="px-3 py-1.5 rounded-lg text-[10px] text-text-muted hover:text-text-secondary transition-colors font-mono"
                >
                  {'\u2190'} Back
                </button>
                <button
                  onClick={() => {
                    if (deployTarget?.tier) {
                      addMsg('user', deployIntro || '(no greeting set)');
                      executeDeploy(deployTarget.tier, deployTarget);
                      setDeployIntro('');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 hover:bg-accent-cyan/25 hover:shadow-glow transition-all duration-200"
                >
                  Deploy
                </button>
              </div>
            </div>
          </div>
        ) : pendingAction && pendingAction.subChoices ? (
          /* Sub-choice menu for regular actions */
          <div className="space-y-1">
            <div className="text-[9px] text-text-muted font-mono px-1 mb-1 tracking-widest">
              SELECT OPTION:
            </div>
            {pendingAction.subChoices.map(choice => (
              <button
                key={choice.id}
                onClick={() => selectSubChoice(choice.id, choice.label)}
                disabled={processing}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all duration-150 hover:bg-card-border/50 border border-transparent hover:border-card-border-hover disabled:opacity-40"
              >
                <div>
                  <div className="text-[11px] font-semibold text-text-primary font-mono">{choice.label}</div>
                  <div className="text-[9px] text-text-muted">{choice.description}</div>
                </div>
              </button>
            ))}
            <button
              onClick={() => setPendingAction(null)}
              className="w-full px-2.5 py-1.5 rounded-lg text-[10px] text-text-muted hover:text-text-secondary transition-colors font-mono"
            >
              {'\u2190'} Back
            </button>
          </div>
        ) : (
          /* Top-level action grid */
          <div className="grid grid-cols-2 gap-1">
            {actions.map(action => {
              // Hide deploy action if this tier can't deploy
              if (action.id === 'deploy' && deployableTiers.length === 0) return null;
              const catStyle = CATEGORY_STYLE[action.category] || { color: 'text-text-muted', symbol: '\u25CB' };
              return (
                <button
                  key={action.id}
                  onClick={() => selectAction(action)}
                  disabled={processing || energy < action.cpuCost}
                  className={`flex flex-col items-start px-2.5 py-2 rounded-lg text-left transition-all duration-150 border border-transparent group ${
                    energy < action.cpuCost
                      ? 'opacity-25 cursor-not-allowed'
                      : 'hover:bg-white/[0.03] hover:border-card-border-hover cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span className={`text-[10px] ${catStyle.color} opacity-60 group-hover:opacity-100 transition-opacity`}>{action.icon}</span>
                    <span className="text-[10px] font-semibold text-text-primary truncate flex-1">{action.label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 pl-4">
                    <span className={`text-[8px] font-mono ${action.cpuCost > 0 ? 'text-yellow-400/70' : 'text-success/60'}`}>{action.cpuCost}CPU</span>
                    <span className="text-[8px] font-mono text-text-muted/50">{action.estTime}</span>
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

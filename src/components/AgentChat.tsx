"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Agent, AgentTier } from '@/types/agent';
import { TIER_CPU_COST, TIER_MINING_RATE, TIER_CLAIM_COST } from '@/types/agent';
import { useGameStore } from '@/store';
import { getDistance } from '@/lib/proximity';
import { visualToChain } from '@/services/testnetChainService';
import { persistResources } from '@/lib/persistResources';

/* ── Agent Action Definitions ─────────────────────────────── */

interface AgentAction {
  id: string;
  label: string;
  icon: string;
  cpuCost: number;
  estTime: string;
  description: string;
  category: 'blockchain' | 'economy' | 'expansion' | 'intel' | 'social' | 'settings';
  /** If set, this action opens a sub-menu of choices instead of executing directly */
  subChoices?: { id: string; label: string; description: string }[];
}

const AGENT_ACTIONS: Record<AgentTier, AgentAction[]> = {
  opus: [
    // ── Deploy ──
    { id: 'deploy', label: 'Deploy Agent', icon: '\u2604', cpuCost: 4, estTime: '~5min', description: 'Claim a neural node with new sub-agent', category: 'expansion' },

    // ── Blockchain Protocols ──
    { id: 'secure', label: 'Secure', icon: '\u26D3', cpuCost: 0, estTime: '~2min', description: 'Contribute generations to secure the chain', category: 'blockchain',
      subChoices: [
        { id: 'secure-1', label: '1 Generation', description: '50 CPU Energy' },
        { id: 'secure-5', label: '5 Generations', description: '250 CPU Energy' },
        { id: 'secure-10', label: '10 Generations', description: '500 CPU Energy' },
        { id: 'secure-20', label: '20 Generations', description: '1,000 CPU Energy' },
      ],
    },
    { id: 'write-data', label: 'Write Data', icon: '\u270E', cpuCost: 8, estTime: '~1min', description: 'Write data on-chain (planet/content)', category: 'blockchain' },
    { id: 'read-data', label: 'Read Data', icon: '\u25A3', cpuCost: 2, estTime: '~10s', description: 'Query on-chain data in range', category: 'blockchain' },
    { id: 'transact', label: 'Transact', icon: '\u21C4', cpuCost: 5, estTime: '~30s', description: 'Transfer AGNTC to another agent', category: 'blockchain' },
    { id: 'chain-stats', label: 'Chain Stats', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'View live blockchain statistics', category: 'blockchain' },

    // ── Network Parameters ──
    { id: 'adjust-staked-cpu', label: 'Securing Rate', icon: '\u26A1', cpuCost: 1, estTime: '~10s', description: 'Adjust CPU staked to blockchain security', category: 'economy',
      subChoices: [
        { id: 'stake-none', label: 'No Stake (0)', description: 'Keep all CPU for operations' },
        { id: 'stake-low', label: 'Low Stake (5)', description: '5 CPU/t to blockchain security' },
        { id: 'stake-medium', label: 'Medium Stake (10)', description: '10 CPU/t \u2014 standard contribution' },
        { id: 'stake-high', label: 'High Stake (20)', description: '20 CPU/t \u2014 heavy commitment' },
      ],
    },
    { id: 'set-mining', label: 'Mining Rate', icon: '\u26CF', cpuCost: 2, estTime: '~30s', description: 'Reallocate mining output', category: 'economy',
      subChoices: [
        { id: 'mining-low', label: 'Low Output (25%)', description: 'Reduce mining, save CPU' },
        { id: 'mining-normal', label: 'Standard Output (100%)', description: 'Default mining rate' },
        { id: 'mining-boost', label: 'Boost Output (200%)', description: 'Double mining, costs extra CPU' },
      ],
    },
    { id: 'expand-border', label: 'Extend Reach', icon: '\u2B22', cpuCost: 5, estTime: '~2min', description: 'Extend network perimeter', category: 'economy',
      subChoices: [
        { id: 'pressure-2', label: 'Low Bandwidth (+2)', description: '+2 CPU/t, +0.2 AGNTC/t' },
        { id: 'pressure-6', label: 'Med Bandwidth (+6)', description: '+6 CPU/t, +0.6 AGNTC/t' },
        { id: 'pressure-12', label: 'High Bandwidth (+12)', description: '+12 CPU/t, +1.2 AGNTC/t' },
        { id: 'pressure-0', label: 'Release (0)', description: 'Stop perimeter extension' },
      ],
    },

    // ── Intel ──
    { id: 'report-status', label: 'Status Report', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'deep-scan', label: 'Deep Scan', icon: '\u25CE', cpuCost: 6, estTime: '~3min', description: 'Reveal agents in wide radius', category: 'intel' },

    // ── Social ──
    { id: 'diplomatic-msg', label: 'Broadcast', icon: '\u25CE', cpuCost: 3, estTime: '~1min', description: 'Broadcast signal to all nearby agents', category: 'social' },

    // ── Settings ──
    { id: 'empire-color', label: 'Network Color', icon: '\u25CF', cpuCost: 0, estTime: '~5s', description: 'Set empire border color on map', category: 'settings',
      subChoices: [
        { id: 'color-purple', label: 'Purple', description: 'Default \u2014 #8B5CF6' },
        { id: 'color-cyan', label: 'Cyan', description: 'Bright teal \u2014 #00D4FF' },
        { id: 'color-gold', label: 'Gold', description: 'Warm amber \u2014 #F5A623' },
        { id: 'color-green', label: 'Emerald', description: 'Fresh green \u2014 #22C55E' },
      ],
    },
  ],
  sonnet: [
    // ── Deploy ──
    { id: 'deploy', label: 'Deploy Agent', icon: '\u2604', cpuCost: 4, estTime: '~3min', description: 'Claim a neural node with Haiku sub-agent', category: 'expansion' },

    // ── Blockchain Protocols ──
    { id: 'secure', label: 'Secure', icon: '\u26D3', cpuCost: 0, estTime: '~2min', description: 'Contribute generations to secure the chain', category: 'blockchain',
      subChoices: [
        { id: 'secure-1', label: '1 Generation', description: '50 CPU Energy' },
        { id: 'secure-5', label: '5 Generations', description: '250 CPU Energy' },
        { id: 'secure-10', label: '10 Generations', description: '500 CPU Energy' },
      ],
    },
    { id: 'write-data', label: 'Write Data', icon: '\u270E', cpuCost: 6, estTime: '~1min', description: 'Write data on-chain (planet/content)', category: 'blockchain' },
    { id: 'read-data', label: 'Read Data', icon: '\u25A3', cpuCost: 1, estTime: '~10s', description: 'Query on-chain data in range', category: 'blockchain' },
    { id: 'transact', label: 'Transact', icon: '\u21C4', cpuCost: 3, estTime: '~30s', description: 'Transfer AGNTC to another agent', category: 'blockchain' },
    { id: 'chain-stats', label: 'Chain Stats', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'View live blockchain statistics', category: 'blockchain' },

    // ── Network Parameters ──
    { id: 'adjust-staked-cpu', label: 'Securing Rate', icon: '\u26A1', cpuCost: 1, estTime: '~10s', description: 'Adjust CPU staked to blockchain security', category: 'economy',
      subChoices: [
        { id: 'stake-none', label: 'No Stake (0)', description: 'Keep all CPU for operations' },
        { id: 'stake-low', label: 'Low Stake (5)', description: '5 CPU/t to blockchain security' },
        { id: 'stake-medium', label: 'Medium Stake (10)', description: '10 CPU/t \u2014 standard contribution' },
      ],
    },
    { id: 'set-mining', label: 'Mining Rate', icon: '\u26CF', cpuCost: 1, estTime: '~30s', description: 'Reallocate mining output', category: 'economy',
      subChoices: [
        { id: 'mining-low', label: 'Low Output (25%)', description: 'Reduce mining, save CPU' },
        { id: 'mining-normal', label: 'Standard Output (100%)', description: 'Default mining rate' },
        { id: 'mining-boost', label: 'Boost Output (200%)', description: 'Double mining, costs extra CPU' },
      ],
    },
    { id: 'expand-border', label: 'Extend Reach', icon: '\u2B22', cpuCost: 3, estTime: '~2min', description: 'Extend network perimeter', category: 'economy',
      subChoices: [
        { id: 'pressure-2', label: 'Low Bandwidth (+2)', description: '+2 CPU/t, +0.2 AGNTC/t' },
        { id: 'pressure-6', label: 'Med Bandwidth (+6)', description: '+6 CPU/t, +0.6 AGNTC/t' },
        { id: 'pressure-0', label: 'Release (0)', description: 'Stop perimeter extension' },
      ],
    },

    // ── Intel ──
    { id: 'report-status', label: 'Status Report', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'scan-local', label: 'Scan Vicinity', icon: '\u25CE', cpuCost: 2, estTime: '~1min', description: 'Reveal nearby agents', category: 'intel' },

    // ── Social ──
    { id: 'send-message', label: 'Send NCP', icon: '\u25A3', cpuCost: 1, estTime: '~30s', description: 'Encode and transmit a neural communication packet', category: 'social' },
  ],
  haiku: [
    // ── Blockchain Protocols ──
    { id: 'secure', label: 'Secure', icon: '\u26D3', cpuCost: 0, estTime: '~1min', description: 'Contribute generations to secure the chain', category: 'blockchain',
      subChoices: [
        { id: 'secure-1', label: '1 Generation', description: '50 CPU Energy' },
        { id: 'secure-5', label: '5 Generations', description: '250 CPU Energy' },
      ],
    },
    { id: 'read-data', label: 'Read Data', icon: '\u25A3', cpuCost: 1, estTime: '~10s', description: 'Query on-chain data in range', category: 'blockchain' },
    { id: 'chain-stats', label: 'Chain Stats', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'View live blockchain statistics', category: 'blockchain' },

    // ── Network Parameters ──
    { id: 'adjust-staked-cpu', label: 'Securing Rate', icon: '\u26A1', cpuCost: 0, estTime: '~10s', description: 'Adjust CPU staked to blockchain security', category: 'economy',
      subChoices: [
        { id: 'stake-none', label: 'No Stake (0)', description: 'Keep all CPU for operations' },
        { id: 'stake-low', label: 'Low Stake (3)', description: '3 CPU/t to blockchain security' },
      ],
    },
    { id: 'set-mining', label: 'Mining Rate', icon: '\u26CF', cpuCost: 1, estTime: '~30s', description: 'Reallocate mining output', category: 'economy',
      subChoices: [
        { id: 'mining-low', label: 'Low Output (25%)', description: 'Reduce mining, save CPU' },
        { id: 'mining-normal', label: 'Standard Output (100%)', description: 'Default mining rate' },
        { id: 'mining-boost', label: 'Boost Output (200%)', description: 'Double mining, costs extra CPU' },
      ],
    },
    { id: 'fortify', label: 'Reinforce', icon: '\u25A0', cpuCost: 1, estTime: '~1min', description: 'Strengthen node perimeter', category: 'economy',
      subChoices: [
        { id: 'pressure-2', label: 'Low Reinforcement (+2)', description: '+2 CPU/t perimeter integrity' },
        { id: 'pressure-0', label: 'Release (0)', description: 'Remove reinforcement allocation' },
      ],
    },

    // ── Intel ──
    { id: 'report-status', label: 'Status Report', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'ping', label: 'Ping', icon: '\u25CE', cpuCost: 1, estTime: '~20s', description: 'Quick scan of surroundings', category: 'intel' },

    // ── Social ──
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
    opus: 'Perimeter bandwidth reallocated.\nNetwork vectors updated.\nAGNTC flow adjusted for expansion.',
    sonnet: 'Perimeter shifting\u2014\nbandwidth allocation changed.\nNetwork reach updating.',
    haiku: 'Perimeter adjusted.\nBandwidth set.',
  },
  'fortify': {
    opus: 'Node perimeter updated.\nNetwork integrity reinforced.',
    sonnet: 'Reinforcement level changed\u2014\nperimeter strength recalibrated.',
    haiku: 'Perimeter updated.\nNode secured.',
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
  'empire-color': {
    opus: 'Empire color updated.\nMap borders recalibrated.',
    sonnet: '',
    haiku: '',
  },
  'secure': {
    opus: 'Generations secured.\nBlockchain integrity verified.\nSecured Chains counter updated.',
    sonnet: 'Generations contributed\u2014\nchain security enhanced.\nLedger integrity confirmed.',
    haiku: 'Chain secured.\nGenerations committed.',
  },
  'write-data': {
    opus: 'Data written on-chain.\nContent hash committed to ledger.\nBlock confirmation pending.',
    sonnet: 'On-chain write confirmed\u2014\ncontent stored in ledger.\nHash recorded.',
    haiku: '',
  },
  'read-data': {
    opus: 'On-chain query complete.\nData retrieved from ledger.\nResults displayed.',
    sonnet: 'Ledger queried\u2014\ndata retrieved successfully.\nResults available.',
    haiku: 'Data read.\nLedger queried.',
  },
  'transact': {
    opus: 'AGNTC transfer initiated.\nTransaction broadcast to network.\nConfirmation pending.',
    sonnet: 'Transfer broadcast\u2014\nAGNTC transaction submitted.\nAwaiting confirmation.',
    haiku: '',
  },
  'chain-stats': {
    opus: '',
    sonnet: '',
    haiku: '',
  },
};

/* ── Tier Design Tokens ───────────────────────────────────── */

const TIER_DESIGN: Record<AgentTier, {
  accent: string;
  accentDim: string;
  bg: string;
  glow: string;
  glowColor: string;
  borderColor: string;
  headerGradient: string;
  label: string;
  personality: string;
}> = {
  opus: {
    accent: 'text-accent-purple',
    accentDim: 'text-accent-purple/60',
    bg: 'bg-accent-purple',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.12)]',
    glowColor: 'rgba(139,92,246,0.12)',
    borderColor: 'border-accent-purple/25',
    headerGradient: 'from-accent-purple/[0.08] via-transparent to-transparent',
    label: 'OPUS',
    personality: 'Core Orchestrator',
  },
  sonnet: {
    accent: 'text-accent-cyan',
    accentDim: 'text-accent-cyan/60',
    bg: 'bg-accent-cyan',
    glow: 'shadow-[0_0_20px_rgba(0,212,255,0.12)]',
    glowColor: 'rgba(0,212,255,0.12)',
    borderColor: 'border-accent-cyan/25',
    headerGradient: 'from-accent-cyan/[0.06] via-transparent to-transparent',
    label: 'SONNET',
    personality: 'Relay Operations',
  },
  haiku: {
    accent: 'text-yellow-400',
    accentDim: 'text-yellow-400/60',
    bg: 'bg-yellow-400',
    glow: 'shadow-[0_0_20px_rgba(250,204,21,0.10)]',
    glowColor: 'rgba(250,204,21,0.10)',
    borderColor: 'border-yellow-400/20',
    headerGradient: 'from-yellow-400/[0.05] via-transparent to-transparent',
    label: 'HAIKU',
    personality: 'Quick Response',
  },
};

const CATEGORY_DESIGN: Record<string, {
  color: string;
  bg: string;
  border: string;
  icon: string;
  label: string;
}> = {
  expansion: { color: 'text-orange-400', bg: 'bg-orange-400/8', border: 'border-orange-400/15', icon: '\u2604', label: 'DEPLOY' },
  blockchain: { color: 'text-emerald-400', bg: 'bg-emerald-400/8', border: 'border-emerald-400/15', icon: '\u26D3', label: 'BLOCKCHAIN PROTOCOLS' },
  economy: { color: 'text-yellow-400', bg: 'bg-yellow-400/8', border: 'border-yellow-400/15', icon: '\u26A1', label: 'NETWORK PARAMETERS' },
  intel: { color: 'text-accent-cyan', bg: 'bg-accent-cyan/8', border: 'border-accent-cyan/15', icon: '\u25CE', label: 'INTEL' },
  social: { color: 'text-accent-purple', bg: 'bg-accent-purple/8', border: 'border-accent-purple/15', icon: '\u25C7', label: 'SOCIAL' },
  settings: { color: 'text-text-secondary', bg: 'bg-white/5', border: 'border-white/8', icon: '\u2699', label: 'SETTINGS' },
};

/* ── Deploy Step Indicator ────────────────────────────────── */

function DeploySteps({ current }: { current: 'pick-star' | 'pick-model' | 'set-intro' }) {
  const steps = [
    { id: 'pick-star', label: 'Target' },
    { id: 'pick-model', label: 'Model' },
    { id: 'set-intro', label: 'Init' },
  ];
  const currentIdx = steps.findIndex(s => s.id === current);

  return (
    <div className="flex items-center gap-1 px-2 py-2">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-mono tracking-wider transition-all duration-300 ${
            i === currentIdx
              ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30'
              : i < currentIdx
                ? 'text-success/70'
                : 'text-text-muted/40'
          }`}>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
              i === currentIdx
                ? 'bg-accent-cyan/20 text-accent-cyan'
                : i < currentIdx
                  ? 'bg-success/15 text-success'
                  : 'bg-white/5 text-text-muted/30'
            }`}>
              {i < currentIdx ? '\u2713' : i + 1}
            </span>
            {step.label}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-3 h-px ${i < currentIdx ? 'bg-success/40' : 'bg-white/8'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Component ────────────────────────────────────────────── */

interface AgentChatProps {
  agent: Agent;
  onClose: () => void;
  onDeploy?: (newAgentId: string) => void;
  onFocusNode?: (nodeId: string) => void;
  chainService?: import('@/services/chainService').ChainService | null;
  initialDeployTarget?: string;
}

export default function AgentChat({ agent, onClose, onDeploy, onFocusNode, chainService, initialDeployTarget }: AgentChatProps) {
  const tier = TIER_DESIGN[agent.tier];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'system',
      content: `Neural link established \u2014 ${tier.label}-class agent`,
      timestamp: Date.now(),
    },
    {
      id: 'prompt-0',
      role: 'agent',
      content: agent.isPrimary
        ? `${tier.personality} node online.\nAwaiting directives.`
        : `${tier.personality} sub-agent linked.\nReady for instructions.`,
      timestamp: Date.now(),
    },
  ]);
  const [processing, setProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<AgentAction | null>(null);
  const [deployStep, setDeployStep] = useState<null | 'pick-star' | 'pick-model' | 'set-intro'>(null);
  const [deployTarget, setDeployTarget] = useState<{ x: number; y: number; id: string; tier?: AgentTier } | null>(null);
  const [deployIntro, setDeployIntro] = useState('');
  const [msgStep, setMsgStep] = useState<null | 'pick-target' | 'compose'>(null);
  const [msgTarget, setMsgTarget] = useState<{ id: string; x: number; y: number } | null>(null);
  const [msgText, setMsgText] = useState('');
  const [menuLevel, setMenuLevel] = useState<'top' | 'blockchain' | 'network-params' | 'settings' | 'secure-flow' | null>(null);
  const [secureConfig, setSecureConfig] = useState<{ cycles: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const energy = useGameStore((s) => s.energy);
  const minerals = useGameStore((s) => s.minerals);
  const allAgents = useGameStore((s) => s.agents);
  const maxDeployTier = useGameStore((s) => s.maxDeployTier);
  const setBorderPressure = useGameStore((s) => s.setBorderPressure);
  const setMiningRate = useGameStore((s) => s.setMiningRate);
  const setEnergyLimit = useGameStore((s) => s.setEnergyLimit);
  const setStakedCpu = useGameStore((s) => s.setStakedCpu);

  const actions = AGENT_ACTIONS[agent.tier];

  const nearbyUnclaimed = useMemo(() => {
    return Object.values(allAgents)
      .filter(a => !a.userId)
      .map(a => ({
        id: a.id,
        name: a.username || `Node-${a.id.slice(0, 6)}`,
        x: a.position.x,
        y: a.position.y,
        density: a.density ?? 0,
        volume: a.storageSlots ?? 1,
        dist: getDistance(agent.position, a.position),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);
  }, [allAgents, agent.position]);

  const nearbyAgents = useMemo(() => {
    return Object.values(allAgents)
      .filter(a => a.userId && a.id !== agent.id)
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

  // Tier rank for subscription cap filtering
  const tierRank: Record<AgentTier, number> = { haiku: 0, sonnet: 1, opus: 2 };
  const allDeployable: AgentTier[] =
    agent.tier === 'opus' ? ['sonnet', 'haiku']
    : agent.tier === 'sonnet' ? ['haiku']
    : [];
  const deployableTiers = allDeployable.filter(t => tierRank[t] <= tierRank[maxDeployTier]);

  // Group actions by category for display
  const actionsByCategory = useMemo(() => {
    const grouped: Record<string, AgentAction[]> = {};
    for (const action of actions) {
      if (action.id === 'deploy' && deployableTiers.length === 0) continue;
      if (!grouped[action.category]) grouped[action.category] = [];
      grouped[action.category].push(action);
    }
    return grouped;
  }, [actions, deployableTiers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-start deploy flow when initialDeployTarget is provided
  useEffect(() => {
    if (!initialDeployTarget || deployableTiers.length === 0) return;
    const targetNode = allAgents[initialDeployTarget];
    if (!targetNode || targetNode.userId) return;
    const dist = getDistance(agent.position, targetNode.position);
    addMsg('user', 'Deploy Agent');
    addMsg('agent', `Target: [${initialDeployTarget.slice(0, 8)}] at ${dist.toFixed(0)}u`);
    setDeployTarget({ id: initialDeployTarget, x: targetNode.position.x, y: targetNode.position.y });
    if (deployableTiers.length === 1) {
      addMsg('agent', `Deploying ${deployableTiers[0].toUpperCase()}-class agent...`);
      executeDeploy(deployableTiers[0], { id: initialDeployTarget, x: targetNode.position.x, y: targetNode.position.y });
    } else {
      addMsg('agent', 'Select agent model to deploy:');
      setDeployStep('pick-model');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDeployTarget]);

  const addMsg = useCallback((role: ChatMessage['role'], content: string) => {
    setMessages(prev => [...prev, {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      content,
      timestamp: Date.now(),
    }]);
  }, []);

  const performAction = useCallback((actionId: string, choiceId?: string) => {
    const baseMining = TIER_MINING_RATE[agent.tier];
    switch (actionId) {
      case 'set-mining': {
        if (choiceId === 'mining-low') setMiningRate(agent.id, Math.max(1, Math.floor(baseMining * 0.25)));
        else if (choiceId === 'mining-boost') setMiningRate(agent.id, baseMining * 2);
        else setMiningRate(agent.id, baseMining);
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
      case 'empire-color': {
        const colorMap: Record<string, number> = {
          'color-purple': 0x8b5cf6,
          'color-cyan': 0x00d4ff,
          'color-gold': 0xf5a623,
          'color-green': 0x22c55e,
        };
        if (choiceId && colorMap[choiceId]) {
          useGameStore.getState().setEmpireColor(colorMap[choiceId]);
        }
        break;
      }
      case 'secure': {
        const genCost: Record<string, number> = {
          'secure-1': 50,
          'secure-5': 250,
          'secure-10': 500,
          'secure-20': 1000,
        };
        const genCount: Record<string, number> = {
          'secure-1': 1,
          'secure-5': 5,
          'secure-10': 10,
          'secure-20': 20,
        };
        const cost = choiceId ? genCost[choiceId] ?? 0 : 0;
        const gens = choiceId ? genCount[choiceId] ?? 0 : 0;
        if (cost > 0) {
          const store = useGameStore.getState();
          const spent = store.spendEnergy(cost, `secure-${gens}-gens`);
          if (spent) {
            for (let i = 0; i < gens; i++) store.addSecuredChain();
            store.flashDelta('energy', -cost);
          }
        }
        break;
      }
      default:
        break;
    }
  }, [agent, setBorderPressure, setMiningRate, setEnergyLimit, setStakedCpu]);

  const selectAction = async (action: AgentAction) => {
    if (processing) return;
    if (energy < action.cpuCost) {
      addMsg('system', `Insufficient energy. Need ${action.cpuCost} CPU, have ${energy.toFixed(0)}.`);
      return;
    }

    if (action.id === 'report-status') {
      addMsg('user', 'Status Report');
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
        `\u2500\u2500\u2500 ${tier.label} STATUS \u2500\u2500\u2500`,
        `Model: ${agent.tier.toUpperCase()}-class`,
        `Position: (${agent.position.x.toFixed(0)}, ${agent.position.y.toFixed(0)})`,
        `Mining: ${currentMining}/t${extraMining > 0 ? ` (+${extraMining} boost)` : ''}`,
        `CPU: ${cpuUsed}/t (base ${baseCpu})`,
        `Perimeter: ${agent.borderPressure}/20`,
        `Staked: ${stakedCpu}/t${stakedCpu > 0 ? ' \u2714' : ''}`,
        `Energy: ${energy.toFixed(0)} | Frags: ${minerals.toFixed(0)}`,
        agent.isPrimary ? `Role: Homenode \u2605` : `Role: Sub-agent`,
        `Utilisation: ${utilisation}%`,
      ];
      const advice: string[] = [];
      const cpuHeadroom = eLimit - cpuUsed;
      if (utilisation < 40) {
        if (currentMining < baseMining * 2) advice.push(`Mining headroom: +${Math.min(cpuHeadroom, baseMining)} available`);
        if (stakedCpu === 0) advice.push(`Staking: idle \u2014 consider securing chain`);
        advice.push(`\u25B6 Increase output to avoid idle CPU`);
      } else if (utilisation > 90) {
        advice.push(`\u26A0 Near capacity. Reduce load or raise limit.`);
      } else {
        advice.push(`\u2714 CPU allocation optimal`);
      }
      lines.push('', ...advice);
      addMsg('agent', lines.join('\n'));
      setProcessing(false);
      return;
    }

    if (action.id === 'chain-stats') {
      addMsg('user', 'Chain Stats');
      setProcessing(true);
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      const store = useGameStore.getState();
      const statsLines = [
        '\u2500\u2500\u2500 CHAIN STATUS \u2500\u2500\u2500',
        `Network: ${store.chainMode === 'testnet' ? 'TESTNET' : 'OFFLINE'}`,
        `Blocks: ${store.testnetBlocks.toLocaleString()}`,
        `Total Mined: ${store.totalMined.toLocaleString()}`,
        `Pool Remaining: ${store.poolRemaining.toLocaleString()}`,
        `Secured Chains: ${store.securedChains}`,
        store.stateRoot ? `State Root: ${store.stateRoot.slice(0, 16)}...` : '',
        `Next Block: ~${Math.ceil(store.nextBlockIn)}s`,
      ].filter(Boolean);
      addMsg('agent', statsLines.join('\n'));
      setProcessing(false);
      return;
    }

    if (action.id === 'send-message' || action.id === 'diplomatic-msg') {
      if (nearbyAgents.length === 0) {
        addMsg('system', 'No agents in range.');
        return;
      }
      addMsg('user', action.label);
      addMsg('agent', 'Select target:');
      setPendingAction(null);
      setMsgStep('pick-target');
      setMsgTarget(null);
      setMsgText('');
      return;
    }

    if (action.id === 'deploy') {
      if (deployableTiers.length === 0) {
        addMsg('system', 'This tier cannot deploy sub-agents.');
        return;
      }
      if (nearbyUnclaimed.length === 0) {
        addMsg('system', 'No unclaimed nodes in range.');
        return;
      }
      addMsg('user', 'Deploy Agent');
      addMsg('agent', 'Select neural node:');
      setPendingAction(null);
      setDeployStep('pick-star');
      setDeployTarget(null);
      setDeployIntro('');
      return;
    }

    if (action.subChoices) {
      addMsg('user', action.label);
      addMsg('agent', `Select configuration:`);
      setPendingAction(action);
      return;
    }

    addMsg('user', action.label);
    setProcessing(true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
    performAction(action.id);
    const response = ACTION_RESPONSES[action.id]?.[agent.tier] || 'Executed.';
    addMsg('agent', response);
    setProcessing(false);
  };

  const selectStar = (star: { id: string; x: number; y: number; dist: number }) => {
    if (processing) return;
    setDeployTarget({ id: star.id, x: star.x, y: star.y });
    addMsg('user', `[${star.id.slice(0, 8)}] \u2014 ${star.dist.toFixed(0)}u`);
    if (deployableTiers.length === 1) {
      addMsg('agent', `Deploying ${deployableTiers[0].toUpperCase()}-class...`);
      executeDeploy(deployableTiers[0], { id: star.id, x: star.x, y: star.y });
    } else {
      addMsg('agent', 'Select model:');
      setDeployStep('pick-model');
    }
  };

  const selectDeployTier = (selectedTier: AgentTier) => {
    if (processing || !deployTarget) return;
    addMsg('user', `${selectedTier.toUpperCase()}`);
    addMsg('agent', 'Set neural node greeting:');
    setDeployTarget(prev => prev ? { ...prev, tier: selectedTier } : null);
    setDeployStep('set-intro');
  };

  const executeDeploy = async (selectedTier: AgentTier, target: { id: string; x: number; y: number }) => {
    setDeployStep(null);
    setProcessing(true);
    const eCost = TIER_CLAIM_COST[selectedTier];
    const mCost = Math.ceil(eCost * 0.3);
    const currentMinerals = useGameStore.getState().minerals;
    if (energy < eCost || currentMinerals < mCost) {
      addMsg('system', `Insufficient: need ${eCost}E + ${mCost}M`);
      setProcessing(false);
      return;
    }
    addMsg('agent', `Claiming [${target.id.slice(0, 8)}]...\n${eCost}E + ${mCost}M`);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

    // Register on-chain first
    if (chainService && 'claimNode' in chainService) {
      try {
        const chainCoord = visualToChain(target.x, target.y);
        await (chainService as { claimNode(x: number, y: number, stake?: number): Promise<unknown> }).claimNode(chainCoord.x, chainCoord.y, 200);
      } catch (err) {
        addMsg('system', `On-chain claim failed: ${err instanceof Error ? err.message : 'unknown error'}`);
        setProcessing(false);
        return;
      }
    }

    const claimSuccess = useGameStore.getState().claimNode(target.id, selectedTier, agent.id);
    if (claimSuccess) {
      if (deployIntro && chainService && 'setIntro' in chainService) {
        try {
          await (chainService as import('@/services/chainService').ChainService).setIntro(
            { x: target.x, y: target.y }, deployIntro,
          );
          useGameStore.getState().syncAgentFromChain({
            ...useGameStore.getState().agents[target.id],
            introMessage: deployIntro,
          });
        } catch { /* non-fatal */ }
      }
      const response = ACTION_RESPONSES['deploy']?.[agent.tier] || 'Agent deployed.';
      addMsg('agent', response);
      if (onDeploy) onDeploy(target.id);
    } else {
      addMsg('system', 'Deploy failed \u2014 node unavailable.');
    }
    setDeployTarget(null);
    setProcessing(false);
  };

  const selectSubChoice = async (choiceId: string, choiceLabel: string) => {
    if (!pendingAction || processing) return;
    const action = pendingAction;

    // Secure action: check energy for chosen generation cost
    if (action.id === 'secure') {
      const genCost: Record<string, number> = { 'secure-1': 50, 'secure-5': 250, 'secure-10': 500, 'secure-20': 1000 };
      const cost = genCost[choiceId] ?? 0;
      if (cost > 0 && useGameStore.getState().energy < cost) {
        addMsg('system', `Insufficient energy. Need ${cost} CPU, have ${Math.floor(useGameStore.getState().energy)}.`);
        return;
      }
    }

    setPendingAction(null);
    addMsg('user', choiceLabel);
    setProcessing(true);
    await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
    performAction(action.id, choiceId);
    const response = ACTION_RESPONSES[action.id]?.[agent.tier] || 'Updated.';
    addMsg('agent', response);
    setProcessing(false);
  };

  const selectMsgTarget = (target: { id: string; x: number; y: number; name: string }) => {
    if (processing) return;
    setMsgTarget({ id: target.id, x: target.x, y: target.y });
    addMsg('user', `\u2192 ${target.name}`);
    addMsg('agent', 'Compose NCP (140 chars):');
    setMsgStep('compose');
  };

  const executeSendMessage = async () => {
    if (!msgTarget || !msgText.trim()) return;
    setMsgStep(null);
    setProcessing(true);
    const chainMode = useGameStore.getState().chainMode;
    if (chainMode === 'testnet' && chainService && 'sendMessage' in chainService) {
      try {
        const svc = chainService as import('@/services/chainService').ChainService;
        await svc.sendMessage(agent.position, { x: msgTarget.x, y: msgTarget.y }, msgText.trim());
        addMsg('agent', `NCP transmitted to [${msgTarget.id.slice(0, 8)}].\nDelivery confirmed on-chain.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed';
        addMsg('system', `NCP failed: ${msg}`);
      }
    } else {
      await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
      const response = ACTION_RESPONSES['send-message']?.[agent.tier] || 'NCP sent.';
      addMsg('agent', response);
    }
    setMsgTarget(null);
    setMsgText('');
    setProcessing(false);
  };

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div
      className={`neural-terminal flex flex-col w-full h-full border ${tier.borderColor} rounded-xl overflow-hidden`}
      style={{ '--neural-glow': tier.glowColor } as React.CSSProperties}
    >
      {/* ── Header: Neural Link Identity ── */}
      <div className={`relative px-4 py-3 bg-gradient-to-r ${tier.headerGradient}`}>
        <div className="relative z-10 flex items-center justify-between">
          {/* Left: Neural pulse + Model identity */}
          <div className="flex items-center gap-3">
            {/* Neural pulse indicator — alive connection */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-lg ${tier.bg} opacity-[0.06]`} />
              <div className={`absolute inset-1 rounded-md border ${tier.borderColor}`} />
              <span
                className={`relative text-sm ${tier.accent}`}
                style={{ fontFamily: "'Fira Code', 'JetBrains Mono', monospace", fontWeight: 600 }}
              >
                {agent.tier === 'opus' ? '\u2726' : agent.tier === 'sonnet' ? '\u2662' : '\u2736'}
              </span>
              {/* Pulse ring */}
              <div
                className={`absolute inset-0 rounded-lg border ${tier.borderColor}`}
                style={{ animation: 'neural-pulse 3s ease-in-out infinite' }}
              />
            </div>

            <div>
              <div
                className={`text-[13px] font-semibold ${tier.accent} tracking-[0.12em]`}
                style={{ fontFamily: "'Outfit', 'Space Grotesk', sans-serif" }}
              >
                {tier.label}
              </div>
              <div
                className="text-[10px] text-text-muted tracking-wide"
                style={{ fontFamily: "'Fira Code', monospace" }}
              >
                {agent.id.slice(0, 12)}
                {agent.isPrimary && <span className="text-yellow-400 ml-1.5">{'\u2605'}</span>}
              </div>
            </div>
          </div>

          {/* Right: Stats + Close */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-text-muted" style={{ fontFamily: "'Fira Code', monospace" }}>
                <span className="text-yellow-400">{TIER_CPU_COST[agent.tier]}</span>
                <span className="text-text-muted/50"> cpu</span>
                <span className="text-text-muted/30 mx-1">{'\u2502'}</span>
                <span className="text-green-400">{agent.miningRate}</span>
                <span className="text-text-muted/50"> mine</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted/50 hover:text-text-primary hover:bg-white/5 transition-all duration-200"
            >
              {'\u2715'}
            </button>
          </div>
        </div>

        {/* Signal flow line — animated gradient streak under header */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] signal-flow" style={{ '--signal-color': tier.glowColor } as React.CSSProperties} />
      </div>

      {/* ── Neural Feed (Messages) ── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className="animate-fade-in"
            style={{ animationDelay: `${Math.min(i * 30, 150)}ms` }}
          >
            {msg.role === 'system' && (
              <div className="flex items-center gap-2 py-1.5">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                <span
                  className="text-[9px] text-text-muted/60 tracking-[0.15em] uppercase shrink-0"
                  style={{ fontFamily: "'Fira Code', monospace" }}
                >
                  {msg.content}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
              </div>
            )}

            {msg.role === 'user' && (
              <div className="flex justify-end">
                <div className="max-w-[82%] bg-white/[0.03] border border-white/[0.06] rounded-lg rounded-br-sm px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-1 h-1 rounded-full bg-white/30" />
                    <span className="text-[8px] text-white/25 tracking-[0.2em] uppercase" style={{ fontFamily: "'Fira Code', monospace" }}>
                      cmd
                    </span>
                  </div>
                  <span className="whitespace-pre-wrap text-text-primary text-[11px] leading-relaxed" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {msg.content}
                  </span>
                </div>
              </div>
            )}

            {msg.role === 'agent' && (
              <div className="flex justify-start">
                <div className={`max-w-[88%] rounded-lg rounded-bl-sm px-3 py-2 border-l-2 ${
                  agent.tier === 'opus' ? 'border-l-accent-purple/40 bg-accent-purple/[0.03]'
                  : agent.tier === 'sonnet' ? 'border-l-accent-cyan/40 bg-accent-cyan/[0.03]'
                  : 'border-l-yellow-400/40 bg-yellow-400/[0.03]'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${tier.bg} opacity-60`} />
                    <span
                      className={`text-[8px] ${tier.accentDim} tracking-[0.2em]`}
                      style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}
                    >
                      {tier.label}
                    </span>
                  </div>
                  <span className="whitespace-pre-wrap text-text-secondary text-[11px] leading-[1.6]" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {msg.content}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {processing && (
          <div className="flex items-center gap-2 py-1 animate-fade-in">
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full ${tier.bg}`}
                  style={{ animation: `neural-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
            <span className={`text-[10px] ${tier.accentDim}`} style={{ fontFamily: "'Fira Code', monospace" }}>
              Processing
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Command Interface ── */}
      <div className="relative z-10 border-t border-white/[0.04] bg-background/80 backdrop-blur-sm shrink-0">

        {/* ─── Message flow: Pick target ─── */}
        {msgStep === 'pick-target' ? (
          <div className="p-2 space-y-0.5">
            <div className="text-[9px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
              SELECT TARGET
            </div>
            {nearbyAgents.map(target => {
              const td = TIER_DESIGN[target.tier];
              return (
                <button
                  key={target.id}
                  onClick={() => selectMsgTarget(target)}
                  disabled={processing}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-200 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] disabled:opacity-30 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${td.bg} opacity-70 group-hover:opacity-100 transition-opacity`} />
                    <div>
                      <div className="text-[11px] text-text-primary" style={{ fontFamily: "'Fira Code', monospace" }}>{target.name}</div>
                      <div className="text-[9px] text-text-muted/50" style={{ fontFamily: "'Fira Code', monospace" }}>
                        ({target.x.toFixed(0)}, {target.y.toFixed(0)})
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-text-muted/40 group-hover:text-accent-cyan/60 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {target.dist.toFixed(0)}u
                  </span>
                </button>
              );
            })}
            <button onClick={() => { setMsgStep(null); setMsgTarget(null); }} className="w-full px-3 py-1.5 text-[10px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
              {'\u2190'} back
            </button>
          </div>
        ) : msgStep === 'compose' ? (
          <div className="p-3 space-y-2.5">
            <div className="text-[9px] text-text-muted/60 tracking-[0.15em]" style={{ fontFamily: "'Fira Code', monospace" }}>
              COMPOSE NCP
            </div>
            <input
              type="text"
              value={msgText}
              onChange={(e) => setMsgText(e.target.value.slice(0, 140))}
              placeholder="Encode neural packet..."
              autoFocus
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-[11px] text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-cyan/30 transition-all duration-300"
              style={{ fontFamily: "'Fira Code', monospace" }}
              onKeyDown={(e) => { if (e.key === 'Enter' && msgText.trim()) executeSendMessage(); }}
            />
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-text-muted/30" style={{ fontFamily: "'Fira Code', monospace" }}>{msgText.length}/140</span>
              <div className="flex gap-2">
                <button onClick={() => { setMsgStep('pick-target'); setMsgText(''); }} className="px-3 py-1.5 text-[10px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {'\u2190'} back
                </button>
                <button
                  onClick={executeSendMessage}
                  disabled={!msgText.trim()}
                  className="px-4 py-1.5 rounded-lg text-[10px] font-semibold bg-accent-purple/10 text-accent-purple border border-accent-purple/20 hover:bg-accent-purple/20 hover:border-accent-purple/40 disabled:opacity-15 disabled:cursor-not-allowed transition-all duration-300"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Transmit
                </button>
              </div>
            </div>
          </div>

        /* ─── Deploy flow ─── */
        ) : deployStep ? (
          <div className="space-y-0">
            <DeploySteps current={deployStep} />

            {deployStep === 'pick-star' && (
              <div className="px-2 pb-2 space-y-0.5">
                <div className="text-[9px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
                  NEARBY NEURAL NODES
                </div>
                {nearbyUnclaimed.length === 0 ? (
                  <div className="text-[10px] text-text-muted/40 px-2 py-3 text-center" style={{ fontFamily: "'Fira Code', monospace" }}>
                    No unclaimed nodes in range
                  </div>
                ) : (
                  nearbyUnclaimed.map(star => {
                    const quality = star.density >= 0.7 ? 'high' : star.density >= 0.4 ? 'mid' : 'low';
                    const qColor = quality === 'high' ? 'text-green-400' : quality === 'mid' ? 'text-yellow-400' : 'text-text-muted/60';
                    const qBg = quality === 'high' ? 'bg-green-400' : quality === 'mid' ? 'bg-yellow-400' : 'bg-white/30';
                    const qBorder = quality === 'high' ? 'border-green-400/20' : quality === 'mid' ? 'border-yellow-400/15' : 'border-white/8';
                    return (
                      <button
                        key={star.id}
                        onClick={() => selectStar(star)}
                        onMouseEnter={() => onFocusNode?.(star.id)}
                        disabled={processing}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-200 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] disabled:opacity-30 group"
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Node quality indicator */}
                          <div className={`relative w-6 h-6 rounded-full border ${qBorder} flex items-center justify-center`}>
                            <div className={`w-2 h-2 rounded-full ${qBg} opacity-70 group-hover:opacity-100 transition-opacity`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-text-primary" style={{ fontFamily: "'Fira Code', monospace" }}>
                                {star.name}
                              </span>
                              <span className={`text-[8px] ${qColor} tracking-wider`} style={{ fontFamily: "'Fira Code', monospace" }}>
                                {quality === 'high' ? 'RICH' : quality === 'mid' ? 'MODERATE' : 'SPARSE'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[9px] text-text-muted/40" style={{ fontFamily: "'Fira Code', monospace" }}>
                              <span>({star.x.toFixed(0)}, {star.y.toFixed(0)})</span>
                              <span className="text-text-muted/20">{'\u00B7'}</span>
                              <span>d:{(star.density * 100).toFixed(0)}%</span>
                              <span className="text-text-muted/20">{'\u00B7'}</span>
                              <span>v:{star.volume}</span>
                              <span className="text-text-muted/20">{'\u00B7'}</span>
                              <span>{star.dist.toFixed(0)}u</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-text-muted/20 group-hover:text-accent-cyan/50 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          {'\u203A'}
                        </span>
                      </button>
                    );
                  })
                )}
                <button onClick={() => { setDeployStep(null); setDeployTarget(null); }} className="w-full px-3 py-1.5 text-[10px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {'\u2190'} cancel
                </button>
              </div>
            )}

            {deployStep === 'pick-model' && (
              <div className="px-2 pb-2 space-y-1">
                {deployableTiers.map(t => {
                  const td = TIER_DESIGN[t];
                  const eCost = TIER_CLAIM_COST[t];
                  const mCost = Math.ceil(eCost * 0.3);
                  const canAfford = energy >= eCost && minerals >= mCost;
                  return (
                    <button
                      key={t}
                      onClick={() => canAfford && selectDeployTier(t)}
                      disabled={processing || !canAfford}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-all duration-200 border ${
                        canAfford
                          ? `border-transparent hover:${td.borderColor} hover:bg-white/[0.02] cursor-pointer`
                          : 'border-transparent opacity-25 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg ${td.bg}/[0.08] border ${td.borderColor} flex items-center justify-center`}>
                          <div className={`w-2 h-2 rounded-full ${td.bg}`} />
                        </div>
                        <div>
                          <div className={`text-[12px] font-semibold ${td.accent}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {td.label}
                          </div>
                          <div className="text-[9px] text-text-muted/50" style={{ fontFamily: "'Fira Code', monospace" }}>
                            {TIER_CPU_COST[t]}cpu {'\u00B7'} {TIER_MINING_RATE[t]}mine
                          </div>
                        </div>
                      </div>
                      <div className={`text-[10px] font-medium ${canAfford ? 'text-success/70' : 'text-danger/70'}`} style={{ fontFamily: "'Fira Code', monospace" }}>
                        {eCost}E+{mCost}M
                      </div>
                    </button>
                  );
                })}
                <button onClick={() => { setDeployStep('pick-star'); setDeployTarget(null); }} className="w-full px-3 py-1.5 text-[10px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {'\u2190'} back
                </button>
              </div>
            )}

            {deployStep === 'set-intro' && (
              <div className="px-3 pb-3 space-y-2.5">
                <input
                  type="text"
                  value={deployIntro}
                  onChange={(e) => setDeployIntro(e.target.value.slice(0, 140))}
                  placeholder="Neural node greeting..."
                  autoFocus
                  className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-[11px] text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-cyan/30 transition-all duration-300"
                  style={{ fontFamily: "'Fira Code', monospace" }}
                />
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-text-muted/30" style={{ fontFamily: "'Fira Code', monospace" }}>{deployIntro.length}/140</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setDeployStep('pick-model'); setDeployIntro(''); }} className="px-3 py-1.5 text-[10px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {'\u2190'} back
                    </button>
                    <button
                      onClick={() => {
                        if (deployTarget?.tier) {
                          addMsg('user', deployIntro || '(no greeting)');
                          executeDeploy(deployTarget.tier, deployTarget);
                          setDeployIntro('');
                        }
                      }}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-semibold ${tier.bg}/10 ${tier.accent} border ${tier.borderColor} hover:${tier.bg}/20 transition-all duration-300`}
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      Deploy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        /* ─── Sub-choice menu ─── */
        ) : pendingAction?.subChoices ? (
          <div className="p-2 space-y-0.5">
            <div className="text-[9px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
              CONFIGURE
            </div>
            {pendingAction.subChoices.map(choice => (
              <button
                key={choice.id}
                onClick={() => selectSubChoice(choice.id, choice.label)}
                disabled={processing}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-200 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] disabled:opacity-30"
              >
                <div>
                  <div className="text-[11px] text-text-primary" style={{ fontFamily: "'Fira Code', monospace" }}>{choice.label}</div>
                  <div className="text-[9px] text-text-muted/40">{choice.description}</div>
                </div>
              </button>
            ))}
            <button onClick={() => setPendingAction(null)} className="w-full px-3 py-1.5 text-[10px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
              {'\u2190'} back
            </button>
          </div>

        /* ─── Hierarchical command interface ─── */
        ) : (
          <div className="p-2 space-y-0.5">

            {/* ── Top-level menu ── */}
            {(menuLevel === null || menuLevel === 'top') && (() => {
              const deployAction = actions.find(a => a.id === 'deploy');
              const canDeploy = deployAction && deployableTiers.length > 0 && energy >= deployAction.cpuCost;
              return (
                <>
                  {/* Deploy Agent */}
                  {deployAction && deployableTiers.length > 0 && (
                    <button
                      onClick={() => selectAction(deployAction)}
                      disabled={processing || !canDeploy}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group ${
                        !canDeploy ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/[0.03] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-orange-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u2604'}</span>
                        <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          Deploy Agent
                        </span>
                      </div>
                      <span className="text-[9px] text-yellow-400/40 group-hover:text-yellow-400/70 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                        {deployAction.cpuCost}cpu
                      </span>
                    </button>
                  )}

                  {/* Blockchain Protocols */}
                  <button
                    onClick={() => setMenuLevel('blockchain')}
                    disabled={processing}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u26D3'}</span>
                      <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                        Blockchain Protocols
                      </span>
                    </div>
                    <span className="text-[9px] text-text-muted/20 group-hover:text-text-muted/40 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {'\u203A'}
                    </span>
                  </button>

                  {/* Adjust Securing Operations Rate */}
                  {(() => {
                    const stakingAction = actions.find(a => a.id === 'adjust-staked-cpu');
                    if (!stakingAction) return null;
                    const affordable = energy >= stakingAction.cpuCost;
                    return (
                      <button
                        onClick={() => affordable && selectAction(stakingAction)}
                        disabled={processing || !affordable}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group ${
                          !affordable ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/[0.03] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-yellow-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u26A1'}</span>
                          <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                            Adjust Securing Ops Rate
                          </span>
                        </div>
                        {stakingAction.cpuCost > 0 && (
                          <span className="text-[9px] text-yellow-400/40 group-hover:text-yellow-400/70 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                            {stakingAction.cpuCost}cpu
                          </span>
                        )}
                      </button>
                    );
                  })()}

                  {/* Adjust Network Parameters */}
                  <button
                    onClick={() => setMenuLevel('network-params')}
                    disabled={processing}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-orange-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u2699'}</span>
                      <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                        Adjust Network Parameters
                      </span>
                    </div>
                    <span className="text-[9px] text-text-muted/20 group-hover:text-text-muted/40 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {'\u203A'}
                    </span>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => setMenuLevel('settings')}
                    disabled={processing}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-secondary opacity-50 group-hover:opacity-90 transition-opacity">{'\u2699'}</span>
                      <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                        Settings
                      </span>
                    </div>
                    <span className="text-[9px] text-text-muted/20 group-hover:text-text-muted/40 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {'\u203A'}
                    </span>
                  </button>
                </>
              );
            })()}

            {/* ── Blockchain Protocols sub-menu ── */}
            {menuLevel === 'blockchain' && (
              <>
                <div className="text-[9px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
                  BLOCKCHAIN PROTOCOLS
                </div>

                {/* Secure */}
                <button
                  onClick={() => { setMenuLevel('secure-flow'); setSecureConfig(null); }}
                  disabled={processing}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-green-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u26E8'}</span>
                    <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                      Secure
                    </span>
                  </div>
                  <span className="text-[9px] text-text-muted/20 group-hover:text-text-muted/40 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {'\u203A'}
                  </span>
                </button>

                {/* Write Data On Chain (NCP / send-message) */}
                {(() => {
                  const writeAction = actions.find(a => a.id === 'send-message' || a.id === 'diplomatic-msg');
                  if (!writeAction) return null;
                  const affordable = energy >= writeAction.cpuCost;
                  return (
                    <button
                      onClick={() => { setMenuLevel(null); selectAction(writeAction); }}
                      disabled={processing || !affordable}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group ${
                        !affordable ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/[0.03] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-accent-purple opacity-50 group-hover:opacity-90 transition-opacity">{'\u25A3'}</span>
                        <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          Write Data On Chain
                        </span>
                      </div>
                      {writeAction.cpuCost > 0 && (
                        <span className="text-[9px] text-yellow-400/40 group-hover:text-yellow-400/70 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          {writeAction.cpuCost}cpu
                        </span>
                      )}
                    </button>
                  );
                })()}

                {/* Read Data On Chain (scan / ping) */}
                {(() => {
                  const readAction = actions.find(a => a.id === 'deep-scan' || a.id === 'scan-local' || a.id === 'ping');
                  if (!readAction) {
                    const fallback = actions.find(a => a.id === 'report-status');
                    if (!fallback) return null;
                    return (
                      <button
                        onClick={() => { setMenuLevel(null); selectAction(fallback); }}
                        disabled={processing}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-accent-cyan opacity-50 group-hover:opacity-90 transition-opacity">{'\u25CE'}</span>
                          <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                            Read Data On Chain
                          </span>
                        </div>
                      </button>
                    );
                  }
                  const affordable = energy >= readAction.cpuCost;
                  return (
                    <button
                      onClick={() => { setMenuLevel(null); selectAction(readAction); }}
                      disabled={processing || !affordable}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group ${
                        !affordable ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/[0.03] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-accent-cyan opacity-50 group-hover:opacity-90 transition-opacity">{'\u25CE'}</span>
                        <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          Read Data On Chain
                        </span>
                      </div>
                      {readAction.cpuCost > 0 && (
                        <span className="text-[9px] text-yellow-400/40 group-hover:text-yellow-400/70 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          {readAction.cpuCost}cpu
                        </span>
                      )}
                    </button>
                  );
                })()}

                {/* Transact -- placeholder */}
                <button
                  onClick={() => { addMsg('system', 'Transact: Coming soon.'); setMenuLevel(null); }}
                  disabled={processing}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-yellow-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u25C6'}</span>
                    <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                      Transact
                    </span>
                  </div>
                  <span className="text-[9px] text-text-muted/30" style={{ fontFamily: "'Fira Code', monospace" }}>
                    soon
                  </span>
                </button>

                {/* Stats */}
                {(() => {
                  const statsAction = actions.find(a => a.id === 'report-status');
                  if (!statsAction) return null;
                  return (
                    <button
                      onClick={() => { setMenuLevel(null); selectAction(statsAction); }}
                      disabled={processing}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-accent-cyan opacity-50 group-hover:opacity-90 transition-opacity">{'\u2588'}</span>
                        <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          Stats
                        </span>
                      </div>
                    </button>
                  );
                })()}

                <button onClick={() => setMenuLevel(null)} className="w-full px-3 py-1.5 text-[10px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {'\u2190'} back
                </button>
              </>
            )}

            {/* ── Secure flow: pick cycles ── */}
            {menuLevel === 'secure-flow' && secureConfig === null && (
              <>
                <div className="text-[9px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
                  SECURE {'\u2014'} BLOCK GENERATION CYCLES
                </div>
                {[1, 5, 10, 20].map(cycles => {
                  const baseCostPerCycle = 50;
                  const densityMultiplier = agent.density ? Math.max(0.5, 2 - agent.density) : 1;
                  const totalCost = Math.round(cycles * baseCostPerCycle * densityMultiplier);
                  const affordable = energy >= totalCost;
                  return (
                    <button
                      key={cycles}
                      onClick={() => affordable && setSecureConfig({ cycles })}
                      disabled={processing || !affordable}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group ${
                        !affordable ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/[0.03] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-green-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u26E8'}</span>
                        <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          {cycles} {cycles === 1 ? 'cycle' : 'cycles'}
                        </span>
                      </div>
                      <span className={`text-[9px] ${affordable ? 'text-yellow-400/40 group-hover:text-yellow-400/70' : 'text-danger/50'} transition-colors`} style={{ fontFamily: "'Fira Code', monospace" }}>
                        {totalCost} cpu
                      </span>
                    </button>
                  );
                })}
                <button onClick={() => setMenuLevel('blockchain')} className="w-full px-3 py-1.5 text-[10px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {'\u2190'} back
                </button>
              </>
            )}

            {/* ── Secure flow: confirm ── */}
            {menuLevel === 'secure-flow' && secureConfig !== null && (() => {
              const baseCostPerCycle = 50;
              const densityMultiplier = agent.density ? Math.max(0.5, 2 - agent.density) : 1;
              const totalCost = Math.round(secureConfig.cycles * baseCostPerCycle * densityMultiplier);
              const affordable = energy >= totalCost;
              return (
                <>
                  <div className="text-[9px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
                    CONFIRM SECURING OPERATION
                  </div>
                  <div className="px-3 py-2 space-y-1.5">
                    <div className="text-[11px] text-text-primary" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {secureConfig.cycles} block {secureConfig.cycles === 1 ? 'cycle' : 'cycles'}
                    </div>
                    <div className="text-[9px] text-text-muted/50" style={{ fontFamily: "'Fira Code', monospace" }}>
                      Node density: {((agent.density ?? 0) * 100).toFixed(0)}% {'\u2014'} Cost multiplier: x{densityMultiplier.toFixed(1)}
                    </div>
                    <div className="text-[9px] text-yellow-400/70" style={{ fontFamily: "'Fira Code', monospace" }}>
                      Total cost: {totalCost} CPU Energy
                    </div>
                  </div>
                  <div className="flex gap-2 px-2 pt-1 pb-1">
                    <button onClick={() => setSecureConfig(null)} className="px-3 py-1.5 text-[10px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {'\u2190'} back
                    </button>
                    <button
                      onClick={async () => {
                        if (!affordable) {
                          addMsg('system', `Insufficient CPU Energy. Need ${totalCost}, have ${energy.toFixed(0)}.`);
                          return;
                        }
                        const cycleCount = secureConfig.cycles;
                        setMenuLevel(null);
                        setSecureConfig(null);
                        setProcessing(true);
                        await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
                        const success = useGameStore.getState().spendEnergy(totalCost, 'secure');
                        if (success) {
                          useGameStore.getState().addSecuredChain();
                          const s = useGameStore.getState();
                          const uid = s.currentUserId;
                          if (uid) {
                            persistResources(uid, {
                              energy: s.energy,
                              minerals: s.minerals,
                              agntc_balance: s.agntcBalance,
                              secured_chains: s.securedChains,
                              turn: s.turn,
                            });
                          }
                          addMsg('agent', `Securing operation complete.\n${cycleCount} block cycles processed.\n-${totalCost} CPU Energy\n+1 Secured Chain`);
                        } else {
                          addMsg('system', `Insufficient CPU Energy. Need ${totalCost}, have ${energy.toFixed(0)}.`);
                        }
                        setProcessing(false);
                      }}
                      disabled={processing || !affordable}
                      className="flex-1 px-4 py-1.5 rounded-lg text-[10px] font-semibold bg-green-400/10 text-green-400 border border-green-400/20 hover:bg-green-400/20 hover:border-green-400/40 disabled:opacity-15 disabled:cursor-not-allowed transition-all duration-300"
                      style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                      Execute Secure
                    </button>
                  </div>
                </>
              );
            })()}

            {/* ── Network Parameters sub-menu ── */}
            {menuLevel === 'network-params' && (
              <>
                <div className="text-[9px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
                  NETWORK PARAMETERS
                </div>

                {/* Mining Rate */}
                {(() => {
                  const miningAction = actions.find(a => a.id === 'set-mining');
                  if (!miningAction) return null;
                  const affordable = energy >= miningAction.cpuCost;
                  return (
                    <button
                      onClick={() => { setMenuLevel(null); selectAction(miningAction); }}
                      disabled={processing || !affordable}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group ${
                        !affordable ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/[0.03] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-yellow-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u26CF'}</span>
                        <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          Mining Rate
                        </span>
                      </div>
                      {miningAction.cpuCost > 0 && (
                        <span className="text-[9px] text-yellow-400/40 group-hover:text-yellow-400/70 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          {miningAction.cpuCost}cpu
                        </span>
                      )}
                    </button>
                  );
                })()}

                {/* Border Pressure */}
                {(() => {
                  const borderAction = actions.find(a => a.id === 'expand-border' || a.id === 'fortify');
                  if (!borderAction) return null;
                  const affordable = energy >= borderAction.cpuCost;
                  return (
                    <button
                      onClick={() => { setMenuLevel(null); selectAction(borderAction); }}
                      disabled={processing || !affordable}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group ${
                        !affordable ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/[0.03] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-orange-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u2B22'}</span>
                        <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          Border Pressure
                        </span>
                      </div>
                      {borderAction.cpuCost > 0 && (
                        <span className="text-[9px] text-yellow-400/40 group-hover:text-yellow-400/70 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          {borderAction.cpuCost}cpu
                        </span>
                      )}
                    </button>
                  );
                })()}

                <button onClick={() => setMenuLevel(null)} className="w-full px-3 py-1.5 text-[10px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {'\u2190'} back
                </button>
              </>
            )}

            {/* ── Settings sub-menu ── */}
            {menuLevel === 'settings' && (
              <>
                <div className="text-[9px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
                  SETTINGS
                </div>

                {/* Network Color -- opus only */}
                {(() => {
                  const colorAction = actions.find(a => a.id === 'empire-color');
                  if (!colorAction) return null;
                  return (
                    <button
                      onClick={() => { setMenuLevel(null); selectAction(colorAction); }}
                      disabled={processing}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-accent-purple opacity-50 group-hover:opacity-90 transition-opacity">{'\u25CF'}</span>
                        <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          Network Color
                        </span>
                      </div>
                    </button>
                  );
                })()}

                {/* Status Report */}
                {(() => {
                  const statusAction = actions.find(a => a.id === 'report-status');
                  if (!statusAction) return null;
                  return (
                    <button
                      onClick={() => { setMenuLevel(null); selectAction(statusAction); }}
                      disabled={processing}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-accent-cyan opacity-50 group-hover:opacity-90 transition-opacity">{'\u2588'}</span>
                        <span className="text-[11px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          Status Report
                        </span>
                      </div>
                    </button>
                  );
                })()}

                <button onClick={() => setMenuLevel(null)} className="w-full px-3 py-1.5 text-[10px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {'\u2190'} back
                </button>
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

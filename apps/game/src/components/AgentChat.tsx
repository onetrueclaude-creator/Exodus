"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Agent } from '@/types/agent';
import { TIER_CPU_COST, TIER_MINING_RATE, TIER_CLAIM_COST } from '@/types/agent';
import { useGameStore } from '@/store';
import {
  getNodeTier,
  getNodeCpuPerTurn,
  getLevelUpTurns,
  getLevelUpCost,
  getMiningPresets,
  getSecuringPresets,
  TIER_DISPLAY_NAME,
  type NodeTier,
} from '@/lib/nodeTier';
import { getDistance } from '@/lib/proximity';
import { postTransact, getStatus as fetchChainStats } from '@/services/testnetApi';
import { getWalletIndex } from '@/lib/walletIndex';
import { runSecure } from '@/lib/vaultGate';
import { isOnChainRequiredError } from '@/lib/writeSigner';
import { useTerminalStore, type ChatMessage } from '@/store/terminalStore';
import { SINGULARITY_ID } from '@/lib/orbitalSeats';
import { logAction } from '@/lib/actionLogger';
import { sciFormat } from '@/lib/format';

/* ── Agent Action Definitions ─────────────────────────────── */

interface AgentAction {
  id: string;
  label: string;
  icon: string;
  cpuCost: number;
  estTime: string;
  description: string;
  category: 'blockchain' | 'expansion' | 'intel' | 'social' | 'node-ops';
  /** If set, this action opens a sub-menu of choices instead of executing directly */
  subChoices?: { id: string; label: string; description: string }[];
}

const AGENT_ACTIONS: Record<NodeTier, AgentAction[]> = {
  nexus: [
    { id: 'deploy', label: 'Deploy Agent', icon: '\u2604', cpuCost: 0, estTime: '~5min', description: 'Claim a node with a new sub-node', category: 'expansion' },
    { id: 'secure', label: 'Secure', icon: '\u26D3', cpuCost: 0, estTime: '~5s', description: 'Prove possession and secure the chain through the Singularity gate', category: 'blockchain' },
    { id: 'transact', label: 'Transact', icon: '\u21C4', cpuCost: 0, estTime: '~30s', description: 'Transfer AGNTC to another wallet', category: 'blockchain' },
    { id: 'chain-stats', label: 'Chain Stats', icon: '\u25A3', cpuCost: 0, estTime: '~5s', description: 'View live blockchain statistics', category: 'blockchain' },
    { id: 'configure-node', label: 'Configure Node', icon: '\u26A1', cpuCost: 0, estTime: '~5s', description: 'Set Mining and Securing CPU for this node', category: 'node-ops' },
    { id: 'develop-node', label: 'Develop Node', icon: '\u25B2', cpuCost: 0, estTime: 'varies', description: 'Level up this node (upfront CPU cost)', category: 'node-ops' },
    { id: 'report-status', label: 'Status Report', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'deep-scan', label: 'Deep Scan', icon: '\u25CE', cpuCost: 6, estTime: '~3min', description: 'Reveal agents in wide radius', category: 'intel' },
    { id: 'diplomatic-msg', label: 'Broadcast', icon: '\u25CE', cpuCost: 3, estTime: '~1min', description: 'Broadcast signal to nearby agents', category: 'social' },
  ],
  lattice: [
    { id: 'deploy', label: 'Deploy Agent', icon: '\u2604', cpuCost: 0, estTime: '~5min', description: 'Claim a node with a new sub-node', category: 'expansion' },
    { id: 'secure', label: 'Secure', icon: '\u26D3', cpuCost: 0, estTime: '~5s', description: 'Prove possession and secure the chain through the Singularity gate', category: 'blockchain' },
    { id: 'transact', label: 'Transact', icon: '\u21C4', cpuCost: 0, estTime: '~30s', description: 'Transfer AGNTC to another wallet', category: 'blockchain' },
    { id: 'chain-stats', label: 'Chain Stats', icon: '\u25A3', cpuCost: 0, estTime: '~5s', description: 'View live blockchain statistics', category: 'blockchain' },
    { id: 'configure-node', label: 'Configure Node', icon: '\u26A1', cpuCost: 0, estTime: '~5s', description: 'Set Mining and Securing CPU for this node', category: 'node-ops' },
    { id: 'develop-node', label: 'Develop Node', icon: '\u25B2', cpuCost: 0, estTime: 'varies', description: 'Level up this node (upfront CPU cost)', category: 'node-ops' },
    { id: 'report-status', label: 'Status Report', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'deep-scan', label: 'Deep Scan', icon: '\u25CE', cpuCost: 6, estTime: '~3min', description: 'Reveal agents in wide radius', category: 'intel' },
    { id: 'diplomatic-msg', label: 'Broadcast', icon: '\u25CE', cpuCost: 3, estTime: '~1min', description: 'Broadcast signal to nearby agents', category: 'social' },
  ],
  cortex: [
    { id: 'deploy', label: 'Deploy Agent', icon: '\u2604', cpuCost: 0, estTime: '~3min', description: 'Claim a node with a sub-node', category: 'expansion' },
    { id: 'secure', label: 'Secure', icon: '\u26D3', cpuCost: 0, estTime: '~5s', description: 'Prove possession and secure the chain through the Singularity gate', category: 'blockchain' },
    { id: 'transact', label: 'Transact', icon: '\u21C4', cpuCost: 0, estTime: '~30s', description: 'Transfer AGNTC to another wallet', category: 'blockchain' },
    { id: 'chain-stats', label: 'Chain Stats', icon: '\u25A3', cpuCost: 0, estTime: '~5s', description: 'View live blockchain statistics', category: 'blockchain' },
    { id: 'configure-node', label: 'Configure Node', icon: '\u26A1', cpuCost: 0, estTime: '~5s', description: 'Set Mining and Securing CPU for this node', category: 'node-ops' },
    { id: 'develop-node', label: 'Develop Node', icon: '\u25B2', cpuCost: 0, estTime: 'varies', description: 'Level up this node (upfront CPU cost)', category: 'node-ops' },
    { id: 'report-status', label: 'Status Report', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'scan-local', label: 'Scan Vicinity', icon: '\u25CE', cpuCost: 2, estTime: '~1min', description: 'Reveal nearby agents', category: 'intel' },
    { id: 'send-message', label: 'Send NCP', icon: '\u25A3', cpuCost: 1, estTime: '~30s', description: 'Transmit a neural communication packet', category: 'social' },
  ],
  synapse: [
    { id: 'deploy', label: 'Deploy Agent', icon: '\u2604', cpuCost: 0, estTime: '~5s', description: 'Claim an adjacent unclaimed node (L1 Synapse)', category: 'expansion' },
    { id: 'secure', label: 'Secure', icon: '\u26D3', cpuCost: 0, estTime: '~5s', description: 'Prove possession and secure the chain through the Singularity gate', category: 'blockchain' },
    { id: 'chain-stats', label: 'Chain Stats', icon: '\u25A3', cpuCost: 0, estTime: '~5s', description: 'View live blockchain statistics', category: 'blockchain' },
    { id: 'configure-node', label: 'Configure Node', icon: '\u26A1', cpuCost: 0, estTime: '~5s', description: 'Set Mining and Securing CPU for this node', category: 'node-ops' },
    { id: 'develop-node', label: 'Develop Node', icon: '\u25B2', cpuCost: 0, estTime: 'varies', description: 'Level up this node (upfront CPU cost)', category: 'node-ops' },
    { id: 'report-status', label: 'Status Report', icon: '\u2588', cpuCost: 0, estTime: '~5s', description: 'Agent reports current state', category: 'intel' },
    { id: 'ping', label: 'Ping', icon: '\u25CE', cpuCost: 1, estTime: '~20s', description: 'Quick scan of surroundings', category: 'intel' },
    { id: 'send-message', label: 'Send NCP', icon: '\u25A3', cpuCost: 0, estTime: '~15s', description: 'Transmit a neural communication packet', category: 'social' },
  ],
};

/* ── Chat Message Types ───────────────────────────────────── */
// ChatMessage + per-node persistent history now live in the terminal store
// (@/store/terminalStore) so each node has its OWN chat that survives reloads.

const EMPTY_MESSAGES: ChatMessage[] = [];

/* ── Agent Response Templates ─────────────────────────────── */

const ACTION_RESPONSES: Record<string, Record<NodeTier, string>> = {
  'deploy': {
    nexus: 'Sub-node deployed.\nNew node claimed and operational.\nTerminal now available.',
    lattice: 'Sub-node deployed.\nNew node claimed and operational.\nTerminal now available.',
    cortex: 'Agent deployed\u2014\nnode claimed successfully.\nNew terminal online.',
    synapse: '',
  },
  'deep-scan': {
    nexus: 'Sector sweep complete.\nAll agents and resources in range\nnow visible on grid overlay.',
    lattice: 'Sector sweep complete.\nAll agents and resources in range\nnow visible on grid overlay.',
    cortex: '',
    synapse: '',
  },
  'scan-local': {
    nexus: '',
    lattice: '',
    cortex: 'Vicinity scanned\u2014\nnearby agents detected.\nGrid overlay updated.',
    synapse: '',
  },
  'ping': {
    nexus: '',
    lattice: '',
    cortex: '',
    synapse: 'Ping sent.\nSector response received.',
  },
  'send-message': {
    nexus: '',
    lattice: '',
    cortex: 'Neural communication packet\nencoded and transmitted.\nAwaiting acknowledgement.',
    synapse: 'NCP sent.\nDelivered to network.',
  },
  'diplomatic-msg': {
    nexus: 'Network broadcast sent.\nAll agents within signal range\nhave received your transmission.',
    lattice: 'Network broadcast sent.\nAll agents within signal range\nhave received your transmission.',
    cortex: '',
    synapse: '',
  },
  'transact': {
    nexus: 'AGNTC transfer initiated.\nTransaction broadcast to network.\nConfirmation pending.',
    lattice: 'AGNTC transfer initiated.\nTransaction broadcast to network.\nConfirmation pending.',
    cortex: 'Transfer broadcast\u2014\nAGNTC transaction submitted.\nAwaiting confirmation.',
    synapse: '',
  },
  'chain-stats': {
    nexus: '',
    lattice: '',
    cortex: '',
    synapse: '',
  },
};

/* ── Tier Design Tokens ───────────────────────────────────── */

// accent must match NODE_TIER_ACCENT (nodeTier.ts)
const TIER_DESIGN: Record<NodeTier, {
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
  nexus: {
    accent: 'text-pink-400',
    accentDim: 'text-pink-400/60',
    bg: 'bg-pink-400',
    glow: 'shadow-[0_0_20px_rgba(244,114,182,0.12)]',
    glowColor: 'rgba(244,114,182,0.12)',
    borderColor: 'border-pink-400/25',
    headerGradient: 'from-pink-400/[0.08] via-transparent to-transparent',
    label: 'NEXUS',
    personality: 'Core Orchestrator',
  },
  lattice: {
    accent: 'text-accent-purple',
    accentDim: 'text-accent-purple/60',
    bg: 'bg-accent-purple',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.10)]',
    glowColor: 'rgba(139,92,246,0.10)',
    borderColor: 'border-accent-purple/20',
    headerGradient: 'from-accent-purple/[0.06] via-transparent to-transparent',
    label: 'LATTICE',
    personality: 'Expansion Node',
  },
  cortex: {
    accent: 'text-accent-cyan',
    accentDim: 'text-accent-cyan/60',
    bg: 'bg-accent-cyan',
    glow: 'shadow-[0_0_20px_rgba(0,212,255,0.12)]',
    glowColor: 'rgba(0,212,255,0.12)',
    borderColor: 'border-accent-cyan/25',
    headerGradient: 'from-accent-cyan/[0.06] via-transparent to-transparent',
    label: 'CORTEX',
    personality: 'Relay Operations',
  },
  synapse: {
    accent: 'text-yellow-400',
    accentDim: 'text-yellow-400/60',
    bg: 'bg-yellow-400',
    glow: 'shadow-[0_0_20px_rgba(250,204,21,0.10)]',
    glowColor: 'rgba(250,204,21,0.10)',
    borderColor: 'border-yellow-400/20',
    headerGradient: 'from-yellow-400/[0.05] via-transparent to-transparent',
    label: 'SYNAPSE',
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
  'node-ops': { color: 'text-violet-400', bg: 'bg-violet-400/8', border: 'border-violet-400/15', icon: '\u2699', label: 'NODE OPERATIONS' },
  intel: { color: 'text-accent-cyan', bg: 'bg-accent-cyan/8', border: 'border-accent-cyan/15', icon: '\u25CE', label: 'INTEL' },
  social: { color: 'text-accent-purple', bg: 'bg-accent-purple/8', border: 'border-accent-purple/15', icon: '\u25C7', label: 'SOCIAL' },
};

// Explicit top-level section order. NODE OPERATIONS sits directly after DEPLOY and
// before BLOCKCHAIN PROTOCOLS. Drives the grouped render so insertion order in
// AGENT_ACTIONS never decides section placement.
const CATEGORY_ORDER = ['expansion', 'node-ops', 'blockchain', 'intel', 'social'] as const;

/* ── PresetRow helper ─────────────────────────────────────── */

function PresetRow({
  label,
  value,
  onChange,
  presets,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  presets: ReadonlyArray<number>;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[12px] text-text-muted" style={{ fontFamily: "'Fira Code', monospace" }}>{label}</div>
      <div className="flex gap-1">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-2 py-1 rounded text-[12px] font-mono border ${
              value === p
                ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10'
                : 'border-card-border/40 text-text-muted/60 hover:border-card-border'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Component ────────────────────────────────────────────── */

interface AgentChatProps {
  agent: Agent;
  onClose: () => void;
  onDeploy?: (newAgentId: string) => void;
  /** Accepted from DockPanel for parity with SecuredNodes; no longer consumed here
   *  (the deploy target picker that used hover-to-focus was removed). */
  onFocusNode?: (nodeId: string) => void;
  chainService?: import('@/services/chainService').ChainService | null;
  initialDeployTarget?: string;
}

export default function AgentChat({ agent, onClose, onDeploy, chainService, initialDeployTarget }: AgentChatProps) {
  const agentNodeTier = getNodeTier(agent.level);
  const tier = TIER_DESIGN[agentNodeTier];
  // Friendly, coordinate-free label for the terminal's agent (ids are cell-keyed in
  // mock mode — never surface them). Role is the identity the player cares about.
  const nodeLabel = agent.isPrimary ? 'Homenode' : (agent.username || 'Sub-node');

  // Per-node, persistent message history (keyed by node id; survives refresh /
  // logout / crash). Each node's terminal has its OWN chat \u2014 not a shared feed.
  const messages = useTerminalStore((s) => s.messagesByNode[agent.id]) ?? EMPTY_MESSAGES;
  useEffect(() => {
    useTerminalStore.getState().seedNode(agent.id, [
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
          ? `${tier.personality} online.\nAwaiting directives.`
          : `${tier.personality} linked.\nReady for instructions.`,
        timestamp: Date.now(),
      },
    ]);
  }, [agent.id, tier.label, tier.personality, agent.isPrimary]);
  const [processing, setProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<AgentAction | null>(null);
  // Deploy is now a single confirmation step — no target picker, no greeting field.
  const [deployStep, setDeployStep] = useState<null | 'confirm'>(null);
  const [deployTarget, setDeployTarget] = useState<{ x: number; y: number; id: string } | null>(null);
  const [msgStep, setMsgStep] = useState<null | 'pick-target' | 'compose'>(null);
  const [msgTarget, setMsgTarget] = useState<{ id: string; x: number; y: number } | null>(null);
  const [msgText, setMsgText] = useState('');
  const [menuLevel, setMenuLevel] = useState<'top' | 'blockchain' | 'configure-node' | 'develop-node' | 'transact-flow' | null>(null);
  const [transactRecipient, setTransactRecipient] = useState<string>('');
  const [transactAmount, setTransactAmount] = useState<string>('');
  const [miningCpuState, setMiningCpuState] = useState(agent.miningCpu);
  const [securingCpuState, setSecuringCpuState] = useState(agent.securingCpu);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const energy = useGameStore((s) => s.energy);
  const minerals = useGameStore((s) => s.minerals);
  const allAgents = useGameStore((s) => s.agents);
  const cpuRegenPerTurn = useGameStore((s) => s.cpuRegenPerTurn);
  const turn = useGameStore((s) => s.turn);

  const actions = AGENT_ACTIONS[agentNodeTier];

  const nearbyAgents = useMemo(() => {
    return Object.values(allAgents)
      .filter(a => a.userId && a.id !== agent.id)
      .map(a => ({
        id: a.id,
        x: a.position.x,
        y: a.position.y,
        name: a.username || a.id.slice(0, 8),
        tier: getNodeTier(a.level),
        dist: getDistance(agent.position, a.position),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);
  }, [allAgents, agent.id, agent.position]);

  // Deploy is allowed when:
  //   - the agent is the player's homenode (isPrimary === true), OR
  //   - the agent has reached Cortex tier (level >= 4) or higher.
  // Synapse-tier sub-nodes cannot claim further nodes; they must be leveled up first.
  const canDeploy = agent.isPrimary || agent.level >= 4;

  const actionsByCategory = useMemo(() => {
    const grouped: Record<string, AgentAction[]> = {};
    for (const action of actions) {
      if (action.id === 'deploy' && !canDeploy) continue;
      // Securing is a homenode-only privilege — sub-nodes can't prove possession.
      if (action.id === 'secure' && !agent.isPrimary) continue;
      if (!grouped[action.category]) grouped[action.category] = [];
      grouped[action.category].push(action);
    }
    return grouped;
  }, [actions, canDeploy, agent.isPrimary]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (menuLevel === 'configure-node') {
      setMiningCpuState(agent.miningCpu);
      setSecuringCpuState(agent.securingCpu);
    }
  }, [menuLevel, agent.miningCpu, agent.securingCpu]);

  // Auto-start deploy flow when initialDeployTarget is provided
  useEffect(() => {
    if (!initialDeployTarget || !canDeploy) return;
    const targetNode = allAgents[initialDeployTarget];
    if (!targetNode || targetNode.userId) return;
    const dist = getDistance(agent.position, targetNode.position);
    addMsg('user', 'Deploy Agent');
    addMsg('agent', `Target: [${initialDeployTarget.slice(0, 8)}] at ${dist.toFixed(0)}u`);
    setDeployTarget({ id: initialDeployTarget, x: targetNode.position.x, y: targetNode.position.y });
    addMsg('agent', `Deploying SYNAPSE-class agent...`);
    executeDeploy('synapse', { id: initialDeployTarget, x: targetNode.position.x, y: targetNode.position.y });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDeployTarget]);

  const addMsg = useCallback((role: ChatMessage['role'], content: string) => {
    useTerminalStore.getState().addMessage(agent.id, {
      id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      content,
      timestamp: Date.now(),
    });
  }, [agent.id]);

  const performAction = useCallback((_actionId: string, _choiceId?: string) => {
    // All actions now use direct API calls or custom menu flows
  }, []);

  const selectAction = async (action: AgentAction) => {
    logAction('click', `Action: ${action.label}`, `id=${action.id} cpu=${action.cpuCost} tier=${agentNodeTier}`);
    if (processing) return;
    if (energy < action.cpuCost) {
      logAction('chain-err', `Insufficient energy`, `need=${action.cpuCost} have=${energy.toFixed(0)}`);
      addMsg('system', `Insufficient energy. Need ${action.cpuCost} CPU, have ${energy.toFixed(0)}.`);
      return;
    }

    if (action.id === 'configure-node') {
      setMenuLevel('configure-node');
      return;
    }

    if (action.id === 'develop-node') {
      setMenuLevel('develop-node');
      return;
    }

    if (action.id === 'secure') {
      addMsg('user', 'Secure');
      if (!chainService) {
        addMsg('system', 'Securing requires a live chain connection.');
        return;
      }
      setProcessing(true);
      logAction('chain-call', 'POAW secure', 'proving shard possession');
      try {
        const res = await runSecure(chainService, getWalletIndex());
        if (res.ok) {
          logAction('chain-ok', 'Proof accepted', `shard=${res.shardId} credit=${res.cpuCredit}`);
          addMsg('agent', `Secured — possession proof accepted (+${res.cpuCredit} CPU)`);
          // Mirror NodeInspector: draw the decaying edge to the Singularity on a real
          // accepted proof, anchored on the player's own (isSelf) node.
          const selfId = Object.values(useGameStore.getState().agents).find(a => a.isSelf)?.id;
          if (selfId) useGameStore.getState().addInteractionEdge(selfId, SINGULARITY_ID);
        } else {
          logAction('chain-err', 'Secure rejected', res.reason);
          addMsg('system', `Secure failed: ${res.reason}`);
        }
      } catch (err: unknown) {
        if (isOnChainRequiredError(err)) {
          logAction('chain-err', 'Secure failed', 'Hollow-DB: no wallet');
          addMsg('system', 'Connect a wallet to act on-chain.');
        } else {
          const msg = err instanceof Error ? err.message : 'Secure failed';
          logAction('chain-err', 'Secure failed', msg);
          addMsg('system', `Secure failed: ${msg}`);
        }
      }
      setProcessing(false);
      return;
    }

    if (action.id === 'report-status') {
      addMsg('user', 'Status Report');
      setProcessing(true);
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
      const baseMining = TIER_MINING_RATE[agentNodeTier];
      const baseCpu = TIER_CPU_COST[agentNodeTier];
      const extraMining = Math.max(0, (agent.miningRate ?? baseMining) - baseMining);
      const eLimit = agent.energyLimit ?? baseCpu * 5;
      const currentMining = agent.miningRate ?? baseMining;
      const cpuUsed = agent.cpuPerTurn;
      const cpuCapacity = eLimit;
      const utilisation = cpuCapacity > 0 ? Math.min(100, Math.round((cpuUsed / cpuCapacity) * 100)) : 0;
      const stakedCpu = agent.stakedCpu ?? 0;
      const lines = [
        `\u2500\u2500\u2500 ${tier.label} STATUS \u2500\u2500\u2500`,
        `Tier: ${TIER_DISPLAY_NAME[agentNodeTier]} (Lv ${agent.level})`,
        // Coordinates retired (phyllotaxis orbital model \u2014 nodes are rank-seats, not x/y).
        ...(agent.rank ? [`Seat: rank #${agent.rank}`] : []),
        `Mining: ${currentMining}/t${extraMining > 0 ? ` (+${extraMining} boost)` : ''}`,
        `CPU: ${cpuUsed}/t (base ${baseCpu})`,
        `Staked: ${stakedCpu}/t${stakedCpu > 0 ? ' \u2714' : ''}`,
        `Energy: ${energy.toFixed(0)} | Frags: ${minerals.toFixed(0)}`,
        agent.isPrimary ? `Role: Homenode \u2605` : `Role: Sub-node`,
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
      // Render placeholder stats from the store. Used both in offline/mock mode and
      // as a graceful fallback when the testnet fetch fails \u2014 never surface a raw
      // "Failed to fetch" to the player.
      const offlineStats = (): string => {
        const s = useGameStore.getState();
        return [
          '\u2550\u2550\u2550 CHAIN STATUS (offline) \u2550\u2550\u2550',
          `Blocks: ${s.testnetBlocks}`,
          `Epoch Ring: ${s.epochRing}`,
          `Hardness: ${s.hardness}x`,
          `AGNTC Mined: ${sciFormat(s.totalMined)}`,
          `Circulating: ${sciFormat(s.poolRemaining)}`,
          s.stateRoot ? `State Root: ${s.stateRoot.slice(0, 16)}...` : 'State Root: \u2014',
          '',
          'Testnet API unreachable \u2014 showing cached/local values.',
          'Connect to localhost:8080 for live chain stats.',
        ].join('\n');
      };

      // Mock/offline mode: don't even attempt the network call.
      if (useGameStore.getState().chainMode !== 'testnet') {
        await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
        addMsg('agent', offlineStats());
        setProcessing(false);
        return;
      }

      logAction('chain-call', 'GET /api/status', 'fetching chain stats');
      try {
        const stats = await fetchChainStats();
        const statsLines = [
          '\u2550\u2550\u2550 CHAIN STATUS \u2550\u2550\u2550',
          `Blocks: ${stats.blocks_processed}`,
          `Epoch Ring: ${stats.epoch_ring}`,
          `Hardness: ${stats.hardness}x`,
          `AGNTC Mined: ${sciFormat(stats.total_mined)}`,
          `Circulating: ${sciFormat(stats.circulating_supply)}`,
          `Burned: ${stats.burned_fees}`,
          `State Root: ${stats.state_root.slice(0, 16)}...`,
        ];
        addMsg('agent', statsLines.join('\n'));
      } catch (err: unknown) {
        // Testnet selected but unreachable \u2192 degrade gracefully to local values
        // instead of leaking the raw fetch error to the terminal.
        logAction('chain-err', 'GET /api/status', err instanceof Error ? err.message : 'unknown error');
        addMsg('agent', offlineStats());
      }
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
      if (!canDeploy) {
        addMsg('system', 'This node must reach Cortex tier (Lv 4) before deploying sub-nodes.');
        return;
      }
      addMsg('user', 'Deploy Agent');
      setPendingAction(null);
      // Orbital deploy: spawn a child sub-node of THIS node (no grid seat needed).
      // Stage a non-null marker (the parent) and ask for one confirmation; the
      // sub-node spawns in orbit and is draggable.
      setDeployTarget({ id: agent.id, x: agent.position.x, y: agent.position.y });
      setDeployStep('confirm');
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
    const response = ACTION_RESPONSES[action.id]?.[agentNodeTier] || 'Executed.';
    addMsg('agent', response);
    setProcessing(false);
  };

  const executeDeploy = async (selectedTier: NodeTier, target: { id: string; x: number; y: number }) => {
    logAction('click', 'Deploy Agent', `tier=${selectedTier} target=${target.id.slice(0,8)} at (${target.x.toFixed(0)},${target.y.toFixed(0)})`);
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
    addMsg('agent', `Deploying sub-node...\n${eCost}E + ${mCost}M`);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

    // Sub-nodes are client-side children that orbit their parent node. The
    // orbital model carries no parent relationship in chain claims (parentId is a
    // client concept), and promoting a sub-node to its own on-chain claim is the
    // AGNTC-gated /api/birth mechanism — so a spawn is local until the player can
    // fund a birth. (Removed the legacy visualToChain + /api/claim call, which fed
    // a phyllotaxis seat position into coordinate-grid claiming and 400'd.)
    const newId = useGameStore.getState().createAgent(selectedTier, agent.position, undefined, agent.id);
    if (newId) {
      const response = ACTION_RESPONSES['deploy']?.[agentNodeTier] || 'Sub-node deployed.';
      addMsg('agent', response);
      if (onDeploy) onDeploy(newId);
    } else {
      addMsg('system', 'Deploy failed \u2014 insufficient CPU.');
    }
    setDeployTarget(null);
    setProcessing(false);
  };

  const selectSubChoice = async (choiceId: string, choiceLabel: string) => {
    if (!pendingAction || processing) return;
    const action = pendingAction;

    // Secure action: handled via secure-flow menu, not sub-choices
    if (action.id === 'secure') {
      setPendingAction(null);
      return;
    }

    setPendingAction(null);
    addMsg('user', choiceLabel);
    setProcessing(true);
    await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
    performAction(action.id, choiceId);
    const response = ACTION_RESPONSES[action.id]?.[agentNodeTier] || 'Updated.';
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
      const response = ACTION_RESPONSES['send-message']?.[agentNodeTier] || 'NCP sent.';
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
        <div className="relative z-10 space-y-1.5">
          {/* Identity (row 1, full width) */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Neural pulse indicator — alive connection */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-lg ${tier.bg} opacity-[0.06]`} />
              <div className={`absolute inset-1 rounded-md border ${tier.borderColor}`} />
              <span
                className={`relative text-sm ${tier.accent}`}
                style={{ fontFamily: "'Fira Code', 'JetBrains Mono', monospace", fontWeight: 600 }}
              >
                {agentNodeTier === 'nexus' ? '\u2726' : agentNodeTier === 'lattice' ? '\u25c6' : agentNodeTier === 'cortex' ? '\u2662' : '\u2736'}
              </span>
              {/* Pulse ring */}
              <div
                className={`absolute inset-0 rounded-lg border ${tier.borderColor}`}
                style={{ animation: 'neural-pulse 3s ease-in-out infinite' }}
              />
            </div>

            <div className="min-w-0">
              <div
                className={`text-[13px] font-semibold ${tier.accent} tracking-[0.12em] flex items-baseline gap-1.5 whitespace-nowrap`}
                style={{ fontFamily: "'Outfit', 'Space Grotesk', sans-serif" }}
              >
                {tier.label}
                <span className="text-[13px] font-medium text-text-muted tracking-normal">
                  {'·'} Lv {agent.level}
                </span>
              </div>
              <div
                className="text-[12px] text-text-muted tracking-wide truncate"
                style={{ fontFamily: "'Fira Code', monospace" }}
              >
                {nodeLabel}
                {agent.isPrimary && <span className="text-yellow-400 ml-1.5">{'\u2605'}</span>}
              </div>
            </div>
          </div>

          {/* Stats + Close (row 2) */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-right">
              <div className="text-[12px] text-text-muted" style={{ fontFamily: "'Fira Code', monospace" }}>
                <span className="text-yellow-400">{getNodeCpuPerTurn(agent.level)}</span>
                <span className="text-text-muted/50" title="Node CPU output per turn"> CPU/turn</span>
                <span className="text-text-muted/30 mx-1">{'\u2502'}</span>
                <span className="text-green-400">{agent.miningRate}</span>
                <span className="text-text-muted/50" title="Node mining rate per turn (NOT AGNTC per block)"> mine/turn</span>
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
                  className="min-w-0 break-words text-center text-[12px] text-text-muted/60 tracking-[0.15em] uppercase"
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
                    <span className="text-[11px] text-white/25 tracking-[0.2em] uppercase" style={{ fontFamily: "'Fira Code', monospace" }}>
                      cmd
                    </span>
                  </div>
                  <span className="whitespace-pre-wrap break-words text-text-primary text-[13px] leading-relaxed" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {msg.content}
                  </span>
                </div>
              </div>
            )}

            {msg.role === 'agent' && (
              <div className="flex justify-start">
                <div className={`max-w-[88%] rounded-lg rounded-bl-sm px-3 py-2 border-l-2 ${
                  agentNodeTier === 'nexus' || agentNodeTier === 'lattice' ? 'border-l-accent-purple/40 bg-accent-purple/[0.03]'
                  : agentNodeTier === 'cortex' ? 'border-l-accent-cyan/40 bg-accent-cyan/[0.03]'
                  : 'border-l-yellow-400/40 bg-yellow-400/[0.03]'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${tier.bg} opacity-60`} />
                    <span
                      className={`text-[11px] ${tier.accentDim} tracking-[0.2em]`}
                      style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}
                    >
                      {tier.label}
                    </span>
                  </div>
                  <span className="whitespace-pre-wrap break-words text-text-secondary text-[13px] leading-[1.6]" style={{ fontFamily: "'Fira Code', monospace" }}>
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
            <span className={`text-[12px] ${tier.accentDim}`} style={{ fontFamily: "'Fira Code', monospace" }}>
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
            <div className="text-[12px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
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
                      <div className="text-[12px] text-text-primary" style={{ fontFamily: "'Fira Code', monospace" }}>{target.name}</div>
                      {/* Coordinates retired (orbital rank-seat model). Tier reads as identity instead. */}
                      <div className="text-[11px] text-text-muted/50 capitalize" style={{ fontFamily: "'Fira Code', monospace" }}>
                        {target.tier}
                      </div>
                    </div>
                  </div>
                  <span className="text-[12px] text-text-muted/40 group-hover:text-accent-cyan/60 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {target.dist.toFixed(0)}u
                  </span>
                </button>
              );
            })}
            <button onClick={() => { setMsgStep(null); setMsgTarget(null); }} className="w-full px-3 py-1.5 text-[12px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
              {'\u2190'} back
            </button>
          </div>
        ) : msgStep === 'compose' ? (
          <div className="p-3 space-y-2.5">
            <div className="text-[12px] text-text-muted/60 tracking-[0.15em]" style={{ fontFamily: "'Fira Code', monospace" }}>
              COMPOSE NCP
            </div>
            <input
              type="text"
              value={msgText}
              onChange={(e) => setMsgText(e.target.value.slice(0, 140))}
              placeholder="Encode neural packet..."
              autoFocus
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-[12px] text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-cyan/30 transition-all duration-300"
              style={{ fontFamily: "'Fira Code', monospace" }}
              onKeyDown={(e) => { if (e.key === 'Enter' && msgText.trim()) executeSendMessage(); }}
            />
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-text-muted/30" style={{ fontFamily: "'Fira Code', monospace" }}>{msgText.length}/140</span>
              <div className="flex gap-2">
                <button onClick={() => { setMsgStep('pick-target'); setMsgText(''); }} className="px-3 py-1.5 text-[12px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {'\u2190'} back
                </button>
                <button
                  onClick={executeSendMessage}
                  disabled={!msgText.trim()}
                  className="px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-accent-purple/10 text-accent-purple border border-accent-purple/20 hover:bg-accent-purple/20 hover:border-accent-purple/40 disabled:opacity-15 disabled:cursor-not-allowed transition-all duration-300"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Transmit
                </button>
              </div>
            </div>
          </div>

        /* ─── Deploy flow ─── */
        ) : deployStep === 'confirm' ? (
          <div className="p-3 space-y-3">
            <div className="text-[12px] text-text-muted/60 tracking-[0.15em]" style={{ fontFamily: "'Fira Code', monospace" }}>
              CONFIRM DEPLOYMENT
            </div>
            <div className="text-[12px] text-text-secondary leading-relaxed" style={{ fontFamily: "'Fira Code', monospace" }}>
              Deploy a new sub-node from this node?
            </div>
            <div className="text-[12px] text-text-muted/70" style={{ fontFamily: "'Fira Code', monospace" }}>
              Cost: <span className="text-yellow-400">{TIER_CLAIM_COST['synapse']} CPU</span> + <span className="text-blue-300">{Math.ceil(TIER_CLAIM_COST['synapse'] * 0.3)} Frags</span> (L1 Synapse)
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeployStep(null); setDeployTarget(null); }} className="px-3 py-1.5 text-[12px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                Cancel
              </button>
              <button
                onClick={() => { if (deployTarget) executeDeploy('synapse', deployTarget); }}
                disabled={processing || !deployTarget}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold ${tier.bg}/10 ${tier.accent} border ${tier.borderColor} hover:${tier.bg}/20 disabled:opacity-30 transition-all duration-300`}
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                Confirm Deploy
              </button>
            </div>
          </div>

        /* ─── Sub-choice menu ─── */
        ) : pendingAction?.subChoices ? (
          <div className="p-2 space-y-0.5">
            <div className="text-[12px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
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
                  <div className="text-[12px] text-text-primary" style={{ fontFamily: "'Fira Code', monospace" }}>{choice.label}</div>
                  <div className="text-[11px] text-text-muted/40">{choice.description}</div>
                </div>
              </button>
            ))}
            <button onClick={() => setPendingAction(null)} className="w-full px-3 py-1.5 text-[12px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
              {'\u2190'} back
            </button>
          </div>

        /* ─── Hierarchical command interface ─── */
        ) : (
          <div className="p-2 space-y-0.5">

            {/* ── Top-level menu ── */}
            {(menuLevel === null || menuLevel === 'top') && (() => {
              const deployAction = actions.find(a => a.id === 'deploy');
              const canDeployNow = deployAction && canDeploy && energy >= deployAction.cpuCost;
              return (
                <>
                  {/* Deploy Agent */}
                  {deployAction && canDeploy && (
                    <button
                      onClick={() => selectAction(deployAction)}
                      disabled={processing || !canDeployNow}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group ${
                        !canDeployNow ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/[0.03] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-orange-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u2604'}</span>
                        <span className="text-[13px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          Deploy Agent
                        </span>
                      </div>
                      <span className="text-[12px] text-yellow-400/40 group-hover:text-yellow-400/70 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                        {deployAction.cpuCost}cpu
                      </span>
                    </button>
                  )}

                  {/* Node Operations — CATEGORY_ORDER places 'node-ops' directly after
                      'expansion' (Deploy) and before 'blockchain', so the section renders
                      here. Actions keep AGENT_ACTIONS array order: Configure Node, then
                      Develop Node. */}
                  {CATEGORY_ORDER.indexOf('node-ops') > CATEGORY_ORDER.indexOf('expansion') &&
                   actionsByCategory['node-ops']?.length ? (
                    <>
                      <div className="text-[12px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
                        {CATEGORY_DESIGN['node-ops'].label}
                      </div>
                      {actionsByCategory['node-ops'].map((opAction) => (
                        <button
                          key={opAction.id}
                          onClick={() => setMenuLevel(opAction.id as 'configure-node' | 'develop-node')}
                          disabled={processing}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-violet-400 opacity-50 group-hover:opacity-90 transition-opacity">{opAction.icon}</span>
                            <span className="text-[13px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                              {opAction.label}
                            </span>
                          </div>
                          <span className="text-[12px] text-text-muted/20 group-hover:text-text-muted/40 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                            {'›'}
                          </span>
                        </button>
                      ))}
                    </>
                  ) : null}

                  {/* Blockchain Protocols */}
                  <button
                    onClick={() => setMenuLevel('blockchain')}
                    disabled={processing}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-emerald-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u26D3'}</span>
                      <span className="text-[13px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                        Blockchain Protocols
                      </span>
                    </div>
                    <span className="text-[12px] text-text-muted/20 group-hover:text-text-muted/40 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {'\u203A'}
                    </span>
                  </button>

                </>
              );
            })()}

            {/* ── Blockchain Protocols sub-menu ── */}
            {menuLevel === 'blockchain' && (
              <>
                <div className="text-[12px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
                  BLOCKCHAIN PROTOCOLS
                </div>

                {/* Transact */}
                <button
                  onClick={() => { setMenuLevel('transact-flow'); setTransactRecipient(''); setTransactAmount(''); }}
                  disabled={processing}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-yellow-400 opacity-50 group-hover:opacity-90 transition-opacity">{'\u25C6'}</span>
                    <span className="text-[13px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                      Transact
                    </span>
                  </div>
                  <span className="text-[12px] text-text-muted/20 group-hover:text-text-muted/40 transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {'\u203A'}
                  </span>
                </button>

                {/* Chain Stats */}
                {(() => {
                  const statsAction = actions.find(a => a.id === 'chain-stats');
                  if (!statsAction) return null;
                  return (
                    <button
                      onClick={() => { setMenuLevel(null); selectAction(statsAction); }}
                      disabled={processing}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left transition-all duration-200 group hover:bg-white/[0.03] cursor-pointer disabled:opacity-30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-accent-cyan opacity-50 group-hover:opacity-90 transition-opacity">{'\u25A3'}</span>
                        <span className="text-[13px] text-text-primary/80 group-hover:text-text-primary transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                          Chain Stats
                        </span>
                      </div>
                    </button>
                  );
                })()}

                <button onClick={() => setMenuLevel(null)} className="w-full px-3 py-2 text-[12px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                  {'\u2190'} back
                </button>
              </>
            )}

            {/* ── Configure Node: Mining / Securing preset pills ── */}
            {menuLevel === 'configure-node' && (() => {
              const nodeOutput = getNodeCpuPerTurn(agent.level);
              const committed = miningCpuState + securingCpuState;
              const net = nodeOutput - committed;
              return (
                <div className="p-3 space-y-3">
                  <div className="text-[12px] text-text-muted/60 tracking-[0.15em] uppercase" style={{ fontFamily: "'Fira Code', monospace" }}>
                    Configure Node
                  </div>
                  <div className="text-[12px] text-text-muted" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {nodeLabel} · Lv {agent.level} {TIER_DISPLAY_NAME[getNodeTier(agent.level)]} · {nodeOutput} CPU/turn generated
                  </div>

                  <PresetRow label="Mining"   value={miningCpuState}   onChange={setMiningCpuState}   presets={getMiningPresets()} />
                  <PresetRow label="Securing" value={securingCpuState} onChange={setSecuringCpuState} presets={getSecuringPresets()} />

                  <div className="text-[12px] text-text-muted" style={{ fontFamily: "'Fira Code', monospace" }}>
                    Net (this node): +{nodeOutput} generated · −{committed} committed · {net >= 0 ? '+' : ''}{net}/turn
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setMenuLevel('top')} className="text-[12px] text-text-muted/60">cancel</button>
                    <button
                      onClick={() => {
                        const ok = useGameStore.getState().setNodeMiningSecuring(agent.id, miningCpuState, securingCpuState);
                        if (ok) {
                          addMsg('agent', `Configuration saved. Mining ${miningCpuState} CPU · Securing ${securingCpuState} CPU per turn.`);
                          setMenuLevel('top');
                        }
                      }}
                      className="text-[12px] text-accent-cyan"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Develop Node: upfront-cost level-up flow ── */}
            {menuLevel === 'develop-node' && (() => {
              const tier = getNodeTier(agent.level);
              const nextLevel = agent.level + 1;
              const nextTier = getNodeTier(nextLevel);
              const tierUp = nextTier !== tier;
              const cpuCurrent = getNodeCpuPerTurn(agent.level);
              const cpuNext = getNodeCpuPerTurn(nextLevel);
              const turnsNeeded = getLevelUpTurns(agent.level);
              const cost = getLevelUpCost(agent.level);
              const currentEnergy = useGameStore.getState().energy;
              const canAfford = currentEnergy >= cost;
              const isLeveling = agent.levelingUntilTurn !== null;

              if (isLeveling) {
                const remaining = (agent.levelingUntilTurn ?? 0) - turn;
                return (
                  <div className="p-3 space-y-3">
                    <div className="text-[12px] text-text-muted/60 tracking-[0.15em] uppercase" style={{ fontFamily: "'Fira Code', monospace" }}>
                      Developing — {remaining} turn{remaining !== 1 ? 's' : ''} remaining
                    </div>
                    <div className="text-[12px] text-text-muted" style={{ fontFamily: "'Fira Code', monospace" }}>
                      {nodeLabel} · Lv {agent.level} {TIER_DISPLAY_NAME[tier]} → Lv {nextLevel} {TIER_DISPLAY_NAME[nextTier]}
                    </div>
                    <div className="text-[12px] text-amber-400/80" style={{ fontFamily: "'Fira Code', monospace" }}>
                      Node remains fully productive during the upgrade.
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setMenuLevel('top')} className="text-[12px] text-text-muted/60">close</button>
                      <button
                        onClick={() => {
                          useGameStore.getState().cancelNodeLevelUp(agent.id);
                          addMsg('agent', `Level-up cancelled. Spent CPU is not refunded.`);
                          setMenuLevel('top');
                        }}
                        className="text-[12px] text-red-400/80"
                      >
                        Cancel upgrade (no refund)
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="p-3 space-y-3">
                  <div className="text-[12px] text-text-muted/60 tracking-[0.15em] uppercase" style={{ fontFamily: "'Fira Code', monospace" }}>
                    Develop Node
                  </div>
                  <div className="text-[12px] text-text-muted" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {nodeLabel} · Lv {agent.level} {TIER_DISPLAY_NAME[tier]}
                  </div>

                  <div className="space-y-1 text-[12px]" style={{ fontFamily: "'Fira Code', monospace" }}>
                    <div className="text-text-muted">→ Lv {nextLevel} {TIER_DISPLAY_NAME[nextTier]} {tierUp && <span className="text-accent-cyan">(tier-up!)</span>}</div>
                    <div className="text-text-muted">CPU/turn: {cpuCurrent} → {cpuNext} (+{cpuNext - cpuCurrent})</div>
                    <div className="text-text-muted">Time: {turnsNeeded} turn{turnsNeeded !== 1 ? 's' : ''}</div>
                    <div className={canAfford ? 'text-text-muted' : 'text-red-400'}>
                      Cost: {cost} CPU {canAfford ? `(you have ${currentEnergy})` : `(need ${cost - currentEnergy} more)`}
                    </div>
                  </div>

                  <div className="text-[12px] text-text-muted/80" style={{ fontFamily: "'Fira Code', monospace" }}>
                    Node remains fully productive during the upgrade.
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setMenuLevel('top')} className="text-[12px] text-text-muted/60">cancel</button>
                    <button
                      disabled={!canAfford}
                      onClick={() => {
                        const ok = useGameStore.getState().beginNodeLevelUp(agent.id);
                        if (ok) {
                          addMsg('agent', `Level-up begun. Paid ${cost} CPU. New level in ${turnsNeeded} turn${turnsNeeded !== 1 ? 's' : ''}.`);
                          setMenuLevel('top');
                        } else {
                          addMsg('system', `Failed to start level-up.`);
                        }
                      }}
                      className="text-[12px] text-accent-cyan disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Pay {cost} CPU · Begin
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Transact flow ── */}
            {menuLevel === 'transact-flow' && (
              <>
                <div className="text-[12px] text-text-muted/60 tracking-[0.15em] px-2 py-1.5" style={{ fontFamily: "'Fira Code', monospace" }}>
                  TRANSACT {'\u2014'} AGNTC TRANSFER
                </div>
                <div className="px-3 py-2 space-y-2">
                  <div>
                    <label className="text-[11px] text-text-muted/50 block mb-1" style={{ fontFamily: "'Fira Code', monospace" }}>
                      Recipient owner-name
                    </label>
                    <input
                      type="text"
                      value={transactRecipient}
                      onChange={(e) => setTransactRecipient(e.target.value)}
                      placeholder="owner name"
                      className="w-full px-2 py-1.5 rounded-md bg-white/[0.03] border border-card-border text-[12px] text-text-primary font-mono focus:border-accent-cyan/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-text-muted/50 block mb-1" style={{ fontFamily: "'Fira Code', monospace" }}>
                      Amount (AGNTC)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={transactAmount}
                      onChange={(e) => setTransactAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 rounded-md bg-white/[0.03] border border-card-border text-[12px] text-text-primary font-mono focus:border-accent-cyan/40 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 px-2 pt-1 pb-1">
                  <button onClick={() => setMenuLevel('blockchain')} className="px-3 py-1.5 text-[12px] text-text-muted/40 hover:text-text-muted transition-colors" style={{ fontFamily: "'Fira Code', monospace" }}>
                    {'\u2190'} back
                  </button>
                  <button
                    onClick={async () => {
                      const recipientName = transactRecipient.trim();
                      const amount = parseFloat(transactAmount);
                      logAction('click', 'Execute Transfer', `to=${recipientName} amount=${amount}`);
                      if (!recipientName) {
                        addMsg('system', 'Enter a recipient owner-name.');
                        return;
                      }
                      if (isNaN(amount) || amount <= 0) {
                        addMsg('system', 'Invalid amount.');
                        return;
                      }
                      setMenuLevel(null);
                      setProcessing(true);
                      try {
                        const senderWallet = getWalletIndex();
                        logAction('chain-call', 'POST /api/transact', `from=${senderWallet} to=${recipientName} amount=${amount}`);
                        const result = await postTransact(senderWallet, { recipientName, amount });
                        logAction('chain-ok', 'Transfer confirmed', `amount=${result.amount} fee=${result.fee}`);
                        const store = useGameStore.getState();
                        store.flashDelta('agntc', -(amount + result.fee));
                        const lines = [
                          `Transfer confirmed.`,
                          `Sent: ${result.amount} AGNTC \u2192 ${recipientName} (wallet #${result.recipient_wallet})`,
                          `Fee: ${result.fee.toFixed(6)} AGNTC (50% burned)`,
                          `Records: ${result.records_created} | Nullifiers: ${result.nullifiers_published}`,
                        ];
                        addMsg('agent', lines.join('\n'));
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : 'Transfer failed';
                        logAction('chain-err', 'Transfer failed', msg);
                        // A 400 "zero balance" means the wallet has no spendable AGNTC yet.
                        if (/zero balance|unspent|insufficient balance/i.test(msg)) {
                          addMsg('system', 'No spendable AGNTC yet \u2014 Secure (possession proof) to earn some first.');
                        } else {
                          addMsg('agent', `Transfer failed: ${msg}`);
                        }
                      }
                      setTransactRecipient('');
                      setTransactAmount('');
                      setProcessing(false);
                    }}
                    disabled={processing || !transactRecipient || !transactAmount}
                    className="flex-1 px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20 hover:border-yellow-400/40 disabled:opacity-15 disabled:cursor-not-allowed transition-all duration-300"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Execute Transfer
                  </button>
                </div>
              </>
            )}


          </div>
        )}
      </div>
    </div>
  );
}

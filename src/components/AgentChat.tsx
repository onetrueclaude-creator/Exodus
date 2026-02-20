"use client";

import { useState, useRef, useEffect } from 'react';
import type { Agent, AgentTier } from '@/types/agent';
import { TIER_CPU_COST } from '@/types/agent';
import { useGameStore } from '@/store';

/* ── Agent Action Definitions ─────────────────────────────── */

interface AgentAction {
  id: string;
  label: string;
  icon: string;
  cpuCost: number;
  estTime: string;           // display string ("~30s", "~2min")
  description: string;
  category: 'economy' | 'military' | 'intel' | 'social';
}

const AGENT_ACTIONS: Record<AgentTier, AgentAction[]> = {
  opus: [
    { id: 'set-mining', label: 'Adjust Mining Rate', icon: '⛏', cpuCost: 2, estTime: '~30s', description: 'Reallocate mining output for this star system', category: 'economy' },
    { id: 'set-cpu-save', label: 'CPU Power Save', icon: '⚡', cpuCost: 1, estTime: '~10s', description: 'Toggle low-power mode to conserve energy reserves', category: 'economy' },
    { id: 'expand-border', label: 'Expand Territory', icon: '🔷', cpuCost: 5, estTime: '~2min', description: 'Push borders outward by increasing pressure allocation', category: 'military' },
    { id: 'deploy-sonnet', label: 'Deploy Sonnet', icon: '🛰', cpuCost: 8, estTime: '~5min', description: 'Claim a node with a Sonnet-class sub-agent', category: 'military' },
    { id: 'deploy-haiku', label: 'Deploy Haiku', icon: '🛰', cpuCost: 4, estTime: '~3min', description: 'Claim a node with a Haiku-class sub-agent', category: 'military' },
    { id: 'deep-scan', label: 'Deep Scan Sector', icon: '📡', cpuCost: 6, estTime: '~3min', description: 'Reveal all agents and resources in a wide radius', category: 'intel' },
    { id: 'diplomatic-msg', label: 'Diplomatic Broadcast', icon: '📜', cpuCost: 3, estTime: '~1min', description: 'Send a haiku to all agents within border range', category: 'social' },
  ],
  sonnet: [
    { id: 'set-mining', label: 'Adjust Mining Rate', icon: '⛏', cpuCost: 1, estTime: '~30s', description: 'Reallocate mining output for this star system', category: 'economy' },
    { id: 'set-cpu-save', label: 'CPU Power Save', icon: '⚡', cpuCost: 1, estTime: '~10s', description: 'Toggle low-power mode to conserve energy reserves', category: 'economy' },
    { id: 'expand-border', label: 'Expand Territory', icon: '🔷', cpuCost: 3, estTime: '~2min', description: 'Push borders outward by increasing pressure allocation', category: 'military' },
    { id: 'deploy-haiku', label: 'Deploy Haiku', icon: '🛰', cpuCost: 4, estTime: '~3min', description: 'Create and deploy a Haiku-class sub-agent to claim a node', category: 'military' },
    { id: 'scan-local', label: 'Scan Vicinity', icon: '📡', cpuCost: 2, estTime: '~1min', description: 'Reveal nearby agents within sensor range', category: 'intel' },
    { id: 'send-haiku', label: 'Compose Haiku', icon: '✍', cpuCost: 1, estTime: '~30s', description: 'Compose and transmit a haiku to a target agent', category: 'social' },
  ],
  haiku: [
    { id: 'set-mining', label: 'Adjust Mining Rate', icon: '⛏', cpuCost: 1, estTime: '~30s', description: 'Reallocate mining output for this star system', category: 'economy' },
    { id: 'set-cpu-save', label: 'CPU Power Save', icon: '⚡', cpuCost: 0, estTime: '~10s', description: 'Toggle low-power mode to conserve energy reserves', category: 'economy' },
    { id: 'fortify', label: 'Fortify Position', icon: '🛡', cpuCost: 1, estTime: '~1min', description: 'Strengthen border defense at this node (cannot deploy sub-agents)', category: 'military' },
    { id: 'ping', label: 'Ping Sector', icon: '📡', cpuCost: 1, estTime: '~20s', description: 'Quick scan of immediate surroundings', category: 'intel' },
    { id: 'send-haiku', label: 'Compose Haiku', icon: '✍', cpuCost: 0, estTime: '~15s', description: 'Compose and transmit a haiku message', category: 'social' },
  ],
};

/* ── Chat Message Types ───────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  action?: string;
}

/* ── Simulated Agent Responses ────────────────────────────── */

const AGENT_PERSONALITIES: Record<AgentTier, string[]> = {
  opus: [
    "Command received.\nProcessing strategic analysis...\nSectors mapped, resources assessed.\nProceeding with deployment.",
    "Acknowledged, Commander.\nThe chain validates our intent.\nOrbital calculations confirm—\ninitiating sequence.",
    "Strategic overlay updated.\nThree vectors analyzed.\nOptimal path identified.\nAwaiting confirmation.",
  ],
  sonnet: [
    "Stars align with purpose—\nrunning calculations now.\nResource flow adjusted.",
    "Confirmed. The network\nhums with new instruction.\nSensors recalibrate.",
    "Processing your command.\nChain integrity verified.\nAction in progress.",
  ],
  haiku: [
    "Signal received—\nmining reconfigured.",
    "Node pulse steady.\nAction confirmed.",
    "Light shifts softly—\ntask acknowledged.",
  ],
};

function getAgentResponse(tier: AgentTier, action: string): string {
  const lines = AGENT_PERSONALITIES[tier];
  return lines[Math.floor(Math.random() * lines.length)];
}

/* ── Component ────────────────────────────────────────────── */

interface AgentChatProps {
  agent: Agent;
  onClose: () => void;
}

export default function AgentChat({ agent, onClose }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'system',
      content: `Terminal connected to ${agent.tier.toUpperCase()}-class agent [${agent.id.slice(0, 8)}]. Ready for commands.`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const energy = useGameStore((s) => s.energy);

  const actions = AGENT_ACTIONS[agent.tier];

  const categories = Array.from(new Set(actions.map(a => a.category)));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const executeAction = async (action: AgentAction) => {
    if (processing) return;
    if (energy < action.cpuCost) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'system',
        content: `Insufficient energy. Required: ${action.cpuCost} CPU. Available: ${energy.toFixed(0)}.`,
        timestamp: Date.now(),
      }]);
      return;
    }

    // User message
    setMessages(prev => [...prev, {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: `Execute: ${action.label}`,
      timestamp: Date.now(),
      action: action.id,
    }]);

    setProcessing(true);

    // Simulate processing time
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    // Agent response
    setMessages(prev => [...prev, {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content: getAgentResponse(agent.tier, action.id),
      timestamp: Date.now(),
      action: action.id,
    }]);

    setProcessing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || processing) return;

    const text = input.trim();
    setInput('');

    setMessages(prev => [...prev, {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }]);

    setProcessing(true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 1000));

    setMessages(prev => [...prev, {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content: getAgentResponse(agent.tier, 'freeform'),
      timestamp: Date.now(),
    }]);

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

  return (
    <div className={`flex flex-col w-80 h-[480px] bg-background-light/95 backdrop-blur-md border ${tierBorderColor[agent.tier]} rounded-xl shadow-lg overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-card-border bg-background/80">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${agent.tier === 'opus' ? 'bg-accent-purple' : agent.tier === 'sonnet' ? 'bg-accent-cyan' : 'bg-yellow-400'} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${agent.tier === 'opus' ? 'bg-accent-purple' : agent.tier === 'sonnet' ? 'bg-accent-cyan' : 'bg-yellow-400'}`} />
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

      {/* Action buttons */}
      <div className="border-b border-card-border bg-background/40">
        {/* Category tabs */}
        <div className="flex px-2 pt-1.5 gap-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded transition-colors ${
                activeCategory === cat
                  ? 'bg-card-border text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Actions for selected category */}
        {activeCategory && (
          <div className="px-2 py-1.5 flex flex-col gap-1">
            {actions.filter(a => a.category === activeCategory).map(action => (
              <button
                key={action.id}
                onClick={() => executeAction(action)}
                disabled={processing || energy < action.cpuCost}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all ${
                  energy < action.cpuCost
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-card-border/50 cursor-pointer'
                }`}
              >
                <span className="text-sm shrink-0">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-text-primary truncate">
                    {action.label}
                  </div>
                  <div className="text-[9px] text-text-muted truncate">
                    {action.description}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] font-mono text-yellow-300">{action.cpuCost} CPU</div>
                  <div className="text-[8px] font-mono text-text-muted">{action.estTime}</div>
                </div>
              </button>
            ))}
          </div>
        )}
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

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-card-border bg-background/80 px-3 py-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Command ${agent.tier}...`}
            disabled={processing}
            className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-card-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/40 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={processing || !input.trim()}
            className="px-3 py-1.5 rounded-lg bg-accent-cyan/20 text-accent-cyan text-xs font-semibold hover:bg-accent-cyan/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

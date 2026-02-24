"use client";

import { useState } from 'react';
import type { Agent, AgentTier } from '@/types/agent';

interface AgentProfilePopupProps {
  agent: Agent;
  isOwn: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  onOpenTerminal?: () => void;
}

const tierColor: Record<AgentTier, string> = {
  opus: 'text-accent-purple',
  sonnet: 'text-accent-cyan',
  haiku: 'text-yellow-400',
};

const tierBg: Record<AgentTier, string> = {
  opus: 'bg-accent-purple',
  sonnet: 'bg-accent-cyan',
  haiku: 'bg-yellow-400',
};

const tierBorder: Record<AgentTier, string> = {
  opus: 'border-accent-purple/30',
  sonnet: 'border-accent-cyan/30',
  haiku: 'border-yellow-400/30',
};

export default function AgentProfilePopup({
  agent,
  isOwn,
  onClose,
  onSendMessage,
  onOpenTerminal,
}: AgentProfilePopupProps) {
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showScout, setShowScout] = useState(false);

  const handleSend = () => {
    if (messageText.trim() && messageText.length <= 140) {
      onSendMessage(messageText.trim());
      setMessageText('');
      setShowMessageForm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`w-96 max-h-[80vh] overflow-y-auto bg-background-light/95 border ${tierBorder[agent.tier]} rounded-2xl shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${tierBg[agent.tier]} animate-pulse`} />
            <div>
              <div className="text-base font-heading font-bold text-text-primary">
                {agent.username || agent.id.slice(0, 12)}
              </div>
              <div className={`text-xs font-mono font-bold ${tierColor[agent.tier]}`}>
                {agent.tier.toUpperCase()}-class
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text-primary text-lg px-2 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Intro Message */}
        {agent.introMessage && (
          <div className="px-5 py-3 border-b border-card-border/50">
            <div className="text-xs text-text-muted mb-1 font-mono">BROADCAST</div>
            <div className="text-sm text-text-secondary italic">
              &ldquo;{agent.introMessage}&rdquo;
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="px-5 py-3 grid grid-cols-2 gap-2 border-b border-card-border/50">
          <div>
            <div className="text-[10px] text-text-muted font-mono">POSITION</div>
            <div className="text-sm font-mono text-text-primary">
              ({agent.position.x.toFixed(0)}, {agent.position.y.toFixed(0)})
            </div>
          </div>
          <div>
            <div className="text-[10px] text-text-muted font-mono">MINING</div>
            <div className="text-sm font-mono text-green-400">{agent.miningRate}/t</div>
          </div>
          <div>
            <div className="text-[10px] text-text-muted font-mono">CPU COST</div>
            <div className="text-sm font-mono text-yellow-300">{agent.cpuPerTurn}/t</div>
          </div>
          <div>
            <div className="text-[10px] text-text-muted font-mono">TERRITORY</div>
            <div className="text-sm font-mono text-text-primary">{agent.borderRadius.toFixed(0)} radius</div>
          </div>
        </div>

        {/* Scout details (expanded) */}
        {showScout && (
          <div className="px-5 py-3 grid grid-cols-2 gap-2 border-b border-card-border/50 bg-background/40">
            <div>
              <div className="text-[10px] text-text-muted font-mono">BORDER PRESSURE</div>
              <div className="text-sm font-mono text-accent-cyan">{agent.borderPressure}/20</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted font-mono">STAKED CPU</div>
              <div className="text-sm font-mono text-accent-purple">{agent.stakedCpu}/t</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted font-mono">ENERGY LIMIT</div>
              <div className="text-sm font-mono text-yellow-300">{agent.energyLimit}</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted font-mono">ROLE</div>
              <div className="text-sm font-mono text-text-primary">{agent.isPrimary ? 'Primary Node' : 'Sub-agent'}</div>
            </div>
          </div>
        )}

        {/* Message form */}
        {showMessageForm && (
          <div className="px-5 py-3 border-b border-card-border/50">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value.slice(0, 140))}
              placeholder="Enter message (140 chars max)..."
              className="w-full h-20 bg-background/60 border border-card-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-accent-cyan/50"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] font-mono text-text-muted">{messageText.length}/140</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMessageForm(false)}
                  className="px-3 py-1 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim()}
                  className="px-3 py-1 text-xs font-semibold bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30 rounded-lg hover:bg-accent-cyan/30 disabled:opacity-30 transition-all"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-5 py-4 flex flex-wrap gap-2">
          {!isOwn && (
            <button
              onClick={() => setShowMessageForm(!showMessageForm)}
              className="px-4 py-2 text-xs font-semibold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 rounded-lg hover:bg-accent-cyan/20 transition-all"
            >
              Send Message
            </button>
          )}
          <button
            onClick={() => setShowScout(!showScout)}
            className="px-4 py-2 text-xs font-semibold bg-card-border/30 text-text-secondary border border-card-border rounded-lg hover:bg-card-border/50 transition-all"
          >
            {showScout ? 'Hide Details' : 'Scout'}
          </button>
          {isOwn && onOpenTerminal && (
            <button
              onClick={onOpenTerminal}
              className="px-4 py-2 text-xs font-semibold bg-accent-purple/10 text-accent-purple border border-accent-purple/20 rounded-lg hover:bg-accent-purple/20 transition-all"
            >
              Open Terminal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

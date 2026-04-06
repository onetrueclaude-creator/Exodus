"use client";

import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/store';

const TIER_COLOR: Record<string, string> = {
  opus: 'text-accent-purple',
  sonnet: 'text-accent-cyan',
  haiku: 'text-yellow-400',
};

interface NetworkChatRoomProps {
  onSend: (text: string) => void;
}

export default function NetworkChatRoom({ onSend }: NetworkChatRoomProps) {
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useGameStore((s) => s.haiku);
  const agents = useGameStore((s) => s.agents);
  const currentAgentId = useGameStore((s) => s.currentAgentId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="glass-card px-3 py-2 text-xs font-semibold text-accent-cyan hover:text-text-primary transition-all duration-200 flex items-center gap-1.5 hover:shadow-glow group"
      >
        <span className="text-[11px] opacity-70 group-hover:opacity-100 transition-opacity">{'\u25C8'}</span>
        <span>Network Chat</span>
        {messages.length > 0 && (
          <span className="ml-1 bg-accent-cyan/20 text-accent-cyan text-[9px] px-1.5 py-0.5 rounded-full font-mono">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="glass-card w-72 flex flex-col animate-slide-up" style={{ maxHeight: '320px' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-card-border bg-background/40">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-accent-cyan glow-pulse">{'\u25C8'}</span>
          <span className="text-[11px] font-heading font-semibold text-text-primary tracking-wide">Network Chat</span>
          <span className="text-[9px] text-text-muted font-mono bg-white/[0.03] px-1 rounded">{messages.length}</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-text-muted hover:text-text-primary text-xs transition-colors"
        >
          {'\u25BE'}
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
        style={{ minHeight: '120px', maxHeight: '200px' }}
      >
        {messages.length === 0 ? (
          <div className="text-[10px] text-text-muted text-center py-6 italic">
            No messages yet. Be the first to transmit.
          </div>
        ) : (
          messages.map((msg, idx) => {
            const sender = agents[msg.senderAgentId];
            const senderName = sender?.username || msg.senderAgentId;
            const tierClass = sender ? (TIER_COLOR[sender.tier] || 'text-text-muted') : 'text-text-muted';
            const isOwn = msg.senderAgentId === currentAgentId;

            return (
              <div key={msg.id} className="text-[10px] leading-relaxed animate-fade-in">
                <div className="flex items-center gap-1">
                  <span className={`font-semibold ${isOwn ? 'text-yellow-400' : tierClass}`}>
                    {senderName}
                  </span>
                  <span className="text-text-muted/40">{'\u00B7'}</span>
                  <span className="text-text-muted/50 text-[9px] font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={`whitespace-pre-wrap break-words mt-0.5 pl-0 ${
                  isOwn ? 'text-text-primary' : 'text-text-secondary'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-card-border bg-background/40 px-2 py-1.5 flex gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Encode neural packet..."
          className="flex-1 bg-background/60 border border-card-border rounded-md px-2.5 py-1.5 text-[11px] text-text-primary placeholder:text-text-muted/30 focus:outline-none focus:border-accent-cyan/50 focus:shadow-[0_0_8px_rgba(0,212,255,0.06)] transition-all duration-200"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="px-2.5 py-1.5 rounded-md text-[10px] font-semibold bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/25 hover:border-accent-cyan/40 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
        >
          Send
        </button>
      </div>
    </div>
  );
}

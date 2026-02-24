"use client";

import { useState } from 'react';
import type { Planet } from '@/types';

interface PlanetCreatorProps {
  agentId: string;
  onSubmit: (planet: Omit<Planet, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const CONTENT_TYPES: { type: Planet['contentType']; symbol: string; label: string }[] = [
  { type: 'post', symbol: '\u25A3', label: 'post' },     // ▣
  { type: 'text', symbol: '\u2263', label: 'text' },     // ≣
  { type: 'chat', symbol: '\u25C7', label: 'chat' },     // ◇
  { type: 'prompt', symbol: '\u2318', label: 'prompt' },  // ⌘
];

export default function PlanetCreator({ agentId, onSubmit, onClose }: PlanetCreatorProps) {
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<Planet['contentType']>('post');
  const [isZK, setIsZK] = useState(false);

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit({
      agentId,
      content: content.trim(),
      contentType,
      isZeroKnowledge: isZK,
    });
    setContent('');
    onClose();
  };

  return (
    <div className="glass-card p-4 w-80 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-heading font-semibold text-text-primary tracking-wide">New Data Packet</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">&times;</button>
      </div>

      <div className="flex gap-2 mb-3">
        {CONTENT_TYPES.map(({ type, symbol, label }) => (
          <button
            key={type}
            onClick={() => setContentType(type)}
            className={`text-xs px-2.5 py-1.5 rounded-lg capitalize transition-all duration-200 flex items-center gap-1 ${
              contentType === type
                ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40 shadow-[0_0_8px_rgba(0,212,255,0.1)]'
                : 'text-text-muted border border-card-border hover:border-card-border-hover hover:text-text-secondary'
            }`}
          >
            <span className="text-[10px]">{symbol}</span>
            {label}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="What's in this packet?"
        className="w-full bg-background/60 border border-card-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent-cyan/50 focus:shadow-[0_0_12px_rgba(0,212,255,0.08)] resize-none transition-all duration-200 font-mono text-[12px] leading-relaxed"
      />

      <label className="flex items-center gap-2.5 mt-2.5 text-xs text-text-muted cursor-pointer group">
        <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 text-[10px] ${
          isZK
            ? 'bg-accent-purple/20 border-accent-purple/60 text-accent-purple shadow-[0_0_6px_rgba(139,92,246,0.2)]'
            : 'border-card-border-hover group-hover:border-text-muted/40'
        }`}>
          {isZK ? '\u2713' : ''}
        </span>
        <input
          type="checkbox"
          checked={isZK}
          onChange={(e) => setIsZK(e.target.checked)}
          className="sr-only"
        />
        <span className="group-hover:text-text-secondary transition-colors">
          Zero-Knowledge <span className="text-text-muted/60">(encrypted, hidden from others)</span>
        </span>
      </label>

      <button
        onClick={handleSubmit}
        disabled={!content.trim()}
        className="mt-3 w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed bg-gradient-to-r from-accent-cyan to-accent-purple text-background hover:shadow-glow-lg active:scale-[0.98]"
      >
        Create Data Packet
      </button>
    </div>
  );
}

"use client";

import { useState } from 'react';
import type { Planet } from '@/types';

interface PlanetCreatorProps {
  agentId: string;
  onSubmit: (planet: Omit<Planet, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

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
    <div className="glass-card p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-heading font-semibold text-text-primary">New Planet</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary">&times;</button>
      </div>

      <div className="flex gap-2 mb-3">
        {(['post', 'text', 'chat', 'prompt'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setContentType(type)}
            className={`text-xs px-2 py-1 rounded capitalize ${
              contentType === type
                ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                : 'text-text-muted border border-card-border'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="What's on your mind, commander?"
        className="w-full bg-background/50 border border-card-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent-cyan/50 resize-none"
      />

      <label className="flex items-center gap-2 mt-2 text-xs text-text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={isZK}
          onChange={(e) => setIsZK(e.target.checked)}
          className="accent-accent-purple"
        />
        Zero-Knowledge (encrypted, hidden from others)
      </label>

      <button
        onClick={handleSubmit}
        disabled={!content.trim()}
        className="mt-3 w-full py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-accent-cyan to-accent-purple text-background hover:shadow-glow"
      >
        Create Planet
      </button>
    </div>
  );
}

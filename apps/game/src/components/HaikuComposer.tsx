"use client";

import { useState, useMemo } from 'react';
import { countSyllables, validateHaiku } from '@/lib/syllables';

interface HaikuComposerProps {
  onSubmit: (text: string) => void;
}

export default function HaikuComposer({ onSubmit }: HaikuComposerProps) {
  const [text, setText] = useState('');

  const lines = text.split('\n');
  const syllableCounts = useMemo(() => {
    return [
      countSyllables(lines[0] || ''),
      countSyllables(lines[1] || ''),
      countSyllables(lines[2] || ''),
    ];
  }, [text]);

  const targets = [5, 7, 5];
  const validation = validateHaiku(text);

  const handleSubmit = () => {
    if (!validation.valid) return;
    onSubmit(text);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && validation.valid) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="glass-card p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-heading font-semibold text-text-primary">Compose Haiku</h3>
        <span className="text-xs text-text-muted">5 · 7 · 5</span>
      </div>

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          placeholder={"First line five syllables\nSecond line seven syllables\nThird line five again"}
          className="w-full bg-background/50 border border-card-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent-cyan/50 resize-none font-mono"
        />

        {/* Syllable counter overlay */}
        <div className="absolute right-2 top-2 flex flex-col gap-1 text-xs font-mono">
          {targets.map((target, i) => {
            const count = syllableCounts[i];
            const isCorrect = count === target;
            return (
              <span
                key={i}
                className={isCorrect ? 'text-accent-cyan' : 'text-text-muted'}
              >
                {count}/{target}
              </span>
            );
          })}
        </div>
      </div>

      {validation.error && text.includes('\n') && (
        <p className="text-xs text-red-400 mt-1">{validation.error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!validation.valid}
        className="mt-3 w-full py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-accent-cyan to-accent-purple text-background hover:shadow-glow"
      >
        Send Haiku
      </button>
    </div>
  );
}

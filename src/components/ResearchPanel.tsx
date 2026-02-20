"use client";

import { useState } from 'react';
import {
  RESEARCH_TREES,
  getAvailableResearch,
  calculateResearchProgress,
  type ResearchCategory,
} from '@/lib/research';
import type { ResearchProgress } from '@/types/research';

interface ResearchPanelProps {
  energy: number;
  progress: Record<string, ResearchProgress>;
  completedIds: string[];
  onAllocateEnergy: (researchId: string, amount: number) => void;
  onClose?: () => void;
}

const CATEGORY_COLORS: Record<ResearchCategory, string> = {
  security: 'text-red-400',
  infrastructure: 'text-yellow-400',
  social: 'text-green-400',
  diplomacy: 'text-blue-400',
};

export default function ResearchPanel({
  energy,
  progress,
  completedIds,
  onAllocateEnergy,
  onClose,
}: ResearchPanelProps) {
  const [activeCategory, setActiveCategory] = useState<ResearchCategory>('security');

  const available = getAvailableResearch(activeCategory, completedIds);

  return (
    <div className={onClose ? "glass-card p-5 w-96 max-h-[80vh] overflow-y-auto" : "flex-1 overflow-y-auto p-6"}>
      <div className={onClose ? "" : "max-w-4xl mx-auto"}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-heading font-semibold text-text-primary">Research</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-accent-cyan font-mono">Energy: {energy}</span>
          {onClose && (
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">&times;</button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {(Object.keys(RESEARCH_TREES) as ResearchCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-1 text-xs py-2 rounded capitalize font-semibold transition-all ${
              activeCategory === cat
                ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30'
                : 'text-text-muted border border-card-border hover:border-card-border-hover'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {available.length === 0 && (
          <p className="text-xs text-text-muted italic">All research in this category completed!</p>
        )}
        {available.map((item) => {
          const prog = progress[item.id];
          const invested = prog?.energyInvested ?? 0;
          const pct = calculateResearchProgress(invested, item.energyCost);

          return (
            <div key={item.id} className="glass-card p-3">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${CATEGORY_COLORS[item.category]}`}>
                  Tier {item.tier}
                </span>
                <span className="text-xs text-text-muted">{invested}/{item.energyCost} Energy</span>
              </div>
              <h4 className="text-sm font-heading text-text-primary">{item.name}</h4>
              <p className="text-xs text-text-muted mt-1">{item.description}</p>
              <p className="text-xs text-accent-cyan mt-1">Effect: {item.effect}</p>

              <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-cyan to-accent-purple transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <button
                onClick={() => onAllocateEnergy(item.id, 10)}
                disabled={energy < 10}
                className="mt-2 text-xs px-3 py-1 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Allocate +10 Energy
              </button>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

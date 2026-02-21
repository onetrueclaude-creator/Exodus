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

const CATEGORY_SYMBOLS: Record<ResearchCategory, string> = {
  security: '\u25A0',       // filled square
  infrastructure: '\u25C6', // diamond
  social: '\u25C7',         // hollow diamond
  diplomacy: '\u25CB',      // circle
};

const CATEGORY_BG: Record<ResearchCategory, string> = {
  security: 'bg-red-400/10 border-red-400/20',
  infrastructure: 'bg-yellow-400/10 border-yellow-400/20',
  social: 'bg-green-400/10 border-green-400/20',
  diplomacy: 'bg-blue-400/10 border-blue-400/20',
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
    <div className={onClose ? "glass-card p-5 w-96 max-h-[80vh] overflow-y-auto animate-slide-up" : "flex-1 overflow-y-auto p-6"}>
      <div className={onClose ? "" : "max-w-4xl mx-auto"}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-accent-cyan text-sm">{'\u2261'}</span>
          <h3 className="text-sm font-heading font-semibold text-text-primary tracking-wide">Research</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-accent-cyan font-mono bg-accent-cyan/10 px-2 py-0.5 rounded-full border border-accent-cyan/20">
            {'\u26A1'} {energy} Energy
          </span>
          {onClose && (
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">&times;</button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-5">
        {(Object.keys(RESEARCH_TREES) as ResearchCategory[]).map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 text-xs py-2.5 rounded-lg capitalize font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                isActive
                  ? `${CATEGORY_BG[cat]} border`
                  : 'text-text-muted border border-card-border hover:border-card-border-hover hover:bg-white/[0.02]'
              }`}
            >
              <span className={`text-[10px] ${isActive ? CATEGORY_COLORS[cat] : 'text-text-muted'}`}>
                {CATEGORY_SYMBOLS[cat]}
              </span>
              <span className={isActive ? CATEGORY_COLORS[cat] : ''}>{cat}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {available.length === 0 && (
          <div className="text-center py-8">
            <span className="text-2xl text-text-muted/30 block mb-2">{'\u2713'}</span>
            <p className="text-xs text-text-muted italic">All research in this category completed!</p>
          </div>
        )}
        {available.map((item) => {
          const prog = progress[item.id];
          const invested = prog?.energyInvested ?? 0;
          const pct = calculateResearchProgress(invested, item.energyCost);

          return (
            <div key={item.id} className="glass-card p-4 hover:bg-white/[0.04] transition-colors group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] ${CATEGORY_COLORS[item.category]}`}>{CATEGORY_SYMBOLS[item.category]}</span>
                  <span className={`text-[10px] font-heading font-semibold ${CATEGORY_COLORS[item.category]}`}>
                    Tier {item.tier}
                  </span>
                </div>
                <span className="text-[10px] text-text-muted font-mono">{invested}/{item.energyCost} E</span>
              </div>
              <h4 className="text-sm font-heading text-text-primary mb-1">{item.name}</h4>
              <p className="text-xs text-text-muted leading-relaxed">{item.description}</p>
              <p className="text-xs text-accent-cyan mt-1.5 flex items-center gap-1">
                <span className="text-[9px]">{'\u25B7'}</span>
                {item.effect}
              </p>

              {/* Progress bar */}
              <div className="mt-3 progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] font-mono text-text-muted/50">{pct}%</span>
              </div>

              <button
                onClick={() => onAllocateEnergy(item.id, 10)}
                disabled={energy < 10}
                className="mt-2.5 text-xs px-3 py-1.5 rounded-lg bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/20 hover:border-accent-cyan/30 hover:shadow-glow disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
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

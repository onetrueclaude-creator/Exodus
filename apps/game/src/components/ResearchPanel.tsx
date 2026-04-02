"use client";

import { useState } from 'react';
import {
  RESEARCH_TREES,
  getAvailableResearch,
  calculateResearchProgress,
  type ResearchCategory,
} from '@/lib/research';
import { useGameStore } from '@/store/gameStore';

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

const CATEGORY_BORDER: Record<ResearchCategory, string> = {
  security: 'border-red-400/30',
  infrastructure: 'border-yellow-400/30',
  social: 'border-green-400/30',
  diplomacy: 'border-blue-400/30',
};

export default function ResearchPanel() {
  const [activeCategory, setActiveCategory] = useState<ResearchCategory>('security');
  const energy = useGameStore((s) => s.energy);
  const progress = useGameStore((s) => s.researchProgress);
  const completedIds = useGameStore((s) => s.completedResearch);
  const allocateResearchEnergy = useGameStore((s) => s.allocateResearchEnergy);

  const available = getAvailableResearch(activeCategory, completedIds);
  const completedInCategory = RESEARCH_TREES[activeCategory].filter((item) =>
    completedIds.includes(item.id)
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-accent-cyan text-sm">{'\u2261'}</span>
            <h3 className="text-sm font-heading font-semibold text-text-primary tracking-wide">Research</h3>
          </div>
          <span className="text-[10px] text-accent-cyan font-mono bg-accent-cyan/10 px-2 py-0.5 rounded-full border border-accent-cyan/20">
            {'\u26A1'} {energy} Energy
          </span>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-5">
          {(Object.keys(RESEARCH_TREES) as ResearchCategory[]).map((cat) => {
            const isActive = activeCategory === cat;
            const catCompleted = RESEARCH_TREES[cat].filter((r) => completedIds.includes(r.id)).length;
            const catTotal = RESEARCH_TREES[cat].length;
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
                <span className={`text-[9px] ml-1 ${isActive ? 'text-text-muted' : 'text-text-muted/50'}`}>
                  {catCompleted}/{catTotal}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tech tree visualization */}
        <div className="space-y-2">
          {RESEARCH_TREES[activeCategory].map((item, idx) => {
            const prog = progress[item.id];
            const invested = prog?.energyInvested ?? 0;
            const pct = calculateResearchProgress(invested, item.energyCost);
            const isCompleted = completedIds.includes(item.id);
            const isAvailable = available.some((a) => a.id === item.id);
            const isLocked = !isAvailable && !isCompleted;

            return (
              <div key={item.id}>
                {/* Dependency edge connector */}
                {idx > 0 && (
                  <div className="flex justify-center py-1">
                    <div className={`w-px h-4 ${
                      completedIds.includes(RESEARCH_TREES[activeCategory][idx - 1].id)
                        ? CATEGORY_COLORS[activeCategory].replace('text-', 'bg-')
                        : 'bg-card-border'
                    }`} />
                  </div>
                )}

                <div className={`glass-card p-4 transition-all duration-200 relative ${
                  isCompleted
                    ? `${CATEGORY_BG[activeCategory]} border ${CATEGORY_BORDER[activeCategory]}`
                    : isLocked
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-white/[0.04]'
                }`}>
                  {/* Tier badge + status */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${CATEGORY_COLORS[item.category]}`}>
                        {CATEGORY_SYMBOLS[item.category]}
                      </span>
                      <span className={`text-[10px] font-heading font-semibold ${CATEGORY_COLORS[item.category]}`}>
                        Tier {item.tier}
                      </span>
                      {isCompleted && (
                        <span className="text-[9px] bg-green-400/10 text-green-400 px-1.5 py-0.5 rounded-full border border-green-400/20">
                          {'\u2713'} Completed
                        </span>
                      )}
                      {isLocked && (
                        <span className="text-[9px] bg-white/5 text-text-muted px-1.5 py-0.5 rounded-full border border-card-border">
                          {'\u26BF'} Locked
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted font-mono">
                      {invested}/{item.energyCost} E
                    </span>
                  </div>

                  {/* Name + description */}
                  <h4 className="text-sm font-heading text-text-primary mb-1">{item.name}</h4>
                  <p className="text-xs text-text-muted leading-relaxed">{item.description}</p>
                  <p className="text-xs text-accent-cyan mt-1.5 flex items-center gap-1">
                    <span className="text-[9px]">{'\u25B7'}</span>
                    {item.effect}
                  </p>

                  {/* Prerequisites hint for locked items */}
                  {isLocked && item.prerequisiteIds.length > 0 && (
                    <p className="text-[9px] text-text-muted/60 mt-1.5 font-mono">
                      Requires: {item.prerequisiteIds.map((id) => {
                        const prereq = Object.values(RESEARCH_TREES).flat().find((r) => r.id === id);
                        return prereq?.name ?? id;
                      }).join(', ')}
                    </p>
                  )}

                  {/* Progress bar */}
                  {!isCompleted && (
                    <>
                      <div className="mt-3 progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] font-mono text-text-muted/50">{pct}%</span>
                      </div>
                    </>
                  )}

                  {/* Allocate button */}
                  {isAvailable && !isCompleted && (
                    <button
                      onClick={() => allocateResearchEnergy(item.id, 10)}
                      disabled={energy < 10}
                      className="mt-2.5 text-xs px-3 py-1.5 rounded-lg bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/20 hover:border-accent-cyan/30 hover:shadow-glow disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                    >
                      Allocate +10 Energy
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completed section */}
        {completedInCategory.length > 0 && (
          <div className="mt-6 pt-4 border-t border-card-border">
            <p className="text-[10px] text-text-muted/50 font-mono mb-2 tracking-wider">
              COMPLETED ({completedInCategory.length}/{RESEARCH_TREES[activeCategory].length})
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

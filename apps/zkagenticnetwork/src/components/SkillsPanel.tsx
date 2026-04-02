"use client";

import { useState } from 'react';
import {
  SKILL_TREES,
  getSkillsWithStatus,
  type SkillCategory,
} from '@/lib/skills';
import { useGameStore } from '@/store/gameStore';
import type { AgentTier } from '@/types';

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  mining: 'text-yellow-400',
  communication: 'text-cyan-400',
  defense: 'text-red-400',
  expansion: 'text-purple-400',
};

const CATEGORY_SYMBOLS: Record<SkillCategory, string> = {
  mining: '\u26CF',     // pick
  communication: '\u2637', // trigram
  defense: '\u2694',    // swords
  expansion: '\u2726',  // star
};

const CATEGORY_BG: Record<SkillCategory, string> = {
  mining: 'bg-yellow-400/10 border-yellow-400/20',
  communication: 'bg-cyan-400/10 border-cyan-400/20',
  defense: 'bg-red-400/10 border-red-400/20',
  expansion: 'bg-purple-400/10 border-purple-400/20',
};

const TIER_LABELS: Record<AgentTier, { label: string; color: string }> = {
  haiku: { label: 'Haiku', color: 'text-amber-400' },
  sonnet: { label: 'Sonnet', color: 'text-cyan-400' },
  opus: { label: 'Opus', color: 'text-purple-400' },
};

export default function SkillsPanel() {
  const [activeCategory, setActiveCategory] = useState<SkillCategory>('mining');
  const maxDeployTier = useGameStore((s) => s.maxDeployTier);
  const completedResearch = useGameStore((s) => s.completedResearch);
  const unlockedSkills = useGameStore((s) => s.unlockedSkills);
  const unlockSkill = useGameStore((s) => s.unlockSkill);

  const skills = getSkillsWithStatus(
    activeCategory,
    maxDeployTier,
    completedResearch,
    unlockedSkills,
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-accent-cyan text-sm">{'\u2726'}</span>
            <h3 className="text-sm font-heading font-semibold text-text-primary tracking-wide">Skills</h3>
          </div>
          <span className="text-[10px] text-text-muted font-mono bg-white/5 px-2 py-0.5 rounded-full border border-card-border">
            Agent Tier: <span className={TIER_LABELS[maxDeployTier].color}>{TIER_LABELS[maxDeployTier].label}</span>
          </span>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-5">
          {(Object.keys(SKILL_TREES) as SkillCategory[]).map((cat) => {
            const isActive = activeCategory === cat;
            const catUnlocked = SKILL_TREES[cat].filter((s) => unlockedSkills.includes(s.id)).length;
            const catTotal = SKILL_TREES[cat].length;
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
                  {catUnlocked}/{catTotal}
                </span>
              </button>
            );
          })}
        </div>

        {/* Skills grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {skills.map((skill) => {
            const tierInfo = TIER_LABELS[skill.tierRequired];
            return (
              <div
                key={skill.id}
                className={`glass-card p-4 transition-all duration-200 flex flex-col ${
                  skill.unlocked
                    ? `${CATEGORY_BG[skill.category]} border`
                    : skill.available
                      ? 'hover:bg-white/[0.04] cursor-pointer'
                      : 'opacity-40'
                }`}
              >
                {/* Tier badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono font-semibold ${tierInfo.color}`}>
                    {tierInfo.label}
                  </span>
                  {skill.unlocked && (
                    <span className="text-[9px] bg-green-400/10 text-green-400 px-1.5 py-0.5 rounded-full border border-green-400/20">
                      {'\u2713'} Active
                    </span>
                  )}
                  {!skill.available && !skill.unlocked && (
                    <span className="text-[9px] bg-white/5 text-text-muted px-1.5 py-0.5 rounded-full border border-card-border">
                      {'\u26BF'}
                    </span>
                  )}
                </div>

                {/* Skill info */}
                <h4 className="text-sm font-heading text-text-primary mb-1">{skill.name}</h4>
                <p className="text-xs text-text-muted leading-relaxed flex-1">{skill.description}</p>
                <p className="text-xs text-accent-cyan mt-2 flex items-center gap-1">
                  <span className="text-[9px]">{'\u25B7'}</span>
                  {skill.effect}
                </p>

                {/* Research prereqs */}
                {skill.prerequisiteResearchIds.length > 0 && !skill.available && (
                  <p className="text-[9px] text-text-muted/60 mt-2 font-mono">
                    Requires research: {skill.prerequisiteResearchIds.join(', ')}
                  </p>
                )}

                {/* Unlock button */}
                {skill.available && !skill.unlocked && (
                  <button
                    onClick={() => unlockSkill(skill.id)}
                    className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 hover:bg-accent-cyan/20 hover:border-accent-cyan/30 hover:shadow-glow transition-all duration-200 font-semibold"
                  >
                    Unlock Skill
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Tier upgrade hint */}
        {maxDeployTier !== 'opus' && (
          <div className="mt-6 glass-card p-4 border border-card-border">
            <p className="text-xs text-text-muted">
              <span className="text-accent-cyan">{'\u2191'}</span>{' '}
              Upgrade your subscription tier to unlock higher-tier skills.
              {maxDeployTier === 'haiku' && ' Sonnet and Opus skills require Professional or Max tier.'}
              {maxDeployTier === 'sonnet' && ' Opus skills require Max tier.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

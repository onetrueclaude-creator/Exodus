"use client";

import { useGameStore } from '@/store';
import type { GameTab } from '@/store/gameStore';

const TAB_ICONS: Record<GameTab, string> = {
  network: '\u25C8',    // ◈ diamond
  account: '\u2302',    // ⌂ house
  researches: '\u2261', // ≡ trigram
  skills: '\u2726',     // ✦ star
};

const TABS: { id: GameTab; label: string }[] = [
  { id: 'network', label: 'Network' },
  { id: 'account', label: 'Account View' },
  { id: 'researches', label: 'Researches' },
  { id: 'skills', label: 'Skills' },
];

export default function TabNavigation() {
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);

  return (
    <div className="h-10 bg-background/80 backdrop-blur-sm border-b border-card-border flex items-center px-4 gap-0.5 shrink-0">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 focus-ring-cyan rounded-t ${
              isActive
                ? 'text-accent-cyan'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`text-[11px] ${isActive ? 'text-accent-cyan' : 'text-text-muted'} transition-colors duration-200`}>
                {TAB_ICONS[tab.id]}
              </span>
              <span className="uppercase tracking-wider text-[10px]">{tab.label}</span>
            </span>
            {/* Active indicator line with glow */}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent-cyan rounded-full shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
            )}
            {/* Hover indicator for inactive tabs */}
            {!isActive && (
              <span className="absolute bottom-0 left-3 right-3 h-[1px] bg-transparent group-hover:bg-text-muted/20 transition-colors" />
            )}
          </button>
        );
      })}
      {/* Subtle gradient line at the end of tabs */}
      <div className="flex-1" />
      <div className="text-[9px] font-mono text-text-muted/40 tracking-widest pr-1">
        SYS.OK
      </div>
    </div>
  );
}

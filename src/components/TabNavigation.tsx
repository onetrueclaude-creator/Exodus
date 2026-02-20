"use client";

import { useGameStore } from '@/store';
import type { GameTab } from '@/store/gameStore';

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
    <div className="h-9 bg-background border-b border-card-border flex items-center px-4 gap-1 shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-1.5 text-xs font-semibold rounded-t transition-all ${
            activeTab === tab.id
              ? 'text-accent-cyan bg-accent-cyan/10 border-b-2 border-accent-cyan'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

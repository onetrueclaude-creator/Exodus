"use client";

import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/store';
import type { DockPanelId } from '@/store/gameStore';
import GalaxyChatRoom from '@/components/GalaxyChatRoom';
import AgentChat from '@/components/AgentChat';
import TimechainStats from '@/components/TimechainStats';
import TimeRewind from '@/components/TimeRewind';
import type { Agent } from '@/types';
import type { ChainService } from '@/services/chainService';

interface DockPanelProps {
  onHaikuSubmit: (text: string) => void;
  currentAgent: Agent | null;
  chainService: ChainService | null;
  onAgentDeploy: (newId: string) => void;
  onFocusNode: (nodeId: string) => void;
  deployTargetForTerminal?: string | null;
  serverStartTime: number;
  onTimeChange: (ts: number) => void;
}

const DOCK_ITEMS: { id: DockPanelId; icon: string; label: string }[] = [
  { id: 'chat',       icon: '\u25C8', label: 'Network Chat' },
  { id: 'terminal',   icon: '\u25A3', label: 'Agent Terminal' },
  { id: 'deploy',     icon: '\u26A1', label: 'Deploy Agent' },
  { id: 'stats',      icon: '\u25EB', label: 'Chain Stats' },
  { id: 'timeRewind', icon: '\u25F7', label: 'Time Rewind' },
];

export default function DockPanel({
  onHaikuSubmit,
  currentAgent,
  chainService,
  onAgentDeploy,
  onFocusNode,
  deployTargetForTerminal,
  serverStartTime,
  onTimeChange,
}: DockPanelProps) {
  const activeDockPanel = useGameStore((s) => s.activeDockPanel);
  const setActiveDockPanel = useGameStore((s) => s.setActiveDockPanel);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveDockPanel(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActiveDockPanel]);

  const renderPanel = useCallback(() => {
    switch (activeDockPanel) {
      case 'chat':
        return <GalaxyChatRoom onSend={onHaikuSubmit} />;
      case 'terminal':
      case 'deploy':
        return currentAgent ? (
          <AgentChat
            agent={currentAgent}
            chainService={chainService}
            onClose={() => setActiveDockPanel(null)}
            onDeploy={onAgentDeploy}
            onFocusNode={onFocusNode}
            initialDeployTarget={deployTargetForTerminal ?? undefined}
          />
        ) : (
          <div className="p-4 text-text-muted text-xs font-mono">
            No agent selected. Claim a node first.
          </div>
        );
      case 'stats':
        return <TimechainStats />;
      case 'timeRewind':
        return (
          <TimeRewind
            serverStartTime={serverStartTime}
            currentTime={Date.now()}
            onTimeChange={onTimeChange}
            alwaysExpanded
          />
        );
      default:
        return null;
    }
  }, [activeDockPanel, onHaikuSubmit, currentAgent, chainService, onAgentDeploy, onFocusNode, deployTargetForTerminal, serverStartTime, onTimeChange, setActiveDockPanel]);

  return (
    <>
      {/* Dock Rail */}
      <div className="absolute right-0 top-0 bottom-8 w-10 z-30 flex flex-col items-center pt-2 gap-1 bg-background/40 backdrop-blur-sm border-l border-card-border">
        {DOCK_ITEMS.map((item) => {
          const isActive = activeDockPanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveDockPanel(item.id)}
              className={`group relative dock-icon ${isActive ? 'dock-icon-active' : ''}`}
              aria-label={item.label}
            >
              <span className={`text-base leading-none font-mono transition-all duration-150 ${
                isActive
                  ? 'text-accent-cyan drop-shadow-[0_0_6px_rgba(0,212,255,0.4)]'
                  : 'text-text-muted group-hover:text-text-secondary'
              }`}>
                {item.icon}
              </span>
              {/* Tooltip */}
              <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] font-mono bg-background-light border border-card-border text-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                {item.label}
              </span>
              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-accent-cyan/60 animate-fade-in" />
              )}
            </button>
          );
        })}
      </div>

      {/* Floating Panel */}
      {activeDockPanel && (
        <div className="absolute right-12 top-2 bottom-10 z-25 w-80 max-h-[70vh] glass-panel-floating animate-slide-left overflow-y-auto overflow-x-hidden flex flex-col">
          <div className="relative z-10 flex-1 min-h-0">
            {renderPanel()}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import GalaxyGrid from '@/components/GalaxyGrid';
import GalaxyChatRoom from '@/components/GalaxyChatRoom';
import AgentPanel from '@/components/AgentPanel';
import AgentDropdown from '@/components/AgentDropdown';
import QuickActionMenu from '@/components/QuickActionMenu';
import ResourceBar from '@/components/ResourceBar';
import TabNavigation from '@/components/TabNavigation';
import AccountView from '@/components/AccountView';
import ResearchPanel from '@/components/ResearchPanel';
import SkillsPanel from '@/components/SkillsPanel';
import PlanetCreator from '@/components/PlanetCreator';
import AgentCreator from '@/components/AgentCreator';
import TimeRewind from '@/components/TimeRewind';
import AgentChat from '@/components/AgentChat';
import { useGameStore } from '@/store';
import { MockChainService } from '@/services/chainService';
import type { ChainService } from '@/services/chainService';
import { TestnetChainService } from '@/services/testnetChainService';
import { isTestnetOnline } from '@/services/testnetApi';
import { getDistance } from '@/lib/proximity';
import { getFogLevel } from '@/lib/fog';
import { getClarityLevel } from '@/lib/diplomacy';
import type { AgentTier } from '@/types';

/** Block time on chain — refresh grid every 60 seconds to sync with ledger */
const CHAIN_SYNC_INTERVAL_MS = 60_000;

export default function GamePage() {
  const addAgent = useGameStore((s) => s.addAgent);
  const addHaiku = useGameStore((s) => s.addHaiku);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const activeTab = useGameStore((s) => s.activeTab);
  const agents = useGameStore((s) => s.agents);
  const energy = useGameStore((s) => s.energy);
  const addPlanet = useGameStore((s) => s.addPlanet);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const createAgent = useGameStore((s) => s.createAgent);
  const startTurnTimer = useGameStore((s) => s.startTurnTimer);
  const stopTurnTimer = useGameStore((s) => s.stopTurnTimer);
  const setChainMode = useGameStore((s) => s.setChainMode);

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showPlanetCreator, setShowPlanetCreator] = useState(false);
  const [showAgentCreator, setShowAgentCreator] = useState(false);
  /** Set of agent IDs with open terminal windows */
  const [openTerminals, setOpenTerminals] = useState<Set<string>>(new Set());
  /** Which terminal is focused (rendered on top) */
  const [focusedTerminal, setFocusedTerminal] = useState<string | null>(null);
  const [serverStartTime] = useState(() => Date.now() - 24 * 60 * 60 * 1000);
  const chainRef = useRef<ChainService | null>(null);

  const openTerminal = useCallback((agentId: string) => {
    setOpenTerminals(prev => new Set(prev).add(agentId));
    setFocusedTerminal(agentId);
  }, []);

  const closeTerminal = useCallback((agentId: string) => {
    setOpenTerminals(prev => {
      const next = new Set(prev);
      next.delete(agentId);
      return next;
    });
    setFocusedTerminal(prev => prev === agentId ? null : prev);
  }, []);

  /** Sync grid state from the chain service */
  const syncFromChain = useCallback(async () => {
    const svc = chainRef.current;
    if (!svc) return;
    const freshAgents = await svc.getAgents();
    // Merge chain agents into store (preserves local modifications like pressure/mining)
    const store = useGameStore.getState();
    freshAgents.forEach((a) => {
      const existing = store.agents[a.id];
      if (existing && existing.userId) {
        // Owned agent already in store — keep local CPU distribution settings
        return;
      }
      store.addAgent(a);
    });
  }, []);

  useEffect(() => {
    async function init() {
      // Try testnet API first, fall back to mock
      const online = await isTestnetOnline();
      const service: ChainService = online
        ? new TestnetChainService()
        : new MockChainService();
      chainRef.current = service;
      setChainMode(online ? 'testnet' : 'mock', 0);

      const agentList = await service.getAgents();
      agentList.forEach(addAgent);

      const feed = await service.getHaikuFeed();
      feed.forEach(addHaiku);

      if (agentList.length > 0) {
        const firstOwned = agentList.find(a => a.userId !== '');
        if (firstOwned) {
          setCurrentUser(firstOwned.userId, firstOwned.id);
          // Auto-open terminal for the primary agent
          const primary = agentList.find(a => a.isPrimary && a.userId === firstOwned.userId);
          openTerminal(primary?.id ?? firstOwned.id);
        }
      }
    }
    init();

    // Start the turn timer (ticks every 10 seconds)
    startTurnTimer();

    // Chain sync — refresh grid from ledger every block time (60s)
    const syncInterval = setInterval(() => {
      syncFromChain();
    }, CHAIN_SYNC_INTERVAL_MS);

    return () => {
      stopTurnTimer();
      clearInterval(syncInterval);
    };
  }, []);

  const handleHaikuSubmit = async (text: string) => {
    if (!currentAgentId || !chainRef.current) return;
    const haiku = await chainRef.current.postHaiku(currentAgentId, text);
    addHaiku(haiku);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'inspect':
        // Already showing AgentPanel
        break;
      case 'chat':
        // Galaxy chat is always visible — no action needed
        break;
      case 'deploy-via-terminal':
        // Open the current agent's terminal — the deploy flow starts there
        if (currentAgentId) openTerminal(currentAgentId);
        break;
      case 'research':
        setActiveTab('researches');
        break;
      case 'manage':
        setActiveTab('account');
        break;
      case 'terminal':
        if (selectedAgent) openTerminal(selectedAgent);
        break;
      case 'secure':
      case 'vote':
        // TODO: Wire up blockchain actions
        break;
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-background">
      {/* Resource bar — always visible at top */}
      <ResourceBar />

      {/* Tab navigation */}
      <TabNavigation />

      {/* Tab content area — fills remaining space */}
      <div className="flex-1 relative overflow-hidden">
        {/* Network tab — always mounted, hidden when inactive to preserve PixiJS canvas */}
        <div className={`absolute inset-0 ${activeTab !== 'network' ? 'hidden' : ''}`}>
            <GalaxyGrid onSelectAgent={setSelectedAgent} />

            {/* Top bar: Time rewind + Agents dropdown */}
            <div className="absolute top-4 left-4 z-10 flex items-start gap-2">
              <TimeRewind
                serverStartTime={serverStartTime}
                currentTime={Date.now()}
                onTimeChange={(ts) => {
                  // TODO: Load historical state for this timestamp
                }}
              />
              <AgentDropdown onSelectAgent={setSelectedAgent} />
            </div>

            {/* Agent Chat terminals — stacked horizontally from bottom-right */}
            {Array.from(openTerminals).map((id, idx) => agents[id] && (
              <div
                key={id}
                className="absolute bottom-4 z-30 transition-all"
                style={{ right: `${16 + idx * 336}px` }}
                onMouseDown={() => setFocusedTerminal(id)}
              >
                <div style={{ zIndex: focusedTerminal === id ? 40 : 30 }}>
                  <AgentChat
                    agent={agents[id]}
                    onClose={() => closeTerminal(id)}
                    onDeploy={(newId) => openTerminal(newId)}
                    chainService={chainRef.current}
                  />
                </div>
              </div>
            ))}

            {/* Galaxy Chat Room — shifts left to make room for terminals */}
            <div className={`absolute bottom-4 z-10 transition-all`} style={{ right: `${16 + openTerminals.size * 336}px` }}>
              <GalaxyChatRoom onSend={handleHaikuSubmit} />
            </div>

            {/* Bottom left controls: Agent creator + Planet creator */}
            <div className="absolute bottom-14 left-4 z-10 flex flex-col gap-2">
              {/* Agent Creator */}
              {showAgentCreator ? (
                <AgentCreator
                  energy={energy}
                  onCreateAgent={(tier) => {
                    // Place new agent near the player's current agent with some random offset
                    const viewer = currentAgentId ? agents[currentAgentId] : null;
                    if (!viewer) return;
                    const offset = { x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200 };
                    const position = { x: viewer.position.x + offset.x, y: viewer.position.y + offset.y };
                    const newId = createAgent(tier, position);
                    if (newId) {
                      setShowAgentCreator(false);
                      setSelectedAgent(newId);
                    }
                  }}
                  onClose={() => setShowAgentCreator(false)}
                />
              ) : (
                <button
                  onClick={() => setShowAgentCreator(true)}
                  className="glass-card px-4 py-2 text-xs font-semibold text-accent-cyan hover:text-text-primary transition-all"
                >
                  + Agent
                </button>
              )}

              {/* Planet Creator */}
              {showPlanetCreator && currentAgentId ? (
                <PlanetCreator
                  agentId={currentAgentId}
                  onSubmit={(planetData) => {
                    addPlanet({
                      ...planetData,
                      id: `planet-${Date.now()}`,
                      createdAt: Date.now(),
                    });
                  }}
                  onClose={() => setShowPlanetCreator(false)}
                />
              ) : (
                <button
                  onClick={() => setShowPlanetCreator(true)}
                  className="glass-card px-4 py-2 text-xs font-semibold text-accent-purple hover:text-text-primary transition-all"
                >
                  + Planet
                </button>
              )}
            </div>

            {/* Left sidebar — Stellaris-style persistent selection panel */}
            {selectedAgent && agents[selectedAgent] && (() => {
              const selected = agents[selectedAgent];
              const viewer = currentAgentId ? agents[currentAgentId] : null;
              const isOwn = currentUserId ? selected.userId === currentUserId : false;
              const distance = viewer ? getDistance(viewer.position, selected.position) : 0;
              const fogLevel = viewer ? getFogLevel(distance, viewer.tier) : 'clear' as const;
              const dipKey = viewer ? [viewer.id, selected.id].sort().join('-') : '';
              const dipState = useGameStore.getState().diplomacy[dipKey];
              const clarity = dipState ? getClarityLevel(dipState.exchangeCount) : (isOwn ? 4 : 0);
              return (
                <div className="absolute top-0 left-0 bottom-0 z-20 w-60 bg-background-light/95 border-r border-card-border overflow-y-auto flex flex-col gap-0">
                  <QuickActionMenu
                    agent={selected}
                    isOwn={isOwn}
                    onClose={() => setSelectedAgent(null)}
                    onAction={handleQuickAction}
                  />
                  <AgentPanel
                    agent={selected}
                    fogLevel={fogLevel}
                    clarityLevel={clarity}
                    onClose={() => setSelectedAgent(null)}
                  />
                </div>
              );
            })()}
        </div>

        {/* Account View tab */}
        {activeTab === 'account' && <AccountView />}

        {/* Researches tab */}
        {activeTab === 'researches' && (
          <ResearchPanel
            energy={energy}
            progress={{}}
            completedIds={[]}
            onAllocateEnergy={(id, amount) => {
              // TODO: Wire up research energy allocation
            }}
          />
        )}

        {/* Skills tab */}
        {activeTab === 'skills' && <SkillsPanel />}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
import AgentProfilePopup from '@/components/AgentProfilePopup';
import TimechainStats from '@/components/TimechainStats';
import { startDebugListener } from '@/lib/debugListener';
import { persistResources } from '@/lib/persistResources';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Planet } from '@/types/agent';
import { useGameStore } from '@/store';
import { MockChainService } from '@/services/chainService';
import type { ChainService } from '@/services/chainService';
import { TestnetChainService } from '@/services/testnetChainService';
import { isTestnetOnline } from '@/services/testnetApi';
import { useGameRealtime } from '@/hooks/useGameRealtime';
import { getDistance } from '@/lib/proximity';
import { getFogLevel } from '@/lib/fog';
import { getClarityLevel } from '@/lib/diplomacy';
import type { AgentTier, SubscriptionTier } from '@/types';
import { pickBestStartingNode } from '@/lib/placement';
import { visualToChain } from '@/services/testnetChainService';

/** Map subscription tier to empire border color */
const SUBSCRIPTION_EMPIRE_COLOR: Record<SubscriptionTier, number> = {
  COMMUNITY: 0xf59e0b,   // yellow-amber
  PROFESSIONAL: 0x00d4ff, // cyan
  MAX: 0x8b5cf6,          // purple
};

/** Block time on chain — refresh grid every 60 seconds to sync with ledger */
const CHAIN_SYNC_INTERVAL_MS = 60_000;

export default function GamePage() {
  const addHaiku = useGameStore((s) => s.addHaiku);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const activeTab = useGameStore((s) => s.activeTab);
  const agents = useGameStore((s) => s.agents);
  const energy = useGameStore((s) => s.energy);
  const minerals = useGameStore((s) => s.minerals);
  const addPlanet = useGameStore((s) => s.addPlanet);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const createAgent = useGameStore((s) => s.createAgent);
  const startTurnTimer = useGameStore((s) => s.startTurnTimer);
  const stopTurnTimer = useGameStore((s) => s.stopTurnTimer);
  const setChainMode = useGameStore((s) => s.setChainMode);
  const isInitializing = useGameStore((s) => s.isInitializing);
  const setInitializing = useGameStore((s) => s.setInitializing);
  const chainMode = useGameStore((s) => s.chainMode);

  const { isReady } = useGameRealtime();

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [profileAgent, setProfileAgent] = useState<string | null>(null);
  const [showPlanetCreator, setShowPlanetCreator] = useState(false);
  const [showAgentCreator, setShowAgentCreator] = useState(false);
  /** Set of agent IDs with open terminal windows */
  const [openTerminals, setOpenTerminals] = useState<Set<string>>(new Set());
  /** Which terminal is focused (rendered on top) */
  const [focusedTerminal, setFocusedTerminal] = useState<string | null>(null);
  /** When deploying via sidebar, pass the target node ID to the terminal */
  const [deployTargetForTerminal, setDeployTargetForTerminal] = useState<string | null>(null);
  const [serverStartTime] = useState(() => Date.now() - 24 * 60 * 60 * 1000);

  /** Unclaimed neural nodes sorted by proximity to current agent */
  const nearbyUnclaimedNodes = useMemo(() => {
    const viewer = currentAgentId ? agents[currentAgentId] : null;
    if (!viewer) return [];
    return Object.values(agents)
      .filter(a => !a.userId)
      .map(a => ({
        id: a.id,
        x: a.position.x,
        y: a.position.y,
        dist: getDistance(viewer.position, a.position),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);
  }, [agents, currentAgentId]);
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

    // Refresh agents
    const freshAgents = await svc.getAgents();
    const store = useGameStore.getState();
    freshAgents.forEach((a) => {
      const existing = store.agents[a.id];
      if (existing && existing.userId) {
        // Owned agent already in store — keep local CPU distribution settings
        return;
      }
      store.addAgent(a);
    });

    // Refresh chain status
    if ('getStatus' in svc) {
      try {
        const status = await (svc as { getStatus(): Promise<import('@/types').TestnetStatus> }).getStatus();
        store.setChainStatus({
          poolRemaining: status.community_pool_remaining,
          totalMined: status.total_mined,
          stateRoot: status.state_root,
          nextBlockIn: status.next_block_in,
          blocks: status.blocks_processed,
        });
      } catch {
        // Status fetch failed — keep stale data
      }
    }
  }, []);

  useEffect(() => {
    // Activate debug listener — logs all store mutations to /api/debug-log
    startDebugListener();

    async function init() {
      setInitializing(true);

      // Try testnet API first, fall back to mock
      const online = await isTestnetOnline();
      const service: ChainService = online
        ? new TestnetChainService()
        : new MockChainService();
      chainRef.current = service;
      setChainMode(online ? 'testnet' : 'mock', 0);

      const feed = await service.getHaikuFeed();
      feed.forEach(addHaiku);

      // Read agents from the Zustand store snapshot. Note: useGameRealtime's
      // hydrate() runs concurrently and may not have completed yet — agentList
      // could be empty on fast networks. If so, Realtime patches will fill it
      // in shortly after, and a re-render will pick up the owned agent.
      const agentList = Object.values(useGameStore.getState().agents);

      const firstOwned = agentList.find(a => a.userId !== '');
      if (firstOwned) {
        setCurrentUser(firstOwned.userId, firstOwned.id);

        // Hydrate planets and haiku from Supabase
        const supabase = createBrowserClient();
        const { data: planets } = await supabase
          .from('planets')
          .select('*')
          .eq('user_id', firstOwned.userId);

        // Use direct setState to bypass persistPlanet/persistHaiku side-effects —
        // rows were just fetched from Supabase, re-inserting them would cause duplicate-key errors.
        planets?.forEach(p => {
          useGameStore.setState(s => ({
            planets: {
              ...s.planets,
              [p.id]: {
                id: p.id,
                agentId: p.agent_id ?? '',
                content: p.content,
                contentType: p.content_type as Planet['contentType'],
                isZeroKnowledge: p.is_zero_knowledge,
                createdAt: new Date(p.created_at).getTime(),
              }
            }
          }))
        });

        const { data: haikus } = await supabase
          .from('haiku_messages')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50);

        haikus?.forEach(h => {
          useGameStore.setState(s => ({
            haiku: [
              ...s.haiku,
              {
                id: h.id,
                senderAgentId: h.sender_agent_id ?? '',
                text: h.text,
                syllables: h.syllables as [number, number, number],
                position: { x: h.position_x, y: h.position_y },
                timestamp: h.timestamp,
              }
            ]
          }))
        });

        // Auto-open terminal for the primary agent
        const primary = agentList.find(a => a.isPrimary && a.userId === firstOwned.userId);
        const homenode = primary ?? firstOwned;
        openTerminal(homenode.id);
        // Center camera on homenode
        useGameStore.getState().setCamera(homenode.position, 2);
      } else {
        // New user — generate an ID and auto-select the best starting node
        const newUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        useGameStore.setState({ currentUserId: newUserId });

        // Smart placement: find the best starting node and focus camera on it
        const store = useGameStore.getState();
        const bestNode = pickBestStartingNode(store.agents);
        if (bestNode) {
          setSelectedAgent(bestNode.id);
          store.setCamera(bestNode.position, 2); // zoom in on recommended node
        }
      }

      setInitializing(false);
    }
    init();

    // Start the turn timer (ticks every 10 seconds)
    startTurnTimer();

    return () => {
      stopTurnTimer();
    };
  }, []);

  // Expose store to Playwright in dev mode
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__gameStore = useGameStore
    }
  }, [])

  const handleHaikuSubmit = async (text: string) => {
    if (!currentAgentId || !chainRef.current) return;
    const haiku = await chainRef.current.postHaiku(currentAgentId, text);
    addHaiku(haiku);
  };

  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'inspect':
        // Already showing AgentPanel
        break;
      case 'chat':
        // Galaxy chat is always visible — no action needed
        break;
      case 'deploy-via-terminal':
        // Open the current agent's terminal with the selected node as deploy target
        if (currentAgentId) {
          setDeployTargetForTerminal(selectedAgent);
          openTerminal(currentAgentId);
        }
        break;
      case 'claim-homenode': {
        // First-time user: claim an unclaimed node as their Homenode (primary agent)
        if (!selectedAgent) break;
        const store = useGameStore.getState();
        const slot = store.agents[selectedAgent];
        if (!slot) break;

        // Register on-chain first, then update local state
        const svc = chainRef.current;
        if (svc) {
          try {
            const chainCoord = visualToChain(slot.position.x, slot.position.y);
            await svc.claimNode(chainCoord.x, chainCoord.y, 200);
          } catch (err) {
            console.error('Failed to claim node on-chain:', err);
            break;
          }
        }

        const success = store.claimNode(selectedAgent, 'opus');
        if (success) {
          store.setPrimary(selectedAgent);
          // Set empire color based on homenode tier (subscription-aware once auth wired)
          store.setEmpireColor(SUBSCRIPTION_EMPIRE_COLOR.MAX); // Default: opus homenode = Max tier
          openTerminal(selectedAgent);
          setSelectedAgent(null);
          // Center camera on claimed homenode
          store.setCamera(slot.position, 2);
          // Sync from chain to get updated state
          syncFromChain();
          // Persist updated resources to Supabase after claim action
          const afterClaim = useGameStore.getState();
          if (afterClaim.currentUserId) {
            persistResources(afterClaim.currentUserId, {
              energy: afterClaim.energy,
              minerals: afterClaim.minerals,
              agntc_balance: afterClaim.agntcBalance,
              secured_chains: afterClaim.securedChains,
              turn: afterClaim.turn,
            })
          }
        }
        break;
      }
      case 'research':
        setActiveTab('researches');
        break;
      case 'manage':
        setActiveTab('account');
        break;
      case 'terminal':
        if (selectedAgent) openTerminal(selectedAgent);
        break;
      case 'profile':
        if (selectedAgent) setProfileAgent(selectedAgent);
        break;
      case 'mine': {
        const svc = chainRef.current;
        if (!svc || !('mine' in svc)) break;
        try {
          const result = await (svc as { mine(): Promise<{ blockNumber: number; yields: Record<string, number> }> }).mine();
          // Update block count (preserve current mode)
          const store = useGameStore.getState();
          store.setChainMode(store.chainMode, result.blockNumber);
          // Trigger full sync to get updated agents/status
          syncFromChain();
          // Persist updated resources to Supabase after mine action
          if (store.currentUserId) {
            persistResources(store.currentUserId, {
              energy: store.energy,
              minerals: store.minerals,
              agntc_balance: store.agntcBalance,
              secured_chains: store.securedChains,
              turn: store.turn,
            })
          }
        } catch {
          // Rate-limited (429) or other error — display will be handled by ResourceBar countdown
        }
        break;
      }
      case 'secure':
        // CPU staking is the security mechanism — open terminal for staking controls
        if (selectedAgent) openTerminal(selectedAgent);
        break;
      case 'vote':
        // Governance voting — open profile for now (full voting with mainnet)
        if (selectedAgent) setProfileAgent(selectedAgent);
        break;
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-background">
      {/* Loading overlay */}
      {(isInitializing || !isReady) && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
          <div className="w-4 h-4 rounded-full bg-accent-cyan animate-ping mb-6" />
          <div className="text-lg font-heading text-text-primary mb-2">
            Connecting to Agentic Chain
          </div>
          <div className="text-sm text-text-muted font-mono">
            Establishing ledger sync...
          </div>
        </div>
      )}

      {/* Resource bar — always visible at top */}
      <ResourceBar />

      {/* Tab navigation */}
      <TabNavigation />

      {/* Tab content area — fills remaining space */}
      <div className="flex-1 relative overflow-hidden">
        {/* Network tab — always mounted, hidden when inactive to preserve PixiJS canvas */}
        <div className={`absolute inset-0 ${activeTab !== 'network' ? 'hidden' : ''}`}>
            <GalaxyGrid onSelectAgent={setSelectedAgent} onDeselect={() => setSelectedAgent(null)} />

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

            {/* Timechain Stats — top-right */}
            <TimechainStats />

            {/* Agent Chat terminals — stacked horizontally from bottom-right */}
            {Array.from(openTerminals).map((id, idx) => agents[id] && (
              <div
                key={id}
                className="absolute bottom-4 z-30 transition-all"
                style={{ right: `${16 + idx * 396}px` }}
                onMouseDown={() => setFocusedTerminal(id)}
              >
                <div style={{ zIndex: focusedTerminal === id ? 40 : 30 }}>
                  <AgentChat
                    agent={agents[id]}
                    onClose={() => { closeTerminal(id); setDeployTargetForTerminal(null); }}
                    onDeploy={(newId) => { setDeployTargetForTerminal(null); openTerminal(newId); }}
                    onFocusNode={(nodeId) => {
                      const node = agents[nodeId];
                      if (node) {
                        setSelectedAgent(nodeId);
                        useGameStore.getState().setCamera(node.position, 2);
                      }
                    }}
                    chainService={chainRef.current}
                    initialDeployTarget={id === currentAgentId ? deployTargetForTerminal ?? undefined : undefined}
                  />
                </div>
              </div>
            ))}

            {/* Galaxy Chat Room — shifts left to make room for terminals */}
            <div className={`absolute bottom-4 z-10 transition-all`} style={{ right: `${16 + openTerminals.size * 396}px` }}>
              <GalaxyChatRoom onSend={handleHaikuSubmit} />
            </div>

            {/* Bottom left controls: Agent creator + Planet creator */}
            <div className="absolute bottom-14 left-4 z-10 flex flex-col gap-2">
              {/* Agent Creator — only show if current agent can deploy (not haiku) */}
              {currentAgentId && agents[currentAgentId]?.tier !== 'haiku' && (
                showAgentCreator ? (
                  <AgentCreator
                    currentAgentTier={agents[currentAgentId]?.tier ?? 'sonnet'}
                    energy={energy}
                    minerals={minerals}
                    unclaimedNodes={nearbyUnclaimedNodes}
                    onClaimNode={async (slotId, tier) => {
                      const parentId = currentAgentId || undefined;
                      const store = useGameStore.getState();
                      const slot = store.agents[slotId];

                      // Register on-chain first
                      const svc = chainRef.current;
                      if (svc && slot) {
                        try {
                          const chainCoord = visualToChain(slot.position.x, slot.position.y);
                          await svc.claimNode(chainCoord.x, chainCoord.y, 200);
                        } catch (err) {
                          console.error('Failed to claim node on-chain:', err);
                          return;
                        }
                      }

                      const success = store.claimNode(slotId, tier, parentId);
                      if (success) {
                        setShowAgentCreator(false);
                        setSelectedAgent(slotId);
                        syncFromChain();
                        // Persist updated resources to Supabase after deploy action
                        const afterDeploy = useGameStore.getState();
                        if (afterDeploy.currentUserId) {
                          persistResources(afterDeploy.currentUserId, {
                            energy: afterDeploy.energy,
                            minerals: afterDeploy.minerals,
                            agntc_balance: afterDeploy.agntcBalance,
                            secured_chains: afterDeploy.securedChains,
                            turn: afterDeploy.turn,
                          })
                        }
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
                )
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
                  + Data Packet
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
              // Own agents: full clarity (4). Unclaimed nodes: public info (1). Foreign: hidden until diplomacy.
              const clarity = dipState ? getClarityLevel(dipState.exchangeCount) : (isOwn ? 4 : (!selected.userId ? 1 : 0));
              return (
                <div className="absolute top-0 left-0 bottom-0 z-20 w-72 bg-background-light/95 border-r border-card-border overflow-y-auto flex flex-col gap-0">
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

      {/* Agent Profile Popup */}
      {profileAgent && agents[profileAgent] && (
        <AgentProfilePopup
          agent={agents[profileAgent]}
          isOwn={currentUserId ? agents[profileAgent].userId === currentUserId : false}
          onClose={() => setProfileAgent(null)}
          onSendMessage={async (text) => {
            const svc = chainRef.current;
            const sender = currentAgentId ? agents[currentAgentId] : null;
            const target = agents[profileAgent];
            if (svc && sender && target) {
              try {
                await svc.sendMessage(sender.position, target.position, text);
              } catch {
                // Silently fall through — message shown in UI regardless
              }
            }
            setProfileAgent(null);
          }}
          onOpenTerminal={() => {
            openTerminal(profileAgent);
            setProfileAgent(null);
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import GalaxyGrid from '@/components/GalaxyGrid';
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
import AgentProfilePopup from '@/components/AgentProfilePopup';
import DockPanel from '@/components/DockPanel';
import { AgentList } from '@/components/game/AgentList';
import { startDebugListener } from '@/lib/debugListener';
import { persistResources } from '@/lib/persistResources';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import type { Planet } from '@/types/agent';
import { useGameStore } from '@/store';
import { MockChainService } from '@/services/chainService';
import type { ChainService } from '@/services/chainService';
import { TestnetChainService } from '@/services/testnetChainService';
import { isTestnetOnline } from '@/services/testnetApi';
import { useGameRealtime } from '@/hooks/useGameRealtime';
import { useTestnetWebSocket } from '@/hooks/useTestnetWebSocket';
import { getDistance } from '@/lib/proximity';
import { getFogLevel } from '@/lib/fog';
import { getClarityLevel } from '@/lib/diplomacy';
import type { AgentTier, SubscriptionTier } from '@/types';
import { computeFactionSpawnPoint } from '@/lib/factionPlacement';
import { visualToChain } from '@/services/testnetChainService';

/** Map subscription tier to empire border color */
const SUBSCRIPTION_EMPIRE_COLOR: Record<SubscriptionTier, number> = {
  COMMUNITY: 0x0d9488,   // teal
  PROFESSIONAL: 0x3b82f6, // blue
  MAX: 0x8b5cf6,          // purple
};

/** Map subscription tier to spiral galaxy faction arm */
const SUBSCRIPTION_FACTION: Record<SubscriptionTier, string> = {
  COMMUNITY: 'community',        // N arm — teal (free/open)
  PROFESSIONAL: 'professional',  // W arm — blue (matches professional theme)
  MAX: 'founders',               // S arm — purple (wealth/max tier)
};

/** Map subscription tier to max deployable agent tier */
const SUBSCRIPTION_MAX_TIER: Record<SubscriptionTier, AgentTier> = {
  COMMUNITY: 'haiku',
  PROFESSIONAL: 'opus',
  MAX: 'opus',
};

/** Block time on chain — refresh grid every 60 seconds to sync with ledger */
const CHAIN_SYNC_INTERVAL_MS = 60_000;

export default function GamePage() {
  const addHaiku = useGameStore((s) => s.addHaiku);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const activeTab = useGameStore((s) => s.activeTab);
  const agents = useGameStore((s) => s.agents);
  const energy = useGameStore((s) => s.cpuTokens);
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
  useTestnetWebSocket();

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [profileAgent, setProfileAgent] = useState<string | null>(null);
  const [showPlanetCreator, setShowPlanetCreator] = useState(false);
  const [showAgentCreator, setShowAgentCreator] = useState(false);
  const setActiveDockPanel = useGameStore((s) => s.setActiveDockPanel);
  const switchAgent = useGameStore((s) => s.switchAgent);
  const activeDockPanel = useGameStore((s) => s.activeDockPanel);
  /** When deploying via sidebar, pass the target node ID to the terminal */
  const [deployTargetForTerminal, setDeployTargetForTerminal] = useState<string | null>(null);
  /** Active agent in the AgentList panel (tracks currentAgentId for switching) */
  const [listActiveAgentId, setListActiveAgentId] = useState<string | null>(null);

  // Clear deploy target when the terminal panel is closed without completing a deploy
  useEffect(() => {
    if (activeDockPanel !== 'terminal') {
      setDeployTargetForTerminal(null);
    }
  }, [activeDockPanel]);
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
  /** Owned agents mapped to AgentList shape — drives the multi-agent switcher panel */
  const ownedAgentsList = useMemo(() => {
    if (!currentUserId) return [];
    return Object.values(agents)
      .filter(a => a.userId === currentUserId && !a.id.startsWith('chain-'))
      .map(a => ({
        id: a.id,
        name: a.username ?? a.id.slice(-6),
        coordinate: { x: a.position.x, y: a.position.y },
        status: (a.id === currentAgentId ? 'active' : 'idle') as 'active' | 'idle',
      }));
  }, [agents, currentUserId, currentAgentId]);
  const chainRef = useRef<ChainService | null>(null);

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

      const isDev = process.env.NODE_ENV === 'development';

      if (isDev) {
        // Dev mode: skip auth — go straight to Founders faction, MAX tier
        const store = useGameStore.getState();
        store.setUserFaction('founders');
        store.setEmpireColor(SUBSCRIPTION_EMPIRE_COLOR.MAX);
        store.setMaxDeployTier(SUBSCRIPTION_MAX_TIER.MAX);
      } else {
        // Production: check subscription — redirect to /subscribe if not yet chosen
        try {
          const statusRes = await fetch('/api/user/status');
          if (statusRes.ok) {
            const userStatus = await statusRes.json() as { subscription: SubscriptionTier | null };
            if (!userStatus.subscription) {
              window.location.href = '/subscribe';
              return;
            }
            // Apply faction, empire color, and max deploy tier from subscription
            const tier = userStatus.subscription;
            const store = useGameStore.getState();
            store.setUserFaction(SUBSCRIPTION_FACTION[tier]);
            store.setEmpireColor(SUBSCRIPTION_EMPIRE_COLOR[tier]);
            store.setMaxDeployTier(SUBSCRIPTION_MAX_TIER[tier]);
          }
        } catch {
          // /api/user/status returned 401 (unauthenticated) or network error — continue with defaults
        }
      }

      // Try testnet API first, fall back to mock
      const online = await isTestnetOnline();
      const service: ChainService = online
        ? new TestnetChainService()
        : new MockChainService();
      chainRef.current = service;
      setChainMode(online ? 'testnet' : 'mock', 0);

      const feed = await service.getHaikuFeed();
      feed.forEach(addHaiku);

      // Populate grid with all agents from the chain service (genesis + claimed nodes).
      // This runs before the owned-agent check below so computeFactionSpawnPoint has
      // nodes to work with even when Supabase is unreachable.
      await syncFromChain();

      // Read agents from the Zustand store snapshot. Note: useGameRealtime's
      // hydrate() runs concurrently and may not have completed yet — agentList
      // could be empty on fast networks. If so, Realtime patches will fill it
      // in shortly after, and a re-render will pick up the owned agent.
      const agentList = Object.values(useGameStore.getState().agents);

      // Blockchain agents from syncFromChain() use 'chain-*' IDs and have
      // their blockchain owner address as userId. Exclude them here — only
      // Supabase-hydrated session agents represent the authenticated user.
      const firstOwned = agentList.find(a => a.userId !== '' && !a.id.startsWith('chain-'));
      if (firstOwned) {
        setCurrentUser(firstOwned.userId, firstOwned.id);

        // Hydrate planets and haiku from Supabase
        const supabase = createBrowserClient();
        type PlanetRow = Database['public']['Tables']['planets']['Row']
        const { data: planets } = await supabase
          .from('planets')
          .select('*')
          .eq('user_id', firstOwned.userId) as unknown as { data: PlanetRow[] | null }

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

        type HaikuRow = Database['public']['Tables']['haiku_messages']['Row']
        const { data: haikus } = await supabase
          .from('haiku_messages')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50) as unknown as { data: HaikuRow[] | null }

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
        setActiveDockPanel('terminal');
        // Center camera on homenode
        useGameStore.getState().setCamera(homenode.position, 2);
      } else {
        // New user — generate ID, compute faction spawn point, claim on-chain
        const newUserId = isDev
          ? `dev-founder-${Date.now()}`
          : `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        useGameStore.setState({ currentUserId: newUserId });

        const store = useGameStore.getState();
        const userFaction = store.userFaction || 'community';
        // Map legacy faction names to new Faction type
        const factionName = (userFaction === 'free_community' ? 'community'
          : userFaction === 'professional_pool' ? 'professional'
          : userFaction === 'treasury' ? 'founders'
          : userFaction) as 'community' | 'machines' | 'founders' | 'professional';

        const spawnCoord = computeFactionSpawnPoint(factionName, Object.values(store.agents));

        // Register on-chain
        const svc = chainRef.current;
        if (svc) {
          try {
            await svc.claimNode(spawnCoord.x, spawnCoord.y, 200);
          } catch (err) {
            console.error('Failed to auto-claim spawn point:', err);
          }
        }

        // Refresh from chain to get the new node
        await syncFromChain();

        // Find our newly claimed node and set as homenode
        const afterSync = useGameStore.getState();
        const spawnedNode = Object.values(afterSync.agents).find(
          a => a.position.x === spawnCoord.x && a.position.y === spawnCoord.y
        );
        if (spawnedNode) {
          afterSync.claimNode(spawnedNode.id, isDev ? 'opus' : 'sonnet');
          afterSync.setPrimary(spawnedNode.id);
          setCurrentUser(newUserId, spawnedNode.id);
          afterSync.setCamera(spawnCoord, 2);
          setActiveDockPanel('terminal');
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
          setActiveDockPanel('terminal');
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
          setActiveDockPanel('terminal');
          setSelectedAgent(null);
          // Center camera on claimed homenode
          store.setCamera(slot.position, 2);
          // Sync from chain to get updated state
          syncFromChain();
          // Persist updated resources to Supabase after claim action
          const afterClaim = useGameStore.getState();
          if (afterClaim.currentUserId) {
            persistResources(afterClaim.currentUserId, {
              energy: afterClaim.cpuTokens,
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
        if (selectedAgent) setActiveDockPanel('terminal');
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
              energy: store.cpuTokens,
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
        if (selectedAgent) setActiveDockPanel('terminal');
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

            {/* Top bar: Agents dropdown only (TimeRewind moved to dock) */}
            <div className="absolute top-4 left-4 z-10 flex items-start gap-2">
              <AgentDropdown onSelectAgent={setSelectedAgent} />
            </div>

            {/* Agent switcher panel — top-right, above dock, only when user has agents */}
            {ownedAgentsList.length > 0 && (
              <div className="absolute top-4 right-12 z-20 w-56 bg-background-light/90 border border-card-border rounded backdrop-blur-sm max-h-64 overflow-y-auto">
                <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-card-border">
                  Your Agents
                </div>
                <AgentList
                  agents={ownedAgentsList}
                  activeAgentId={listActiveAgentId ?? currentAgentId}
                  onSelect={(id) => {
                    setListActiveAgentId(id);
                    switchAgent(id);
                    setActiveDockPanel('terminal');
                  }}
                />
              </div>
            )}

            {/* Dock Panel — right edge */}
            <DockPanel
              onHaikuSubmit={handleHaikuSubmit}
              currentAgent={currentAgentId ? agents[currentAgentId] ?? null : null}
              chainService={chainRef.current}
              onAgentDeploy={(newId) => { switchAgent(newId); setDeployTargetForTerminal(null); setActiveDockPanel('terminal'); }}
              onFocusNode={(nodeId) => {
                const node = agents[nodeId];
                if (node) {
                  setSelectedAgent(nodeId);
                  useGameStore.getState().requestFocus(nodeId);
                }
              }}
              deployTargetForTerminal={deployTargetForTerminal}
              serverStartTime={serverStartTime}
              onTimeChange={() => {/* TODO: Load historical state */}}
            />

            {/* Bottom bar — compact action strip */}
            <div className="absolute bottom-0 left-0 right-10 h-8 z-10 flex items-center px-3 gap-3 bg-background/40 backdrop-blur-sm border-t border-card-border">
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
                            energy: afterDeploy.cpuTokens,
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
                    className="text-[10px] font-semibold text-accent-cyan hover:text-text-primary transition-all"
                  >
                    + Agent
                  </button>
                )
              )}
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
                  className="text-[10px] font-semibold text-accent-purple hover:text-text-primary transition-all"
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
            setActiveDockPanel('terminal');
            setProfileAgent(null);
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import LatticeGrid from "@/components/LatticeGrid";
import AgentPanel from "@/components/AgentPanel";
import AgentDropdown from "@/components/AgentDropdown";
import QuickActionMenu from "@/components/QuickActionMenu";
import ResourceBar from "@/components/ResourceBar";
import TabNavigation from "@/components/TabNavigation";
import AccountView from "@/components/AccountView";
import ResearchPanel from "@/components/ResearchPanel";
import SkillsPanel from "@/components/SkillsPanel";
import AgentProfilePopup from "@/components/AgentProfilePopup";
import DockPanel from "@/components/DockPanel";
import { startDebugListener } from "@/lib/debugListener";
import DebugOverlay from "@/components/DebugOverlay";
import { useGameStore } from "@/store";
import { MockChainService } from "@/services/chainService";
import type { ChainService } from "@/services/chainService";
import { TestnetChainService } from "@/services/testnetChainService";
import { isTestnetOnline, getSettings, getRewards } from "@/services/testnetApi";
import { useChainWebSocket } from "@/hooks/useChainWebSocket";
import { getDistance } from "@/lib/proximity";
import { getFogLevel } from "@/lib/fog";
import { getClarityLevel } from "@/lib/diplomacy";
import type { SubscriptionTier } from "@/types";
import type { FactionId } from "@/types";
import { SUBSCRIPTION_PLANS } from "@/types/subscription";
import { getFrontierBlocknode } from "@/lib/lattice";
import { visualToChain } from "@/services/testnetChainService";

/** Map subscription tier to empire border color — matches faction blocknode colors */
const SUBSCRIPTION_EMPIRE_COLOR: Record<SubscriptionTier, number> = {
  COMMUNITY: 0xffffff, // white — community faction
  PROFESSIONAL: 0x00ffff, // cyan — pro-max faction
};

/** Map subscription tier to faction arm */
const SUBSCRIPTION_FACTION: Record<SubscriptionTier, FactionId | null> = {
  COMMUNITY: "community",
  PROFESSIONAL: "pro-max",
};

/** Dev-only faction colors — for factions not available to players */
const DEV_FACTION_COLOR: Record<FactionId, number> = {
  community: 0xffffff,
  "pro-max": 0x00ffff,
  founder: 0xf59e0b, // amber
  treasury: 0xdc2680, // pink (Machines)
};

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
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const currentUserId = useGameStore((s) => s.currentUserId);
  const startTurnTimer = useGameStore((s) => s.startTurnTimer);
  const stopTurnTimer = useGameStore((s) => s.stopTurnTimer);
  const setChainMode = useGameStore((s) => s.setChainMode);
  const isInitializing = useGameStore((s) => s.isInitializing);
  const setInitializing = useGameStore((s) => s.setInitializing);
  const initLattice = useGameStore((s) => s.initLattice);
  const claimBlocknode = useGameStore((s) => s.claimBlocknode);
  const setCurrentUserFaction = useGameStore((s) => s.setCurrentUserFaction);
  const revealFaction = useGameStore((s) => s.revealFaction);
  const chainMode = useGameStore((s) => s.chainMode);

  // Connect WebSocket when in testnet mode
  useChainWebSocket(chainMode === "testnet");

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [profileAgent, setProfileAgent] = useState<string | null>(null);
  const setActiveDockPanel = useGameStore((s) => s.setActiveDockPanel);
  const switchAgent = useGameStore((s) => s.switchAgent);
  const activeDockPanel = useGameStore((s) => s.activeDockPanel);
  /** When deploying via sidebar, pass the target node ID to the terminal */
  const [deployTargetForTerminal, setDeployTargetForTerminal] = useState<string | null>(null);

  // Clear deploy target when the terminal panel is closed without completing a deploy
  useEffect(() => {
    if (activeDockPanel !== "terminal") {
      setDeployTargetForTerminal(null);
    }
  }, [activeDockPanel]);
  const [serverStartTime] = useState(() => Date.now() - 24 * 60 * 60 * 1000);

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
    if ("getStatus" in svc) {
      try {
        const status = await (
          svc as { getStatus(): Promise<import("@/types").TestnetStatus> }
        ).getStatus();
        // Capture prev count BEFORE setChainStatus updates totalBlocksMined
        const prevBlocknodeMined = store.totalBlocksMined;
        store.setChainStatus({
          poolRemaining: status.circulating_supply,
          totalMined: status.total_mined,
          stateRoot: status.state_root,
          nextBlockIn: status.next_block_in,
          blocks: status.blocks_processed,
          epochRing: status.epoch_ring,
          hardness: status.hardness,
        });
        // Expand network if new blocks were mined since last sync
        if (status.blocks_processed > prevBlocknodeMined) {
          for (let b = prevBlocknodeMined; b < status.blocks_processed; b++) {
            store.addBlocknodesForBlock(b);
          }
        }
      } catch {
        // Status fetch failed — keep stale data
      }
    }

    // Sync wallet state (secured chains, rates, effective stake)
    try {
      const [settings, rewards] = await Promise.all([
        getSettings(0),  // wallet 0 for testnet
        getRewards(0),
      ]);
      store.setWalletState({
        securedChains: settings.total_secured_chains,
        securingRate: settings.securing_rate,
        miningRate: settings.mining_rate,
        effectiveStake: settings.effective_stake,
      });
    } catch {
      // Wallet sync failed — keep stale data
    }
  }, []);

  useEffect(() => {
    // Activate debug listener — logs all store mutations to /api/debug-log (dev only)
    if (process.env.NODE_ENV === "development") startDebugListener();

    async function init() {
      setInitializing(true);

      // Try testnet API first, fall back to mock
      const online = await isTestnetOnline();
      const service: ChainService = online ? new TestnetChainService() : new MockChainService();
      chainRef.current = service;
      setChainMode(online ? "testnet" : "mock", 0);

      // Initialize Neural Lattice — start with genesis block only; grid expands with each block cycle
      initLattice(1);

      // Dev seed: pre-claim Treasury and Founder genesis nodes for dev/test purposes.
      // visibleFactions is NOT updated by claimBlocknode — controlled explicitly via revealFaction below.
      claimBlocknode("block-0-treasury", "dev-treasury");
      claimBlocknode("block-0-founder", "dev-founder");

      const agentList = await service.getAgents();
      agentList.forEach(addAgent);

      const feed = await service.getHaikuFeed();
      feed.forEach(addHaiku);

      // In dev mode, always treat the local user as new so dev_tier selection applies.
      // Mock agents represent other users in the network, not the current player.
      const isDev = process.env.NODE_ENV === "development";
      const firstOwned = isDev ? null : agentList.find((a) => a.userId !== "");
      if (firstOwned) {
        setCurrentUser(firstOwned.userId, firstOwned.id);
        // Auto-open terminal for the primary agent
        const primary = agentList.find((a) => a.isPrimary && a.userId === firstOwned.userId);
        const homenode = primary ?? firstOwned;
        setActiveDockPanel("terminal");
        // Center camera on homenode
        useGameStore.getState().setCamera(homenode.position, 2);
      } else {
        // New user — read dev-selected tier + faction (dev mode) or default to COMMUNITY
        const devTierRaw = typeof window !== "undefined" ? localStorage.getItem("dev_tier") : null;
        const devFactionRaw = typeof window !== "undefined" ? localStorage.getItem("dev_faction") : null;
        const devTier = (devTierRaw as SubscriptionTier | null) ?? "COMMUNITY";
        const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === devTier) ?? SUBSCRIPTION_PLANS[0];

        // Dev faction override — allows testing founder/treasury factions regardless of tier
        const devFaction = (devFactionRaw as FactionId | null);

        const newUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newUserFaction: FactionId = devFaction ?? SUBSCRIPTION_FACTION[devTier] ?? "community";
        useGameStore.setState({
          currentUserId: newUserId,
          energy: plan.startEnergy,
          agntcBalance: plan.startAgntc + 1, // +1 genesis airdrop
          minerals: plan.startMinerals,
          empireColor: DEV_FACTION_COLOR[newUserFaction],
        });
        setCurrentUser(newUserId, "");
        // Claim homenode FIRST while currentUserFaction is still null (init/dev-seed mode).
        // claimBlocknode requires faction === null to assign arm nodes — this is intentional:
        // arm nodes are faction infrastructure, not user territory. The claim here marks the
        // ring-0 node as the user's "Homenode" starting reference. setCurrentUserFaction is
        // called AFTER so future arm-node claim attempts are blocked for regular users.
        const freshStore = useGameStore.getState();
        const frontierNode = getFrontierBlocknode(newUserFaction, freshStore.blocknodes);
        if (frontierNode) {
          claimBlocknode(frontierNode.id, newUserId);
          useGameStore.getState().requestFocus(frontierNode.id);
        }
        setCurrentUserFaction(newUserFaction);
        revealFaction(newUserFaction);
      }

      setInitializing(false);
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

  const handleQuickAction = async (action: string) => {
    switch (action) {
      case "inspect":
        // Already showing AgentPanel
        break;
      case "chat":
        // Network chat is always visible — no action needed
        break;
      case "deploy-via-terminal":
        // Open the current agent's terminal with the selected node as deploy target
        if (currentAgentId) {
          setDeployTargetForTerminal(selectedAgent);
          setActiveDockPanel("terminal");
        }
        break;
      case "claim-homenode": {
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
            console.error("Failed to claim node on-chain:", err);
            break;
          }
        }

        const success = store.claimNode(selectedAgent, "opus");
        if (success) {
          store.setPrimary(selectedAgent);
          // Set empire color based on homenode tier (subscription-aware once auth wired)
          store.setEmpireColor(SUBSCRIPTION_EMPIRE_COLOR.COMMUNITY);
          setActiveDockPanel("terminal");
          setSelectedAgent(null);
          // Center camera on claimed homenode
          store.setCamera(slot.position, 2);
          // Sync from chain to get updated state
          syncFromChain();
        }
        break;
      }
      case "research":
        setActiveTab("researches");
        break;
      case "manage":
        setActiveTab("account");
        break;
      case "terminal":
        if (selectedAgent) setActiveDockPanel("terminal");
        break;
      case "profile":
        if (selectedAgent) setProfileAgent(selectedAgent);
        break;
      case "mine": {
        const svc = chainRef.current;
        if (!svc || !("mine" in svc)) break;
        try {
          const result = await (
            svc as { mine(): Promise<{ blockNumber: number; yields: Record<string, number> }> }
          ).mine();
          // Update block count (preserve current mode)
          const store = useGameStore.getState();
          store.setChainMode(store.chainMode, result.blockNumber);
          // Trigger full sync to get updated agents/status
          syncFromChain();
        } catch {
          // Rate-limited (429) or other error — display will be handled by ResourceBar countdown
        }
        break;
      }
      case "secure":
        // CPU staking is the security mechanism — open terminal for staking controls
        if (selectedAgent) setActiveDockPanel("terminal");
        break;
      case "vote":
        // Governance voting — open profile for now (full voting with mainnet)
        if (selectedAgent) setProfileAgent(selectedAgent);
        break;
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-background">
      {/* Loading overlay */}
      {isInitializing && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
          <div className="w-4 h-4 rounded-full bg-accent-cyan animate-ping mb-6" />
          <div className="text-lg font-heading text-text-primary mb-2">
            Connecting to Agentic Chain
          </div>
          <div className="text-sm text-text-muted font-mono">Establishing ledger sync...</div>
        </div>
      )}

      {/* Resource bar — always visible at top */}
      <ResourceBar />

      {/* Tab navigation */}
      <TabNavigation />

      {/* Tab content area — fills remaining space */}
      <div className="flex-1 relative overflow-hidden">
        {/* Network tab — always mounted, hidden when inactive to preserve PixiJS canvas */}
        <div className={`absolute inset-0 ${activeTab !== "network" ? "hidden" : ""}`}>
          <LatticeGrid onSelectAgent={setSelectedAgent} onDeselect={() => setSelectedAgent(null)} />

          {/* Top bar: Agents dropdown only (TimeRewind moved to dock) */}
          <div className="absolute top-4 left-4 z-10 flex items-start gap-2">
            <AgentDropdown onSelectAgent={setSelectedAgent} />
          </div>

          {/* Dock Panel — right edge */}
          <DockPanel
            onHaikuSubmit={handleHaikuSubmit}
            currentAgent={currentAgentId ? (agents[currentAgentId] ?? null) : null}
            chainService={chainRef.current}
            onAgentDeploy={(newId) => {
              switchAgent(newId);
              setDeployTargetForTerminal(null);
              setActiveDockPanel("terminal");
            }}
            onFocusNode={(nodeId) => {
              const node = agents[nodeId];
              if (node) {
                setSelectedAgent(nodeId);
                useGameStore.getState().requestFocus(nodeId);
              }
            }}
            deployTargetForTerminal={deployTargetForTerminal}
            serverStartTime={serverStartTime}
            onTimeChange={() => {
              /* TODO: Load historical state */
            }}
          />

          {/* Bottom bar — compact action strip */}
          <div className="absolute bottom-0 left-0 right-10 h-8 z-10 flex items-center px-3 gap-3 bg-background/40 backdrop-blur-sm border-t border-card-border">
            {/* Center on owned node */}
            <button
              onClick={() => {
                const store = useGameStore.getState();
                const owned = Object.values(store.blocknodes).find(
                  (n) => n.ownerId === store.currentUserId
                );
                if (owned) store.requestFocus(owned.id);
              }}
              className="text-[10px] font-semibold text-accent-cyan hover:text-text-primary transition-all"
            >
              ⌂ Home Node
            </button>
          </div>

          {/* Left sidebar — Neural Lattice persistent selection panel */}
          {selectedAgent &&
            agents[selectedAgent] &&
            (() => {
              const selected = agents[selectedAgent];
              const viewer = currentAgentId ? agents[currentAgentId] : null;
              const isOwn = currentUserId ? selected.userId === currentUserId : false;
              const distance = viewer ? getDistance(viewer.position, selected.position) : 0;
              const fogLevel = viewer ? getFogLevel(distance, viewer.tier) : ("clear" as const);
              const dipKey = viewer ? [viewer.id, selected.id].sort().join("-") : "";
              const dipState = useGameStore.getState().diplomacy[dipKey];
              // Own agents: full clarity (4). Unclaimed nodes: public info (1). Foreign: hidden until diplomacy.
              const clarity = dipState
                ? getClarityLevel(dipState.exchangeCount)
                : isOwn
                  ? 4
                  : !selected.userId
                    ? 1
                    : 0;
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
        {activeTab === "account" && <AccountView />}

        {/* Researches tab */}
        {activeTab === "researches" && <ResearchPanel />}

        {/* Skills tab */}
        {activeTab === "skills" && <SkillsPanel />}
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
            setActiveDockPanel("terminal");
            setProfileAgent(null);
          }}
        />
      )}

      {/* Debug overlay — dev mode only */}
      {process.env.NODE_ENV === "development" && <DebugOverlay />}
    </div>
  );
}

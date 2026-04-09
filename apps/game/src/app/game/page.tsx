"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import LatticeGrid from "@/components/LatticeGrid";
import ResourceBar from "@/components/ResourceBar";
import TabNavigation from "@/components/TabNavigation";
import AccountView from "@/components/AccountView";
import ResearchPanel from "@/components/ResearchPanel";
import SkillsPanel from "@/components/SkillsPanel";
import DockPanel from "@/components/DockPanel";
import CellTooltip from "@/components/CellTooltip";
import { startDebugListener } from "@/lib/debugListener";
import dynamic from "next/dynamic";
const DebugOverlay = dynamic(() => import("@/components/DebugOverlay"), { ssr: false });
import { useGameStore } from "@/store";
import { MockChainService } from "@/services/chainService";
import type { ChainService } from "@/services/chainService";
import { TestnetChainService } from "@/services/testnetChainService";
import { isTestnetOnline, getSettings, getRewards } from "@/services/testnetApi";
import { useChainWebSocket } from "@/hooks/useChainWebSocket";
import type { SubscriptionTier } from "@/types";
import type { FactionId } from "@/types";
import { SUBSCRIPTION_PLANS } from "@/types/subscription";
import { getFrontierCell, getFactionForCell, getCellDensity } from "@/lib/lattice";
import { visualToChain } from "@/services/testnetChainService";

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

  const setActiveDockPanel = useGameStore((s) => s.setActiveDockPanel);
  const switchAgent = useGameStore((s) => s.switchAgent);
  const [tooltip, setTooltip] = useState<{ cx: number; cy: number; screenX: number; screenY: number } | null>(null);
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

      // Initialize Neural Lattice — build all rings up to current chain height
      // This prevents a flash of cells appearing when syncFromChain catches up
      const chainStatus = online ? await import("@/services/testnetApi").then(m => m.getStatus()).catch(() => null) : null;
      const initialRings = chainStatus ? Math.max(2, chainStatus.blocks_processed) : 2;
      initLattice(initialRings);

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
          cpuRegenPerTurn: plan.cpuRegen,
        });
        // Claim homenode FIRST while currentUserFaction is still null (init/dev-seed mode).
        // claimBlocknode requires faction === null to assign arm nodes — this is intentional:
        // arm nodes are faction infrastructure, not user territory. The claim here marks the
        // ring-0 node as the user's "Homenode" starting reference. setCurrentUserFaction is
        // called AFTER so future arm-node claim attempts are blocked for regular users.
        const freshStore = useGameStore.getState();
        const frontierNode = getFrontierCell(newUserFaction, freshStore.blocknodes);
        if (frontierNode) {
          claimBlocknode(frontierNode.id, newUserId);

          // Create a homenode agent so the terminal works immediately
          const homenodeAgent: import("@/types").Agent = {
            id: frontierNode.id,
            userId: newUserId,
            position: { x: frontierNode.cx * 64, y: frontierNode.cy * 64 },
            tier: "opus" as const,
            isPrimary: true,
            planets: [],
            createdAt: Date.now(),
            username: `Homenode`,
            borderRadius: 30,
            borderPressure: 0,
            cpuPerTurn: 0,
            miningRate: 0,
            energyLimit: 0,
            stakedCpu: 0,
          };
          addAgent(homenodeAgent);
          setCurrentUser(newUserId, frontierNode.id);
          useGameStore.getState().requestFocus(frontierNode.id);
          setActiveDockPanel("terminal");
        } else {
          setCurrentUser(newUserId, "");
        }
        setCurrentUserFaction(newUserFaction);
        revealFaction(newUserFaction);

        // Dev mode: reveal all factions so the full grid is visible
        if (isDev) {
          revealFaction("community");
          revealFaction("pro-max");
          revealFaction("founder");
          revealFaction("treasury");
        }
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
          <LatticeGrid onSelectAgent={() => {}} onDeselect={() => {}} />

          {/* Dock Panel — left edge */}
          <DockPanel
            onHaikuSubmit={handleHaikuSubmit}
            currentAgent={currentAgentId ? (agents[currentAgentId] ?? null) : null}
            chainService={chainRef.current}
            onAgentDeploy={(newId) => {
              switchAgent(newId);
              setActiveDockPanel("terminal");
            }}
            onFocusNode={(nodeId) => {
              const node = agents[nodeId];
              if (node) {
                useGameStore.getState().requestFocus(nodeId);
              }
            }}
            serverStartTime={serverStartTime}
            onTimeChange={() => {
              /* TODO: Load historical state */
            }}
          />

          {/* Bottom bar — compact action strip */}
          <div className="absolute bottom-0 left-10 right-0 h-8 z-10 flex items-center px-3 gap-3 bg-background/40 backdrop-blur-sm border-t border-card-border">
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

          {/* Cell tooltip */}
          {tooltip && (() => {
            const faction = getFactionForCell(tooltip.cx, tooltip.cy);
            if (!faction) return null;
            const density = getCellDensity(tooltip.cx, tooltip.cy);
            const cellKey = `cell-${tooltip.cx}-${tooltip.cy}`;
            const node = useGameStore.getState().blocknodes[cellKey];
            return (
              <CellTooltip
                cx={tooltip.cx}
                cy={tooltip.cy}
                faction={faction}
                density={density}
                owner={node?.ownerId ?? null}
                screenX={tooltip.screenX}
                screenY={tooltip.screenY}
                onClose={() => setTooltip(null)}
              />
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

      {/* Debug overlay — dev mode only */}
      {process.env.NODE_ENV === "development" && <DebugOverlay />}
    </div>
  );
}

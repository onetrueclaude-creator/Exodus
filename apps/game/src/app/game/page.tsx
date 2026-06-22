"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ResourceBar from "@/components/ResourceBar";
import TabNavigation from "@/components/TabNavigation";
import AccountView from "@/components/AccountView";
import ResearchPanel from "@/components/ResearchPanel";
import SkillsPanel from "@/components/SkillsPanel";
import DockPanel from "@/components/DockPanel";
import ScoresWidget from "@/components/ScoresWidget";
import NodeInspector from "@/components/NodeInspector";
import { startDebugListener } from "@/lib/debugListener";
import dynamic from "next/dynamic";
const DebugOverlay = dynamic(() => import("@/components/DebugOverlay"), { ssr: false });
const OrbitalCanvas = dynamic(() => import("@/components/OrbitalCanvas"), { ssr: false });
import { useGameStore } from "@/store";
import { MockChainService } from "@/services/chainService";
import type { ChainService } from "@/services/chainService";
import { TestnetChainService } from "@/services/testnetChainService";
import { isTestnetOnline, getSettings, getTransactions, getWalletBalance } from "@/services/testnetApi";
import { getWalletIndex } from "@/lib/walletIndex";
import { useChainWebSocket } from "@/hooks/useChainWebSocket";
import type { SubscriptionTier } from "@/types";
import type { Tier } from "@/types";
import { TIER_TINT } from "@/types";
import { SUBSCRIPTION_PLANS } from "@/types/subscription";
import { createCellInternal } from "@/lib/lattice";
import { getNextSpawnCell } from "@/lib/spawn";

/** Map subscription tier to default player Tier identity. */
const SUBSCRIPTION_TIER_MAP: Record<SubscriptionTier, Tier> = {
  COMMUNITY: "community",
  PROFESSIONAL: "professional",
};

/** Empire border tint per player Tier (PixiJS color number). */
const DEV_TIER_COLOR: Record<Tier, number> = {
  community: TIER_TINT.community,
  professional: TIER_TINT.professional,
  founder: TIER_TINT.founder, // amber
};

/** Block time on chain — refresh grid every 60 seconds to sync with ledger */
const CHAIN_SYNC_INTERVAL_MS = 60_000;

/**
 * dev/demo seed — replace with real chain claims later.
 * Injects a handful of neighbour player nodes directly into the Zustand store so
 * the orbital graph is populated around the player's own (isSelf) homenode. These
 * are store-only and dev-only — NOT a chain change. Each neighbour gets its own
 * userId so seatsFromAgents treats it as a claimed player (not the self/origin).
 */
function seedDemoNeighbors(): void {
  const demo: Array<{ tier: Tier; activity: number }> = [
    { tier: "community", activity: 80 },
    { tier: "professional", activity: 65 },
    { tier: "community", activity: 40 },
    { tier: "professional", activity: 25 },
    { tier: "community", activity: 12 },
  ];
  const addAgent = useGameStore.getState().addAgent;
  demo.forEach((d, i) => {
    const id = `demo-neighbor-${i}`;
    addAgent({
      id,
      userId: `demo-user-${i}`, // distinct from the player → seated as a neighbour
      // Position is a placeholder — the orbital renderer re-seats every agent by
      // rank (seatsFromAgents), so the seeded coordinate is never read.
      position: { x: 0, y: 0 },
      level: 1,
      miningCpu: 0,
      securingCpu: 0,
      levelingUntilTurn: null,
      isPrimary: true,
      planets: [],
      createdAt: Date.now(),
      username: `Neighbor ${i + 1}`,
      borderRadius: 64,
      borderPressure: 0,
      cpuPerTurn: 0,
      miningRate: 0,
      energyLimit: 0,
      stakedCpu: 0,
      density: 0.5,
      storageSlots: 1,
      tier: d.tier,
      activity: d.activity,
      isSelf: false,
    });
  });
}

export default function GamePage() {
  const addAgent = useGameStore((s) => s.addAgent);
  // The phyllotaxis orbital renderer is the only view. `mounted` gates the
  // client-only canvas (OrbitalCanvas is ssr:false) so the first paint matches
  // the server's null render and avoids a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
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
  const setCurrentUserTier = useGameStore((s) => s.setCurrentUserTier);
  const revealTier = useGameStore((s) => s.revealTier);
  const chainMode = useGameStore((s) => s.chainMode);

  // Connect WebSocket when in testnet mode
  useChainWebSocket(chainMode === "testnet");

  const setActiveDockPanel = useGameStore((s) => s.setActiveDockPanel);

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

    // Sync wallet state (secured chains, mined chains, rates, effective stake)
    // and the real spendable AGNTC balance from the chain ledger.
    try {
      const walletIndex = getWalletIndex();  // ?wallet=N / env, default 1 (dev Founder)
      const settings = await getSettings(walletIndex);
      store.setWalletState({
        securedChains: settings.total_secured_chains,
        minedChains: settings.total_mined_chains,
        securingRate: settings.securing_rate,
        miningRate: settings.mining_rate,
        effectiveStake: settings.effective_stake,
      });
      // Spendable AGNTC = live ledger balance. The endpoint returns microAGNTC
      // (1e6 = 1 AGNTC); convert to the AGNTC display unit and set it absolutely,
      // overwriting the static plan value / optimistic local deltas with chain truth.
      const balance = await getWalletBalance(walletIndex);
      store.setSyncedAgntcBalance(balance.spendable_micro_agntc / 1_000_000);
    } catch {
      // Wallet sync failed — keep stale data
    }

    // Sync recent player↔player transactions → on-screen transaction edges.
    try {
      const { transactions } = await getTransactions();
      store.setTransactionEdges(
        transactions.map((tx) => ({ from: tx.from, to: tx.to, block: tx.block })),
      );
    } catch {
      // Transaction sync failed — keep stale edges
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

      const isDev = process.env.NODE_ENV === "development";
      // The player's own node is their real on-chain claim, which the chain flags
      // is_self for getWalletIndex(). When present (dev OR prod) it IS the homenode
      // — no synthetic node is created. Falls back to the legacy first-owned
      // heuristic only in prod when the chain reported no self node.
      const selfAgent = agentList.find((a) => a.isSelf && !a.isSingularity);
      const firstOwned = selfAgent ?? (isDev ? null : agentList.find((a) => a.userId !== ""));
      if (firstOwned) {
        setCurrentUser(firstOwned.userId, firstOwned.id);
        // Dev: anchor the player's resource pool + Founder identity on their real
        // chain node (no synthetic homenode, no demo placeholders).
        if (isDev) {
          const devSubRaw = typeof window !== "undefined" ? localStorage.getItem("dev_subscription") : null;
          const devSub = (devSubRaw as SubscriptionTier | null) ?? "PROFESSIONAL";
          const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === devSub) ?? SUBSCRIPTION_PLANS[0];
          useGameStore.setState({
            energy: plan.startEnergy,
            agntcBalance: plan.startAgntc + 1, // +1 genesis airdrop
            minerals: plan.startMinerals,
            empireColor: DEV_TIER_COLOR["founder"],
            cpuRegenPerTurn: plan.cpuRegen,
            currentUserTier: "founder",
          });
          setCurrentUserTier("founder");
          revealTier("community");
          revealTier("professional");
          revealTier("founder");
        }
        const primary = agentList.find((a) => a.isPrimary && a.userId === firstOwned.userId);
        const homenode = primary ?? firstOwned;
        if (!isDev) setActiveDockPanel("terminal");
        useGameStore.getState().requestFocus(homenode.id);
      } else {
        // New user — read dev-selected player Tier + subscription (dev mode).
        // INSECURE dev-only: tier must become server-authoritative (sub-project B);
        // localStorage is client-spoofable.
        const devTierRaw = typeof window !== "undefined" ? localStorage.getItem("dev_tier") : null;
        const devSubRaw = typeof window !== "undefined" ? localStorage.getItem("dev_subscription") : null;
        // Subscription tier is a separate concept (resources/CPU plan), still
        // selectable in dev via the dev_subscription key. Defaults to Professional
        // so the dev has ample CPU for the founder homenode.
        const devSub = (devSubRaw as SubscriptionTier | null) ?? "PROFESSIONAL";
        const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === devSub) ?? SUBSCRIPTION_PLANS[0];
        // Player Tier identity. Resolution order:
        //   1. explicit dev_tier (player chose a tier)
        //   2. dev_subscription → tier mapping, but ONLY when dev_subscription was set
        //      explicitly (otherwise this would mask the Founder default below)
        //   3. Founder — the dev default, so the crown/marker path runs out of the box
        // Validate dev_tier: this key was repurposed (it previously held a
        // SubscriptionTier), so a stale uppercase value must NOT slip through as an
        // invalid Tier (which would yield an undefined tint and crash the inspector).
        const devTier =
          devTierRaw === "community" || devTierRaw === "professional" || devTierRaw === "founder"
            ? devTierRaw
            : null;
        const newUserTier: Tier =
          devTier ?? (devSubRaw ? SUBSCRIPTION_TIER_MAP[devSub] ?? "founder" : "founder");

        const newUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        useGameStore.setState({
          currentUserId: newUserId,
          energy: plan.startEnergy,
          agntcBalance: plan.startAgntc + 1, // +1 genesis airdrop
          minerals: plan.startMinerals,
          empireColor: DEV_TIER_COLOR[newUserTier],
          cpuRegenPerTurn: plan.cpuRegen,
        });
        // Open-grid spawn: set tier first, then claim the next available origin-out cell.
        useGameStore.setState({ currentUserTier: newUserTier });
        let blocknodes = useGameStore.getState().blocknodes;
        const spawn = getNextSpawnCell(blocknodes);
        if (!spawn) {
          throw new Error("Lattice saturated: no spawn cell available");
        }
        const homeCellId = `cell-${spawn.cx}-${spawn.cy}`;
        // Ensure the cell exists in store; if outside built rings, create it.
        if (!blocknodes[homeCellId]) {
          const newCell = createCellInternal(spawn.cx, spawn.cy, spawn.chebyshev);
          useGameStore.setState((s) => ({
            blocknodes: { ...s.blocknodes, [homeCellId]: newCell },
          }));
          blocknodes = useGameStore.getState().blocknodes;
        }
        const claimed = useGameStore.getState().claimBlocknode(homeCellId, newUserId);
        if (!claimed) {
          throw new Error(`Failed to claim spawn cell ${homeCellId}`);
        }

        // Create a homenode agent so the terminal works immediately.
        // isSelf + tier drive the "Your Homenode" marker in the orbital renderer.
        // Position is a placeholder — the orbital renderer re-seats every agent by
        // rank (seatsFromAgents), so the seeded coordinate is never read.
        const homenodeAgent: import("@/types").Agent = {
          id: homeCellId,
          userId: newUserId,
          position: { x: 0, y: 0 },
          level: 1,
          miningCpu: 0,
          securingCpu: 0,
          levelingUntilTurn: null,
          isPrimary: true,
          planets: [],
          createdAt: Date.now(),
          username: "Homenode",
          borderRadius: 64,
          borderPressure: 0,
          cpuPerTurn: 10,
          miningRate: 1,
          energyLimit: 50,
          stakedCpu: 0,
          density: 1.0,
          storageSlots: 1,
          isSelf: true,
          tier: newUserTier,
          activity: 100, // high activity → seated near the core
        };
        addAgent(homenodeAgent);
        setCurrentUser(newUserId, homeCellId);

        // dev/demo seed is OPT-IN (?demo=1). By default the orbit shows ONLY
        // real participants — the local homenode + chain-backed players — so no
        // placeholder nodes without an active player connection are drawn.
        const showDemoNeighbors =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("demo") === "1";
        if (isDev && showDemoNeighbors) {
          seedDemoNeighbors();
        }

        useGameStore.getState().requestFocus(homeCellId);
        // In production this auto-opens the agent terminal for first-time onboarding.
        // In dev mode every reload re-triggers "new user" and would slam the panel open,
        // covering the map; leave the dock closed and let the developer open it manually.
        if (!isDev) {
          setActiveDockPanel("terminal");
        }
        setCurrentUserTier(newUserTier);
        revealTier(newUserTier);

        // Dev mode: reveal all tiers so the full grid is visible
        if (isDev) {
          revealTier("community");
          revealTier("professional");
          revealTier("founder");
        }
      }

      setInitializing(false);
      // Eager first sync so wallet/scores/edges populate immediately instead of
      // waiting a full CHAIN_SYNC_INTERVAL_MS — the Scores board read 0 for ~60s
      // after load because syncFromChain only ran on the interval.
      syncFromChain();
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

      {/* Floating scores widget — upper-right, testnet only */}
      <ScoresWidget />

      {/* Tab content area — fills remaining space */}
      <div className="flex-1 relative overflow-hidden">
        {/* Network tab — always mounted, hidden when inactive to preserve PixiJS canvas */}
        <div className={`absolute inset-0 ${activeTab !== "network" ? "hidden" : ""}`}>
          {mounted && <OrbitalCanvas />}

          {/* Node inspector toast — top-right, store-driven (focusedNodeId).
              The Singularity gate (Secure/Read/Stats) needs the chain service. */}
          <NodeInspector chainService={chainRef.current} />

          {/* Dock Panel — left edge */}
          <DockPanel
            onHaikuSubmit={handleHaikuSubmit}
            currentAgent={currentAgentId ? (agents[currentAgentId] ?? null) : null}
            chainService={chainRef.current}
            onAgentDeploy={() => {
              // Don't auto-switch to the new sub-node — the homenode is the player's
              // command center and the deploy was issued from it. Sub-node is now
              // visible in the orbit and switchable via the Account View list.
              setActiveDockPanel("terminal");
            }}
            onFocusNode={() => {
              // No-op: focusing a node from an action must NOT move the camera.
              // A requestFocus here recentered the view on every action (read as an
              // unwanted zoom/jump). Camera recenter is the Home-button's job;
              // node selection happens by tapping the node in the orbit.
            }}
          />

          {/* Bottom bar — compact action strip */}
          <div className="absolute bottom-0 left-10 right-0 h-8 z-10 flex items-center px-3 gap-3 bg-background/40 backdrop-blur-sm border-t border-card-border">
            {/* Center on owned node */}
            <button
              onClick={() => {
                const store = useGameStore.getState();
                // The player's node is their on-chain claim (isSelf), not a
                // blocknode — recenter the camera on it.
                const self = Object.values(store.agents).find((a) => a.isSelf);
                if (self) store.requestFocus(self.id);
              }}
              className="text-[10px] font-semibold text-accent-cyan hover:text-text-primary transition-all"
            >
              ⌂ Home Node
            </button>
          </div>
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

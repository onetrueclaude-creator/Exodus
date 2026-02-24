/**
 * TestnetChainService — bridges the testnet API to the frontend's ChainService interface.
 *
 * Maps blockchain claims (x,y coordinates with owners) to the frontend's Agent model.
 *
 * Coordinate mapping:
 *   Blockchain: math convention (y-up, positive y = north), integer units
 *   PixiJS/Visual: screen convention (y-down, positive y = south), 6 units per blockchain unit
 *   Formula: visual_x = chain_x * 6, visual_y = -chain_y * 6
 *   One GalaxyGrid macro cell = 60 visual units = 10 blockchain units
 */
import type { Agent, AgentTier, HaikuMessage, GridPosition, ClaimInfo, ClaimNodeResult, TestnetStatus, MessageResult, MessageInfo } from '@/types';
import { TIER_CPU_COST, TIER_BASE_BORDER, TIER_MINING_RATE } from '@/types/agent';
import type { ChainService } from './chainService';
import * as api from './testnetApi';

// ---------------------------------------------------------------------------
// Coordinate mapping
//
// The blockchain uses a math coordinate system (y-up, positive y = north).
// PixiJS uses screen coordinates (y-down, positive y = south).
// GalaxyGrid cells are CELL_SIZE = 60 world units each, and 1 macro cell = 10
// blockchain coordinate units (CHAIN_PER_CELL). Scale = 60/10 = 6.
//
// To convert: visual_x = chain_x * 6
//             visual_y = -chain_y * 6  ← flip y to match PixiJS y-down
// ---------------------------------------------------------------------------

/** World-space units per macro grid cell (must match GalaxyGrid CELL_SIZE) */
const CELL_SIZE = 60;
/** Blockchain coordinate units per macro grid cell */
const CHAIN_PER_CELL = 10;
/** Scale: visual world units per one blockchain coordinate unit */
const CHAIN_TO_VISUAL = CELL_SIZE / CHAIN_PER_CELL; // = 6

/** Convert blockchain coordinate → frontend visual position (PixiJS y-down) */
export function chainToVisual(chainX: number, chainY: number): GridPosition {
  return {
    x: chainX * CHAIN_TO_VISUAL,
    y: -chainY * CHAIN_TO_VISUAL, // flip y: blockchain y-up → PixiJS y-down
  };
}

/** Convert frontend visual position (PixiJS y-down) → nearest blockchain coordinate */
export function visualToChain(vx: number, vy: number): { x: number; y: number } {
  return {
    x: Math.round(vx / CHAIN_TO_VISUAL),
    y: Math.round(-vy / CHAIN_TO_VISUAL), // flip y back to blockchain y-up
  };
}

// ---------------------------------------------------------------------------
// Claim / Node → Agent mapping
// ---------------------------------------------------------------------------

/** Map a blockchain claim to a frontend Agent. */
function claimToAgent(claim: ClaimInfo, index: number): Agent {
  const position = chainToVisual(claim.x, claim.y);
  const tier: AgentTier = claim.stake >= 80 ? 'opus'
    : claim.stake >= 30 ? 'sonnet'
    : 'haiku';

  return {
    id: `chain-${claim.owner.slice(0, 8)}-${index}`,
    userId: claim.owner,
    position,
    tier,
    isPrimary: index === 0,
    planets: [],
    createdAt: Date.now(),
    username: `${claim.owner.slice(0, 6)}...${claim.owner.slice(-4)}`,
    borderRadius: TIER_BASE_BORDER[tier],
    borderPressure: 0,
    cpuPerTurn: TIER_CPU_COST[tier],
    miningRate: Math.round(claim.density * TIER_MINING_RATE[tier] * 10) / 10,
    energyLimit: TIER_CPU_COST[tier] * 5,
    stakedCpu: 0,
    density: claim.density,
    storageSlots: claim.storage_slots,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TestnetChainService implements ChainService {
  private cachedAgents: Agent[] | null = null;

  /** Fetch all grid data from the blockchain: active claims only */
  async getAgents(): Promise<Agent[]> {
    const claims = await api.getClaims();
    const ownerFirstSeen = new Set<string>();
    const ownedAgents: Agent[] = claims.map((claim, i) => {
      const agent = claimToAgent(claim, i);
      if (!ownerFirstSeen.has(claim.owner)) {
        ownerFirstSeen.add(claim.owner);
        agent.isPrimary = true;
      } else {
        agent.isPrimary = false;
      }
      return agent;
    });

    this.cachedAgents = [...ownedAgents];
    return this.cachedAgents;
  }

  async registerAgent(userId: string, tier: AgentTier): Promise<Agent> {
    // For testnet, wallet_index defaults to 0 (first wallet)
    // In production, this would be derived from the authenticated user
    const result = await api.birthStarSystem(0);
    const position = chainToVisual(result.coordinate.x, result.coordinate.y);

    return {
      id: `chain-birth-${Date.now()}`,
      userId,
      position,
      tier,
      isPrimary: false,
      planets: [],
      createdAt: Date.now(),
      username: `Star-${result.coordinate.x},${result.coordinate.y}`,
      borderRadius: TIER_BASE_BORDER[tier],
      borderPressure: 0,
      cpuPerTurn: TIER_CPU_COST[tier],
      miningRate: TIER_MINING_RATE[tier],
      energyLimit: TIER_CPU_COST[tier] * 5,
      stakedCpu: 0,
    };
  }

  async postHaiku(agentId: string, text: string): Promise<HaikuMessage> {
    // Local broadcast — GalaxyChatRoom uses this for network-wide chat
    // Point-to-point messaging uses sendMessage() instead
    return {
      id: `haiku-${Date.now()}`,
      senderAgentId: agentId,
      text,
      syllables: [5, 7, 5],
      position: { x: 0, y: 0 },
      timestamp: Date.now(),
    };
  }

  async getHaikuFeed(): Promise<HaikuMessage[]> {
    return []; // Network chat is local — on-chain messaging is point-to-point
  }

  async sendMessage(
    senderCoord: { x: number; y: number },
    targetCoord: { x: number; y: number },
    text: string,
  ): Promise<MessageResult> {
    const senderChain = visualToChain(senderCoord.x, senderCoord.y);
    const targetChain = visualToChain(targetCoord.x, targetCoord.y);
    return api.sendMessage(0, senderChain, targetChain, text);
  }

  async getMessages(coord: { x: number; y: number }): Promise<MessageInfo[]> {
    const chain = visualToChain(coord.x, coord.y);
    return api.getMessages(chain.x, chain.y);
  }

  async setIntro(coord: { x: number; y: number }, message: string): Promise<void> {
    const chain = visualToChain(coord.x, coord.y);
    await api.setIntro(0, chain, message);
  }

  async claimNode(chainX: number, chainY: number, stake: number = 200): Promise<ClaimNodeResult> {
    // wallet_index 0 for testnet (single-user dev mode)
    return api.claimNode(0, chainX, chainY, stake);
  }

  async moveAgent(agentId: string, position: GridPosition): Promise<Agent> {
    throw new Error('moveAgent not supported on testnet');
  }

  /** Fetch ledger status for display */
  async getStatus(): Promise<TestnetStatus> {
    return api.getStatus();
  }

  /** Trigger one mining block */
  async mine(): Promise<{ blockNumber: number; yields: Record<string, number> }> {
    const result = await api.mineBlock();
    return { blockNumber: result.block_number, yields: result.yields };
  }
}

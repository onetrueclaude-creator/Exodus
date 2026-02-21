/**
 * TestnetChainService — bridges the testnet API to the frontend's ChainService interface.
 *
 * Maps blockchain claims (x,y coordinates with owners) to the frontend's Agent model.
 * Generates unclaimed star system nodes by deterministically sampling the chain grid.
 *
 * Coordinate mapping:
 *   Chain grid:    -3240 to 3240  (6481 × 6481 = ~42M coordinates)
 *   Frontend grid: -4000 to 4000  (8000-unit visual space)
 *   Scale factor:  8000 / 6480 ≈ 1.2346
 */
import type { Agent, AgentTier, HaikuMessage, GridPosition, ClaimInfo, TestnetStatus, MessageResult, MessageInfo } from '@/types';
import { CHAIN_GRID_MIN, CHAIN_GRID_SPAN } from '@/types/testnet';
import { TIER_CPU_COST, TIER_BASE_BORDER, TIER_MINING_RATE } from '@/types/agent';
import type { ChainService } from './chainService';
import * as api from './testnetApi';

/** Visual grid extent (matches GalaxyGrid GRID_EXTENT / 2) */
const VISUAL_HALF = 4000;
const VISUAL_SPAN = VISUAL_HALF * 2; // 8000

/** How many unclaimed nodes to sample from the chain grid */
const UNCLAIMED_SAMPLE_COUNT = 1000;

// ---------------------------------------------------------------------------
// Coordinate mapping
// ---------------------------------------------------------------------------

/** Convert blockchain coordinate → frontend visual position */
export function chainToVisual(chainX: number, chainY: number): GridPosition {
  return {
    x: ((chainX - CHAIN_GRID_MIN) / CHAIN_GRID_SPAN) * VISUAL_SPAN - VISUAL_HALF,
    y: ((chainY - CHAIN_GRID_MIN) / CHAIN_GRID_SPAN) * VISUAL_SPAN - VISUAL_HALF,
  };
}

/** Convert frontend visual position → nearest blockchain coordinate */
export function visualToChain(vx: number, vy: number): { x: number; y: number } {
  return {
    x: Math.round(((vx + VISUAL_HALF) / VISUAL_SPAN) * CHAIN_GRID_SPAN + CHAIN_GRID_MIN),
    y: Math.round(((vy + VISUAL_HALF) / VISUAL_SPAN) * CHAIN_GRID_SPAN + CHAIN_GRID_MIN),
  };
}

// ---------------------------------------------------------------------------
// Deterministic unclaimed node sampling
// ---------------------------------------------------------------------------

/**
 * Simple deterministic hash for sampling unclaimed coordinates.
 * Produces the same set of coordinates every time, matching what the chain would have.
 */
function sampleUnclaimedCoords(count: number, seed: number = 42): { x: number; y: number }[] {
  const coords: { x: number; y: number }[] = [];
  let state = seed;
  for (let i = 0; i < count; i++) {
    // LCG pseudo-random — deterministic, matching chain's seeded RNG
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    const x = CHAIN_GRID_MIN + (state % (CHAIN_GRID_SPAN + 1));
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    const y = CHAIN_GRID_MIN + (state % (CHAIN_GRID_SPAN + 1));
    coords.push({ x, y });
  }
  return coords;
}

// ---------------------------------------------------------------------------
// Claim → Agent mapping
// ---------------------------------------------------------------------------

/** Map a blockchain claim to a frontend Agent. */
function claimToAgent(claim: ClaimInfo, index: number): Agent {
  const position = chainToVisual(claim.x, claim.y);
  // Infer tier from stake amount (higher stake = higher tier)
  const tier: AgentTier = claim.stake >= 80 ? 'opus'
    : claim.stake >= 30 ? 'sonnet'
    : 'haiku';

  return {
    id: `chain-${claim.owner.slice(0, 8)}-${index}`,
    userId: claim.owner,
    position,
    tier,
    isPrimary: index === 0, // first claim for this owner is primary
    planets: [],
    createdAt: Date.now(),
    username: `${claim.owner.slice(0, 6)}...${claim.owner.slice(-4)}`,
    borderRadius: TIER_BASE_BORDER[tier],
    borderPressure: 0,
    cpuPerTurn: TIER_CPU_COST[tier],
    miningRate: Math.round(claim.density * TIER_MINING_RATE[tier] * 10) / 10,
    energyLimit: TIER_CPU_COST[tier] * 5,
    stakedCpu: 0,
  };
}

/** Create an unclaimed star system node from a chain coordinate. */
function coordToSlot(coord: { x: number; y: number }, index: number): Agent {
  const position = chainToVisual(coord.x, coord.y);
  return {
    id: `slot-${String(index).padStart(4, '0')}`,
    userId: '',
    position,
    tier: 'haiku' as const,
    isPrimary: false,
    planets: [],
    createdAt: Date.now() - 86400000,
    username: `(${coord.x}, ${coord.y})`,
    borderRadius: 30,
    borderPressure: 0,
    cpuPerTurn: 0,
    miningRate: 0,
    energyLimit: 0,
    stakedCpu: 0,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TestnetChainService implements ChainService {
  private cachedAgents: Agent[] | null = null;

  /** Fetch claims from testnet + generate unclaimed nodes → Agent[] */
  async getAgents(): Promise<Agent[]> {
    // 1. Fetch on-chain claims
    const claims = await api.getClaims();

    // Build a set of claimed coordinates to avoid duplicating them as unclaimed
    const claimedSet = new Set(claims.map(c => `${c.x},${c.y}`));

    // Track per-owner primary assignment
    const ownerFirstSeen = new Set<string>();

    // 2. Map claims → owned agents
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

    // 3. Sample unclaimed coordinates (deterministic)
    const sampledCoords = sampleUnclaimedCoords(UNCLAIMED_SAMPLE_COUNT);
    const unclaimedSlots: Agent[] = sampledCoords
      .filter(c => !claimedSet.has(`${c.x},${c.y}`))
      .map((coord, i) => coordToSlot(coord, i));

    this.cachedAgents = [...ownedAgents, ...unclaimedSlots];
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

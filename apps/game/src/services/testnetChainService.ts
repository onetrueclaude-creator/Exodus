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
import type {
  Agent, AgentTier, HaikuMessage, GridPosition, ClaimInfo, ClaimNodeResult, NodeInfo,
  TestnetStatus, MessageResult, MessageInfo,
  VaultRootResponse, VaultAssignmentResponse, VaultChallengeResponse, VaultShardResponse,
  VaultSubmitProofRequest, VaultSubmitProofResponse, VaultStatusResponse,
} from '@/types';
import { CHAIN_GRID_MIN, CHAIN_GRID_SPAN } from '@/types/testnet';
import { TIER_BASE_BORDER, TIER_MINING_RATE } from '@/types/agent';
import { getNodeTier, getNodeCpuPerTurn } from '@/lib/nodeTier';
import { getWalletIndex } from '@/lib/walletIndex';
import type { ChainService } from './chainService';
import * as api from './testnetApi';

// === Chain compatibility shim ===
// Translates between the legacy on-chain tier strings (opus/sonnet/haiku) and
// the new local level model. Sub-project B will retire this shim by adopting
// level-based types on the chain side directly.

type LegacyTier = 'opus' | 'sonnet' | 'haiku';

/**
 * Map a numeric level to the legacy tier string the chain still expects.
 * Synapse band (L1-3) → haiku; Cortex band (L4-6) → sonnet; Lattice+ (L7+) → opus.
 */
export function levelToLegacyTier(level: number): LegacyTier {
  if (level >= 7) return 'opus';
  if (level >= 4) return 'sonnet';
  return 'haiku';
}

/**
 * Inverse: map a legacy tier from chain responses to a starting level.
 * Roughly: haiku→L1, sonnet→L4, opus→L7. Loses information for high-level
 * nodes (a L12 node sent to chain as "opus" comes back as L7).
 */
export function legacyTierToLevel(tier: LegacyTier): number {
  if (tier === 'opus') return 7;
  if (tier === 'sonnet') return 4;
  return 1;
}

/** Half-width of the visual coordinate space used for chain↔visual mapping. */
const VISUAL_HALF = 4000;
const VISUAL_SPAN = VISUAL_HALF * 2; // 8000

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
// Claim / Node → Agent mapping
// ---------------------------------------------------------------------------

/** Map a blockchain claim to a frontend Agent.
 *  Stake → level mapping (shim until T7 replaces this with chain-native level):
 *  stake ≥ 80 → L7 (lattice), stake ≥ 30 → L4 (cortex), else → L1 (synapse).
 */
function claimToAgent(claim: ClaimInfo, index: number): Agent {
  const position = chainToVisual(claim.x, claim.y);
  const level = claim.stake >= 80 ? 7
    : claim.stake >= 30 ? 4
    : 1;
  const tier = getNodeTier(level);

  return {
    id: `chain-${claim.owner.slice(0, 8)}-${index}`,
    userId: claim.owner,
    position,
    level,
    miningCpu: 0,
    securingCpu: 0,
    levelingUntilTurn: null,
    isPrimary: index === 0,
    planets: [],
    createdAt: Date.now(),
    username: `${claim.owner.slice(0, 6)}...${claim.owner.slice(-4)}`,
    borderRadius: TIER_BASE_BORDER[tier],
    borderPressure: 0,
    cpuPerTurn: getNodeCpuPerTurn(level),
    miningRate: Math.round(claim.density * TIER_MINING_RATE[tier] * 10) / 10,
    energyLimit: getNodeCpuPerTurn(level) * 5,
    stakedCpu: 0,
    density: claim.density,
    storageSlots: claim.storage_slots,
  };
}

/** Map a chain NodeInfo to a frontend unclaimed Agent slot. */
function nodeToSlot(node: NodeInfo): Agent {
  const position = chainToVisual(node.x, node.y);
  return {
    id: node.id,
    userId: node.owner ?? '',
    position,
    level: 1,         // unclaimed slots start at L1 (synapse)
    miningCpu: 0,
    securingCpu: 0,
    levelingUntilTurn: null,
    isPrimary: false,
    planets: [],
    createdAt: Date.now() - 86400000,
    username: node.name,
    borderRadius: 30,
    borderPressure: 0,
    cpuPerTurn: 0,
    miningRate: 0,
    energyLimit: 0,
    stakedCpu: 0,
    density: node.density,
    storageSlots: node.storage_slots,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TestnetChainService implements ChainService {
  private cachedAgents: Agent[] | null = null;

  /** Fetch all grid data from the blockchain: claims + unclaimed nodes */
  async getAgents(): Promise<Agent[]> {
    // 1. Fetch on-chain claims as agents — these carry the phyllotaxis seat
    //    (rank / activity) and the Singularity flag the orbital renderer needs.
    const infos = await api.getAgents(50, getWalletIndex());
    const ownerFirstSeen = new Set<string>();
    const ownedAgents: Agent[] = infos.map((info, i) => {
      const agent = claimToAgent(info, i); // AgentInfo is a structural superset of ClaimInfo
      agent.activity = info.activity;
      agent.rank = info.rank;
      agent.isSingularity = info.is_singularity;
      agent.isSelf = info.is_self ?? false;
      agent.lastActiveBlock = info.last_active_block ?? 0;
      if (info.owner_name) agent.username = info.owner_name;
      if (!ownerFirstSeen.has(info.owner)) {
        ownerFirstSeen.add(info.owner);
        agent.isPrimary = true;
      } else {
        agent.isPrimary = false;
      }
      return agent;
    });

    // 2. Fetch unclaimed neural nodes from chain coordinate grid
    const chainNodes = await api.getNodes(1000, 42);
    const unclaimedSlots: Agent[] = chainNodes
      .filter(n => !n.claimed)
      .map(n => nodeToSlot(n));

    this.cachedAgents = [...ownedAgents, ...unclaimedSlots];
    return this.cachedAgents;
  }

  async registerAgent(userId: string, tier: AgentTier): Promise<Agent> {
    // Wallet index resolves from ?wallet=N / env, defaulting to 1 (the dev
    // Founder; wallet 0 is the Singularity). A full user→wallet mapping is a
    // later milestone.
    const result = await api.birthNode(getWalletIndex());
    const position = chainToVisual(result.coordinate.x, result.coordinate.y);

    // Map tier → starting level (shim for T7)
    const TIER_START_LEVEL: Record<AgentTier, number> = {
      synapse: 1, cortex: 4, lattice: 7, nexus: 10,
    };
    const startLevel = TIER_START_LEVEL[tier] ?? 1;

    return {
      id: `chain-birth-${Date.now()}`,
      userId,
      position,
      level: startLevel,
      miningCpu: 0,
      securingCpu: 0,
      levelingUntilTurn: null,
      isPrimary: false,
      planets: [],
      createdAt: Date.now(),
      username: `Star-${result.coordinate.x},${result.coordinate.y}`,
      borderRadius: TIER_BASE_BORDER[getNodeTier(startLevel)],
      borderPressure: 0,
      cpuPerTurn: getNodeCpuPerTurn(startLevel),
      miningRate: TIER_MINING_RATE[getNodeTier(startLevel)],
      energyLimit: getNodeCpuPerTurn(startLevel) * 5,
      stakedCpu: 0,
    };
  }

  async postHaiku(agentId: string, text: string): Promise<HaikuMessage> {
    // Local broadcast — NetworkChatRoom uses this for network-wide chat
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
    return api.sendMessage(getWalletIndex(), senderChain, targetChain, text);
  }

  async getMessages(coord: { x: number; y: number }): Promise<MessageInfo[]> {
    const chain = visualToChain(coord.x, coord.y);
    return api.getMessages(chain.x, chain.y);
  }

  async setIntro(coord: { x: number; y: number }, message: string): Promise<void> {
    const chain = visualToChain(coord.x, coord.y);
    await api.setIntro(getWalletIndex(), chain, message);
  }

  async claimNode(chainX: number, chainY: number, stake: number = 200): Promise<ClaimNodeResult> {
    // Wallet index resolves from ?wallet=N / env (default 1) so two browsers can
    // drive distinct nodes during a playtest.
    return api.claimNode(getWalletIndex(), chainX, chainY, stake);
  }

  async moveAgent(agentId: string, position: GridPosition): Promise<Agent> {
    throw new Error('moveAgent not supported on testnet');
  }

  // ── Proof-of-Vault (PoAW gate) ────────────────────────────────────────────
  // Thin pass-throughs to the chain vault endpoints. The NodeInspector gate
  // drives these: assignment → (cache-or-fetch shard) → challenge → build proof
  // client-side (vaultProof) → submit. Wallet index resolves per browser tab.

  async getVaultRoot(): Promise<VaultRootResponse> {
    return api.getVaultRoot();
  }

  async getVaultAssignment(walletIndex: number): Promise<VaultAssignmentResponse> {
    return api.getVaultAssignment(walletIndex);
  }

  async getVaultChallenge(walletIndex: number, shardId: number): Promise<VaultChallengeResponse> {
    return api.getVaultChallenge(walletIndex, shardId);
  }

  async getVaultShard(shardId: number, walletIndex: number): Promise<VaultShardResponse> {
    return api.getVaultShard(shardId, walletIndex);
  }

  async submitVaultProof(req: VaultSubmitProofRequest): Promise<VaultSubmitProofResponse> {
    return api.submitVaultProof(req);
  }

  async getVaultStatus(walletIndex: number): Promise<VaultStatusResponse> {
    return api.getVaultStatus(walletIndex);
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

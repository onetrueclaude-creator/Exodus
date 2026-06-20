import type {
  Agent, AgentTier, HaikuMessage, GridPosition, MessageResult, MessageInfo, ClaimNodeResult,
  VaultRootResponse, VaultAssignmentResponse, VaultChallengeResponse, VaultShardResponse,
  VaultSubmitProofRequest, VaultSubmitProofResponse, VaultStatusResponse,
} from '@/types';
import { TIER_BASE_BORDER, TIER_MINING_RATE } from '@/types/agent';
import { getNodeCpuPerTurn, getNodeTier } from '@/lib/nodeTier';
import { generateMockAgents, generateMockHaiku } from './mockData';

export interface ChainService {
  getAgents(): Promise<Agent[]>;
  registerAgent(userId: string, tier: AgentTier): Promise<Agent>;
  postHaiku(agentId: string, text: string): Promise<HaikuMessage>;
  getHaikuFeed(): Promise<HaikuMessage[]>;
  moveAgent(agentId: string, position: GridPosition): Promise<Agent>;
  /** Send a point-to-point message between agents (140 chars max) */
  sendMessage(senderCoord: { x: number; y: number }, targetCoord: { x: number; y: number }, text: string): Promise<MessageResult>;
  /** Fetch message history for a coordinate (max 50 most recent) */
  getMessages(coord: { x: number; y: number }): Promise<MessageInfo[]>;
  /** Set intro greeting for an agent at a coordinate (140 chars max) */
  setIntro(coord: { x: number; y: number }, message: string): Promise<void>;
  /** Claim a grid node on-chain (lightweight, no Record creation) */
  claimNode(chainX: number, chainY: number, stake?: number): Promise<ClaimNodeResult>;

  // ── Proof-of-Vault (PoAW gate) ──────────────────────────────────────────
  /** Vault Merkle-DAG root CID + sizing (atom/shard counts, replication). */
  getVaultRoot(): Promise<VaultRootResponse>;
  /** Shards this player's wallet is responsible for holding/proving. */
  getVaultAssignment(walletIndex: number): Promise<VaultAssignmentResponse>;
  /** Fresh per-block sampled-PDP challenge for a held shard. */
  getVaultChallenge(walletIndex: number, shardId: number): Promise<VaultChallengeResponse>;
  /** Canonical sub-units (hex) the client holds + proves over for a shard. */
  getVaultShard(shardId: number, walletIndex: number): Promise<VaultShardResponse>;
  /** Submit a possession proof through the Singularity gate. */
  submitVaultProof(req: VaultSubmitProofRequest): Promise<VaultSubmitProofResponse>;
  /** Securing history for a wallet (assigned shards, last pass, passes count). */
  getVaultStatus(walletIndex: number): Promise<VaultStatusResponse>;
}

export class MockChainService implements ChainService {
  private agents: Agent[];
  private haiku: HaikuMessage[];
  private blockNumber = 0;

  constructor() {
    this.agents = generateMockAgents(0);
    this.haiku = generateMockHaiku(this.agents);
  }

  async getAgents(): Promise<Agent[]> {
    return [...this.agents];
  }

  async registerAgent(userId: string, tier: AgentTier): Promise<Agent> {
    // Map tier → starting level for the chain shim (T7 will replace this entirely)
    const TIER_START_LEVEL: Record<AgentTier, number> = {
      synapse: 1, cortex: 4, lattice: 7, nexus: 10,
    };
    const startLevel = TIER_START_LEVEL[tier] ?? 1;
    const agent: Agent = {
      id: `agent-${Date.now()}`,
      userId,
      position: { x: 0, y: 0 },
      level: startLevel,
      miningCpu: 0,
      securingCpu: 0,
      levelingUntilTurn: null,
      isPrimary: true,
      planets: [],
      createdAt: Date.now(),
      borderRadius: TIER_BASE_BORDER[getNodeTier(startLevel)],
      borderPressure: 0,
      cpuPerTurn: getNodeCpuPerTurn(startLevel),
      miningRate: TIER_MINING_RATE[getNodeTier(startLevel)],
      energyLimit: getNodeCpuPerTurn(startLevel) * 5,
      stakedCpu: 0,
    };
    this.agents.push(agent);
    return agent;
  }

  async postHaiku(agentId: string, text: string): Promise<HaikuMessage> {
    const agent = this.agents.find(a => a.id === agentId);
    const haiku: HaikuMessage = {
      id: `haiku-${Date.now()}`,
      senderAgentId: agentId,
      text,
      syllables: [5, 7, 5],
      position: agent?.position ?? { x: 0, y: 0 },
      timestamp: Date.now(),
    };
    this.haiku.push(haiku);
    return haiku;
  }

  async getHaikuFeed(): Promise<HaikuMessage[]> {
    return [...this.haiku].sort((a, b) => b.timestamp - a.timestamp);
  }

  async moveAgent(agentId: string, position: GridPosition): Promise<Agent> {
    const agent = this.agents.find(a => a.id === agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    agent.position = position;
    return { ...agent };
  }

  async sendMessage(senderCoord: { x: number; y: number }, targetCoord: { x: number; y: number }, text: string): Promise<MessageResult> {
    return {
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      text,
      sender_coord: senderCoord,
      target_coord: targetCoord,
    };
  }

  async getMessages(_coord: { x: number; y: number }): Promise<MessageInfo[]> {
    return [];
  }

  async setIntro(_coord: { x: number; y: number }, _message: string): Promise<void> {
    // No-op in mock mode
  }

  async claimNode(chainX: number, chainY: number, stake: number = 200): Promise<ClaimNodeResult> {
    return {
      coordinate: { x: chainX, y: chainY },
      stake,
      density: 0.5,
      storage_slots: 4,
      validator_id: this.agents.length,
      message: `Agent created at (${chainX},${chainY}). Node colonized.`,
    };
  }

  async mine(): Promise<{ blockNumber: number; yields: Record<string, number> }> {
    this.blockNumber++;
    return { blockNumber: this.blockNumber, yields: {} };
  }

  // ── Proof-of-Vault (PoAW gate) — synthetic offline implementations ────────
  // Internally consistent so the gate flow is demonstrable offline: the
  // synthetic shard bytes + challenge produce a proof that self-verifies, and
  // submit always "accepts" with the real CPU credit value.

  private mockSubUnits(shardId: number, count = 8): string[] {
    // Deterministic per shard; 32-byte hex sub-units in sorted (canonical) order.
    const units: string[] = [];
    for (let i = 0; i < count; i++) {
      const seed = `mock:${shardId}:${i}`;
      let hex = '';
      for (let b = 0; b < 32; b++) {
        hex += (((seed.charCodeAt((i + b) % seed.length) + b * 31 + shardId) & 0xff))
          .toString(16)
          .padStart(2, '0');
      }
      units.push(hex);
    }
    return units.sort();
  }

  async getVaultRoot(): Promise<VaultRootResponse> {
    return { root_cid: 'mock-root-cid', atom_count: 128, shard_count: 16, replication_factor: 3 };
  }

  async getVaultAssignment(walletIndex: number): Promise<VaultAssignmentResponse> {
    return { wallet_index: walletIndex, owner: `mock-owner-${walletIndex}`, shards: [walletIndex % 16] };
  }

  async getVaultChallenge(_walletIndex: number, shardId: number): Promise<VaultChallengeResponse> {
    const n = this.mockSubUnits(shardId).length;
    return {
      shard_id: shardId,
      indices: Array.from({ length: Math.min(8, n) }, (_, i) => i),
      issued_block: this.blockNumber,
      expires_block: this.blockNumber + 1,
      block_seed_hex: '00'.repeat(32),
    };
  }

  async getVaultShard(shardId: number, _walletIndex: number): Promise<VaultShardResponse> {
    const sub = this.mockSubUnits(shardId);
    return { shard_id: shardId, sub_units: sub, count: sub.length };
  }

  async submitVaultProof(_req: VaultSubmitProofRequest): Promise<VaultSubmitProofResponse> {
    return { accepted: true, cpu_credit: 50.0 };
  }

  async getVaultStatus(walletIndex: number): Promise<VaultStatusResponse> {
    return {
      wallet_index: walletIndex,
      shards: [walletIndex % 16],
      last_pass_block: this.blockNumber,
      secured_passes: 0,
    };
  }
}

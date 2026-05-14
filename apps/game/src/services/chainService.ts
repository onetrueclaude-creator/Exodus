import type { Agent, AgentTier, HaikuMessage, GridPosition, MessageResult, MessageInfo, ClaimNodeResult } from '@/types';
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
}

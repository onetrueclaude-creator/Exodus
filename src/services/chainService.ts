import type { Agent, AgentTier, HaikuMessage, GridPosition } from '@/types';
import { TIER_CPU_COST, TIER_BASE_BORDER, TIER_MINING_RATE } from '@/types/agent';
import { generateMockAgents, generateMockHaiku } from './mockData';

export interface ChainService {
  getAgents(): Promise<Agent[]>;
  registerAgent(userId: string, tier: AgentTier): Promise<Agent>;
  postHaiku(agentId: string, text: string): Promise<HaikuMessage>;
  getHaikuFeed(): Promise<HaikuMessage[]>;
  moveAgent(agentId: string, position: GridPosition): Promise<Agent>;
}

export class MockChainService implements ChainService {
  private agents: Agent[];
  private haiku: HaikuMessage[];

  constructor() {
    this.agents = generateMockAgents(3);
    this.haiku = generateMockHaiku(this.agents);
  }

  async getAgents(): Promise<Agent[]> {
    return [...this.agents];
  }

  async registerAgent(userId: string, tier: AgentTier): Promise<Agent> {
    const agent: Agent = {
      id: `agent-${Date.now()}`,
      userId,
      position: { x: 0, y: 0 },
      tier,
      isPrimary: true,
      planets: [],
      createdAt: Date.now(),
      borderRadius: TIER_BASE_BORDER[tier],
      borderPressure: 0,
      cpuPerTurn: TIER_CPU_COST[tier],
      miningRate: TIER_MINING_RATE[tier],
      energyLimit: TIER_CPU_COST[tier] * 5,
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
}

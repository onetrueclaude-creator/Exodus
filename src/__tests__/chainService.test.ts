import { describe, it, expect, beforeEach } from 'vitest';
import { MockChainService } from '@/services/chainService';
import type { Agent, HaikuMessage } from '@/types';

describe('MockChainService', () => {
  let service: MockChainService;

  beforeEach(() => {
    service = new MockChainService();
  });

  it('returns mock agents', async () => {
    const agents = await service.getAgents();
    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0]).toHaveProperty('id');
    expect(agents[0]).toHaveProperty('tier');
  });

  it('registers a new agent', async () => {
    const agent = await service.registerAgent('new-user', 'opus');
    expect(agent.userId).toBe('new-user');
    expect(agent.tier).toBe('opus');
    expect(agent.isPrimary).toBe(true);
  });

  it('posts a haiku', async () => {
    const haiku = await service.postHaiku('agent-001', 'Morning dew glistens\nSilent whispers fill the air\nPeace in every leaf');
    expect(haiku.senderAgentId).toBe('agent-001');
    expect(haiku.text).toContain('Morning dew');
  });

  it('returns recent haiku', async () => {
    await service.postHaiku('agent-001', 'Morning dew glistens\nSilent whispers fill the air\nPeace in every leaf');
    const feed = await service.getHaikuFeed();
    expect(feed.length).toBeGreaterThan(0);
  });

  it('moves an agent', async () => {
    const agents = await service.getAgents();
    const moved = await service.moveAgent(agents[0].id, { x: 999, y: 888 });
    expect(moved.position).toEqual({ x: 999, y: 888 });
  });
});

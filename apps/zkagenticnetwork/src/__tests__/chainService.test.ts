import { describe, it, expect, beforeEach } from 'vitest';
import { MockChainService } from '@/services/chainService';
import type { Agent, HaikuMessage } from '@/types';

describe('MockChainService', () => {
  let service: MockChainService;

  beforeEach(() => {
    service = new MockChainService();
  });

  it('starts with only unclaimed slots (no simulated users)', async () => {
    const agents = await service.getAgents();
    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0]).toHaveProperty('id');
    expect(agents[0]).toHaveProperty('tier');
    // All agents should be unclaimed (userId is empty)
    const owned = agents.filter(a => a.userId !== '');
    expect(owned).toHaveLength(0);
  });

  it('haiku feed starts empty (no simulated users)', async () => {
    const feed = await service.getHaikuFeed();
    expect(feed).toHaveLength(0);
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

  it('sends a message (mock)', async () => {
    const result = await service.sendMessage(
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      'Hello agent',
    );
    expect(result.text).toBe('Hello agent');
    expect(result.sender_coord).toEqual({ x: 0, y: 0 });
    expect(result.target_coord).toEqual({ x: 100, y: 100 });
    expect(result.id).toBeDefined();
  });

  it('returns empty messages (mock)', async () => {
    const messages = await service.getMessages({ x: 0, y: 0 });
    expect(messages).toEqual([]);
  });

  it('setIntro resolves without error (mock)', async () => {
    await expect(service.setIntro({ x: 0, y: 0 }, 'Welcome!')).resolves.toBeUndefined();
  });

  it('mine increments block number', async () => {
    const result1 = await service.mine();
    expect(result1.blockNumber).toBe(1);
    expect(result1.yields).toEqual({});
    const result2 = await service.mine();
    expect(result2.blockNumber).toBe(2);
  });
});

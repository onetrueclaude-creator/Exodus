import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for testnet API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Testnet integration', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('TestnetChainService.getAgents maps claims to Agent objects', async () => {
    // Mock /api/claims response (only real blockchain claims are fetched now)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { x: 0, y: 0, owner: 'abc123def456', stake: 100, density: 0.5, storage_slots: 5 },
      ],
    });

    const { TestnetChainService } = await import('@/services/testnetChainService');
    const svc = new TestnetChainService();
    const agents = await svc.getAgents();

    expect(agents.length).toBeGreaterThan(0);
    // First agent should be the claimed one
    const claimed = agents.find(a => a.userId !== '');
    expect(claimed).toBeDefined();
    expect(claimed!.tier).toBe('opus'); // stake >= 80
  });

  it('TestnetChainService.mine returns block data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        block_number: 1,
        yields: { 'abc123': 0.5 },
        block_time: Date.now() / 1000,
        next_block_at: Date.now() / 1000 + 60,
        verification_outcome: 'finalized',
        verifiers_assigned: 13,
        valid_proofs: 9,
      }),
    });

    const { TestnetChainService } = await import('@/services/testnetChainService');
    const svc = new TestnetChainService();
    const result = await svc.mine();

    expect(result.blockNumber).toBe(1);
    expect(result.yields).toHaveProperty('abc123');
  });

  it('isTestnetOnline returns false when API unreachable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const { isTestnetOnline } = await import('@/services/testnetApi');
    const online = await isTestnetOnline();
    expect(online).toBe(false);
  });
});

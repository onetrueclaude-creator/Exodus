import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestnetChainService } from '@/services/testnetChainService';
import * as api from '@/services/testnetApi';

vi.mock('@/services/testnetApi');

describe('TestnetChainService', () => {
  let service: TestnetChainService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new TestnetChainService();
  });

  describe('registerAgent (birth)', () => {
    it('calls birthStarSystem and returns mapped Agent', async () => {
      vi.mocked(api.birthStarSystem).mockResolvedValueOnce({
        coordinate: { x: 100, y: -50 },
        ring: 2,
        birth_cost: 200,
        records_created: 2,
        new_claim_count: 1,
      });

      const agent = await service.registerAgent('user-123', 'sonnet');

      expect(api.birthStarSystem).toHaveBeenCalledWith(0);
      expect(agent.tier).toBe('sonnet');
      expect(agent.userId).toBe('user-123');
      expect(agent.position.x).toBeDefined();
      expect(agent.position.y).toBeDefined();
    });

    it('propagates API errors', async () => {
      vi.mocked(api.birthStarSystem).mockRejectedValueOnce(
        new Error('Testnet API POST /api/birth: 400 Bad Request'),
      );

      await expect(service.registerAgent('user-123', 'sonnet'))
        .rejects.toThrow('Testnet API POST /api/birth');
    });
  });
});

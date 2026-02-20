import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import { birthStarSystem } from '@/services/testnetApi';

describe('testnetApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('birthStarSystem', () => {
    it('sends POST with wallet_index in JSON body', async () => {
      const mockResult = {
        coordinate: { x: 142, y: -87 },
        ring: 2,
        birth_cost: 200,
        records_created: 2,
        new_claim_count: 1,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await birthStarSystem(3);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/birth',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_index: 3 }),
        },
      );
      expect(result).toEqual(mockResult);
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(birthStarSystem(99)).rejects.toThrow('Testnet API POST /api/birth');
    });
  });
});

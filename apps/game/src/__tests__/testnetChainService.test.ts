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

  describe('sendMessage', () => {
    it('converts visual coords to chain coords and calls API', async () => {
      vi.mocked(api.sendMessage).mockResolvedValueOnce({
        id: 'msg-001',
        timestamp: 1000,
        text: 'test message',
        sender_coord: { x: 0, y: 0 },
        target_coord: { x: 100, y: 100 },
      });

      const result = await service.sendMessage(
        { x: 0, y: 0 },     // visual sender
        { x: 100, y: 100 },  // visual target
        'test message',
      );

      expect(api.sendMessage).toHaveBeenCalledWith(
        0,
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
        'test message',
      );
      expect(result.text).toBe('test message');
    });
  });

  describe('getMessages', () => {
    it('converts visual coord and fetches messages', async () => {
      vi.mocked(api.getMessages).mockResolvedValueOnce([
        { id: 'msg-1', sender_coord: { x: 5, y: 5 }, text: 'hi', timestamp: 1000 },
      ]);

      const result = await service.getMessages({ x: 200, y: -300 });

      expect(api.getMessages).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
      );
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('hi');
    });
  });

  describe('setIntro', () => {
    it('converts visual coord and calls setIntro API', async () => {
      vi.mocked(api.setIntro).mockResolvedValueOnce({
        status: 'ok',
        message: 'Welcome!',
      });

      await service.setIntro({ x: 500, y: 500 }, 'Welcome!');

      expect(api.setIntro).toHaveBeenCalledWith(
        0,
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
        'Welcome!',
      );
    });
  });
});

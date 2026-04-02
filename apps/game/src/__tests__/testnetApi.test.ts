import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import { birthStarSystem, setIntro, sendMessage, getMessages } from '@/services/testnetApi';

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

  describe('setIntro', () => {
    it('sends POST with wallet_index, coordinate, and message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', message: 'Hello grid' }),
      });

      const result = await setIntro(0, { x: 10, y: -5 }, 'Hello grid');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/intro',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_index: 0,
            agent_coordinate: { x: 10, y: -5 },
            message: 'Hello grid',
          }),
        },
      );
      expect(result.status).toBe('ok');
    });
  });

  describe('sendMessage', () => {
    it('sends POST with sender/target coords and text', async () => {
      const mockResult = {
        id: 'msg-001',
        timestamp: 1000,
        text: 'Greetings agent',
        sender_coord: { x: 10, y: 20 },
        target_coord: { x: 30, y: 40 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await sendMessage(0, { x: 10, y: 20 }, { x: 30, y: 40 }, 'Greetings agent');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/message',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_wallet: 0,
            sender_coord: { x: 10, y: 20 },
            target_coord: { x: 30, y: 40 },
            text: 'Greetings agent',
          }),
        },
      );
      expect(result.id).toBe('msg-001');
      expect(result.text).toBe('Greetings agent');
    });
  });

  describe('getMessages', () => {
    it('fetches message history for a coordinate', async () => {
      const mockMessages = [
        { id: 'msg-1', sender_coord: { x: 5, y: 5 }, text: 'hello', timestamp: 1000 },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMessages),
      });

      const result = await getMessages(10, 20);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8080/api/messages/10/20');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('hello');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0; // CONNECTING
  sent: string[] = [];

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.onopen?.();
    }, 0);
  }

  send(data: string) { this.sent.push(data); }
  close() { this.readyState = 3; this.onclose?.(); }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

vi.stubGlobal('WebSocket', MockWebSocket);

describe('useChainWebSocket', () => {
  beforeEach(() => { MockWebSocket.instances = []; });

  it('should export a function', async () => {
    const mod = await import('@/hooks/useChainWebSocket');
    expect(typeof mod.useChainWebSocket).toBe('function');
  });
});

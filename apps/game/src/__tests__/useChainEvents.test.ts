import { describe, it, expect, vi } from 'vitest';

// Mock EventSource (jsdom does not provide it)
class MockEventSource {
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) {}
  close() {}
}
vi.stubGlobal('EventSource', MockEventSource);

describe('useChainEvents', () => {
  it('should export a function', async () => {
    const mod = await import('@/hooks/useChainEvents');
    expect(typeof mod.useChainEvents).toBe('function');
  });
});

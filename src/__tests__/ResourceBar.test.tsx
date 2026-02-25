import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// Mock @solana/wallet-adapter-react so useWallet works without a provider
vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({ publicKey: null }),
}));

// Mock the store — ResourceBar reads many store slices; supply minimal defaults
vi.mock('@/store', () => ({
  useGameStore: vi.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      cpuTokens: 1000,
      cpuStakedActive: 0,
      cpuStakedTotal: 0,
      devPoints: 0,
      researchPoints: 0,
      storageSize: 0,
      minerals: 0,
      agntcBalance: 0,
      securedChains: 0,
      turn: 1,
      currentUserId: 'u1',
      currentAgentId: null,
      agents: {},
      chainMode: 'offline',
      testnetBlocks: 0,
      resourceDeltas: {},
      cpuTokensEarnedHistory: [],
    })
  ),
}));

describe('ResourceBar — cpuTokensDelta prop', () => {
  let ResourceBar: React.ComponentType<{ cpuTokensDelta?: number; cpuTokensEstPerTurn?: number }>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/components/ResourceBar');
    ResourceBar = mod.default as typeof ResourceBar;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows +N cpu token delta in green after token spend', () => {
    render(<ResourceBar cpuTokensDelta={+42} />);
    const delta = screen.getByText('+42');
    expect(delta).toBeInTheDocument();
    expect(delta).toHaveClass('delta-positive');
  });

  it('shows -N cpu token delta in red after spending', () => {
    render(<ResourceBar cpuTokensDelta={-100} />);
    const delta = screen.getByText('-100');
    expect(delta).toBeInTheDocument();
    expect(delta).toHaveClass('delta-negative');
  });

  it('clears delta after 2 seconds', async () => {
    vi.useFakeTimers();
    render(<ResourceBar cpuTokensDelta={+10} />);
    expect(screen.getByText('+10')).toBeInTheDocument();
    // Advance timers inside act so React flushes state updates
    await act(async () => {
      vi.advanceTimersByTime(2001);
    });
    expect(screen.queryByText('+10')).toBeNull();
  });

  it('shows nothing when cpuTokensDelta is 0', () => {
    render(<ResourceBar cpuTokensDelta={0} />);
    expect(screen.queryByText('+0')).toBeNull();
    expect(screen.queryByText('-0')).toBeNull();
  });

  it('shows nothing when cpuTokensDelta is omitted', () => {
    render(<ResourceBar />);
    // cpuTokens value is shown but no delta span
    expect(screen.queryByText('+0')).toBeNull();
  });

  it('shows est per turn when cpuTokensEstPerTurn provided', () => {
    render(<ResourceBar cpuTokensEstPerTurn={25} />);
    expect(screen.getByText(/est\. \+25/)).toBeInTheDocument();
  });

  it('does not show est per turn when cpuTokensEstPerTurn is 0', () => {
    render(<ResourceBar cpuTokensEstPerTurn={0} />);
    expect(screen.queryByText(/est\./)).toBeNull();
  });

  it('re-shows delta when same value is passed again (key reset)', () => {
    const { rerender } = render(<ResourceBar cpuTokensDelta={-500} />);
    expect(screen.getByText('-500')).toBeInTheDocument();
    // Simulate timer clearing + same value again
    rerender(<ResourceBar cpuTokensDelta={-500} />);
    // With key-based reset, badge should still be visible
    expect(screen.getByText('-500')).toBeInTheDocument();
  });
});

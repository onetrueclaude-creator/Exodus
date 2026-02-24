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
      energy: 1000,
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
      energyEarnedHistory: [],
    })
  ),
}));

describe('ResourceBar — energyDelta prop', () => {
  let ResourceBar: React.ComponentType<{ energyDelta?: number; energyEstPerTurn?: number }>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/components/ResourceBar');
    ResourceBar = mod.default as typeof ResourceBar;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows +N energy delta in green after token spend', () => {
    render(<ResourceBar energyDelta={+42} />);
    const delta = screen.getByText('+42');
    expect(delta).toBeInTheDocument();
    expect(delta).toHaveClass('delta-positive');
  });

  it('shows -N energy delta in red after spending', () => {
    render(<ResourceBar energyDelta={-100} />);
    const delta = screen.getByText('-100');
    expect(delta).toBeInTheDocument();
    expect(delta).toHaveClass('delta-negative');
  });

  it('clears delta after 2 seconds', async () => {
    vi.useFakeTimers();
    render(<ResourceBar energyDelta={+10} />);
    expect(screen.getByText('+10')).toBeInTheDocument();
    // Advance timers inside act so React flushes state updates
    await act(async () => {
      vi.advanceTimersByTime(2001);
    });
    expect(screen.queryByText('+10')).toBeNull();
  });

  it('shows nothing when energyDelta is 0', () => {
    render(<ResourceBar energyDelta={0} />);
    expect(screen.queryByText('+0')).toBeNull();
    expect(screen.queryByText('-0')).toBeNull();
  });

  it('shows nothing when energyDelta is omitted', () => {
    render(<ResourceBar />);
    // energy value is shown but no delta span
    expect(screen.queryByText('+0')).toBeNull();
  });

  it('shows est per turn when energyEstPerTurn provided', () => {
    render(<ResourceBar energyEstPerTurn={25} />);
    expect(screen.getByText(/est\. \+25/)).toBeInTheDocument();
  });

  it('does not show est per turn when energyEstPerTurn is 0', () => {
    render(<ResourceBar energyEstPerTurn={0} />);
    expect(screen.queryByText(/est\./)).toBeNull();
  });
});

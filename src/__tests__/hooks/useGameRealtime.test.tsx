import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data: { blocks_processed: 5, state_root: 'abc', community_pool_remaining: 100, total_mined: 50, next_block_in: 45 }, error: null })),
      data: [], error: null,
    })),
  })),
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => mockSupabase),
}))

const mockSetChainStatus = vi.fn()
const mockSyncAgentFromChain = vi.fn()

vi.mock('@/store/gameStore', () => ({
  useGameStore: vi.fn((selector) => selector({
    setChainStatus: mockSetChainStatus,
    syncAgentFromChain: mockSyncAgentFromChain,
  })),
}))

describe('useGameRealtime', () => {
  beforeEach(() => vi.clearAllMocks())

  it('subscribes to chain_status and agents channels on mount', async () => {
    const { useGameRealtime } = await import('@/hooks/useGameRealtime')
    renderHook(() => useGameRealtime())
    expect(mockSupabase.channel).toHaveBeenCalledWith('game-state')
    expect(mockChannel.on).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ table: 'chain_status' }), expect.any(Function))
    expect(mockChannel.on).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ table: 'agents' }), expect.any(Function))
  })

  it('calls setChainStatus on initial chain_status fetch', async () => {
    const { useGameRealtime } = await import('@/hooks/useGameRealtime')
    renderHook(() => useGameRealtime())
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mockSetChainStatus).toHaveBeenCalled()
  })
})

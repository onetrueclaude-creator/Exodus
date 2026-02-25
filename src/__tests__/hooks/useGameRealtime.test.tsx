import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}

const mockChainStatusRow = { blocks_processed: 5, state_root: 'abc', total_mined: 50, next_block_in: 45 }
const mockAgentRow = { id: 'agent-1', user_id: null, chain_x: 0, chain_y: 0, visual_x: 0, visual_y: 0, tier: 'haiku', is_primary: false, username: null, bio: null, intro_message: null, density: 0.5, storage_slots: 1, stake: 0, border_radius: 30, mining_rate: 1, cpu_per_turn: 1, staked_cpu: 0, parent_agent_id: null, synced_at: new Date().toISOString() }

const mockSupabase = {
  from: vi.fn((table: string) => ({
    select: vi.fn(() =>
      table === 'chain_status'
        ? { single: vi.fn(async () => ({ data: mockChainStatusRow, error: null })) }
        : Promise.resolve({ data: [mockAgentRow], error: null })
    ),
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

  it('calls setChainStatus and syncAgentFromChain on initial hydration', async () => {
    const { useGameRealtime } = await import('@/hooks/useGameRealtime')
    renderHook(() => useGameRealtime())
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mockSetChainStatus).toHaveBeenCalledWith(expect.objectContaining({ blocks: 5, stateRoot: 'abc' }))
    expect(mockSyncAgentFromChain).toHaveBeenCalledWith(expect.objectContaining({ id: 'agent-1' }))
  })
})

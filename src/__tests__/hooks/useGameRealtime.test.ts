import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGameRealtime } from '@/hooks/useGameRealtime'

// Mock Supabase client.
// hydrate() calls:
//   supabase.from('chain_status').select('*').single()  -> needs .single()
//   supabase.from('agents').select('*')                 -> awaited directly, no .single()
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn(() =>
        table === 'chain_status'
          ? { single: vi.fn(async () => ({ data: null, error: null })) }
          : Promise.resolve({ data: [], error: null })
      ),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}))

// Mock store actions
vi.mock('@/store/gameStore', () => ({
  useGameStore: vi.fn((selector: (s: unknown) => unknown) =>
    selector({
      setChainStatus: vi.fn(),
      syncAgentFromChain: vi.fn(),
    })
  ),
}))

describe('useGameRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns isReady=false before hydration, true after', async () => {
    const { result } = renderHook(() => useGameRealtime())
    expect(result.current.isReady).toBe(false)
    await waitFor(() => expect(result.current.isReady).toBe(true))
  })
})

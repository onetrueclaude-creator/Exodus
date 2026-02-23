import { describe, it, expect, vi } from 'vitest'

const mockUpsert = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({ upsert: mockUpsert })),
  })),
}))

describe('persistResources', () => {
  it('calls supabase upsert with correct table and data', async () => {
    const { persistResources } = await import('@/lib/persistResources')
    await persistResources('user-1', { energy: 500, minerals: 30, agntc_balance: 45, secured_chains: 2, turn: 10 })
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', energy: 500 }),
      { onConflict: 'user_id' }
    )
  })

  it('warns on supabase error without throwing', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'DB down' } })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { persistResources } = await import('@/lib/persistResources')
    await expect(
      persistResources('user-1', { energy: 0, minerals: 0, agntc_balance: 0, secured_chains: 0, turn: 0 })
    ).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith('[persistResources] failed:', 'DB down')
    warnSpy.mockRestore()
  })
})

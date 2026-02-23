import { describe, it, expect, vi } from 'vitest'

const mockInsert = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({ insert: mockInsert })),
  })),
}))

describe('social state persistence', () => {
  it('inserts planet to Supabase when persistPlanet is called', async () => {
    const { persistPlanet } = await import('@/lib/persistSocial')
    await persistPlanet({ id: 'p1', agentId: 'a1', content: 'test', contentType: 'post', isZeroKnowledge: false, createdAt: Date.now() }, 'user-123')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }))
  })

  it('warns on supabase error without throwing', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'DB down' } })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { persistPlanet } = await import('@/lib/persistSocial')
    await expect(
      persistPlanet({ id: 'p2', agentId: 'a1', content: 'err', contentType: 'post', isZeroKnowledge: false, createdAt: Date.now() })
    ).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

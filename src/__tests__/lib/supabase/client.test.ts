import { describe, it, expect, vi } from 'vitest'

// Mock @supabase/supabase-js before importing
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

describe('supabase client helpers', () => {
  it('createBrowserClient returns a client object', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    const { createBrowserClient } = await import('@/lib/supabase/client')
    const client = createBrowserClient()
    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })
})

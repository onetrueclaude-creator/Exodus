import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(async (_req) => ({
    supabaseResponse: { headers: { get: (_name: string) => null } },
    user: null,
  })),
}))

describe('middleware', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('redirects unauthenticated user from /game to /', async () => {
    const { default: middleware } = await import('@/middleware')
    const req = new NextRequest('http://localhost:3000/game')
    const res = await middleware(req)
    expect(res?.headers.get('location')).toContain('/')
  })

  it('allows unauthenticated user to access /', async () => {
    const { default: middleware } = await import('@/middleware')
    const req = new NextRequest('http://localhost:3000/')
    const res = await middleware(req)
    expect(res?.headers.get('location')).toBeNull()
  })
})

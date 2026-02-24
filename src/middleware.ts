import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user } = await updateSession(request)

  // DEV BYPASS — skip auth in development, go straight to /game from landing
  if (process.env.NODE_ENV === 'development') {
    if (pathname === '/') return NextResponse.redirect(new URL('/game', request.url))
    return supabaseResponse
  }

  // Always allow: auth callbacks, static, public API
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/waitlist') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return supabaseResponse
  }

  // Landing page: authenticated users skip to game flow
  if (pathname === '/') {
    if (user) return NextResponse.redirect(new URL('/game', request.url))
    return supabaseResponse
  }

  // All other routes require auth
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Check onboarding completeness
  if (pathname === '/game' || pathname === '/onboard' || pathname === '/subscribe') {
    try {
      const statusRes = await fetch(new URL('/api/user/status', request.url), {
        headers: { cookie: request.headers.get('cookie') || '' },
      })
      if (statusRes.ok) {
        const profile = await statusRes.json()
        if (!profile.username && pathname !== '/onboard') {
          return NextResponse.redirect(new URL('/onboard', request.url))
        }
        if (profile.username && !profile.subscription_tier && pathname !== '/subscribe') {
          return NextResponse.redirect(new URL('/subscribe', request.url))
        }
        if (profile.username && profile.subscription_tier && pathname !== '/game') {
          return NextResponse.redirect(new URL('/game', request.url))
        }
      }
    } catch {}
  }

  return supabaseResponse
}

export default middleware

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

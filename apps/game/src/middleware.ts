import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  // DEV BYPASS: skip all auth checks in development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Always allow auth API, static assets, and public API routes
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/waitlist') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Landing page: authenticated users skip to game flow
  if (pathname === '/') {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/game', req.url));
    }
    return NextResponse.next();
  }

  // All other routes require authentication
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // For authenticated users hitting /game, /onboard, /subscribe:
  // Check onboarding completeness via internal API
  if (pathname === '/game' || pathname === '/onboard' || pathname === '/subscribe') {
    try {
      const userRes = await fetch(new URL('/api/user/status', req.url), {
        headers: { cookie: req.headers.get('cookie') || '' },
      });
      if (userRes.ok) {
        const user = await userRes.json();
        const hasUsername = !!user.username;
        const hasSubscription = !!user.subscription;

        // Route to correct onboarding step
        if (!hasUsername && pathname !== '/onboard') {
          return NextResponse.redirect(new URL('/onboard', req.url));
        }
        if (hasUsername && !hasSubscription && pathname !== '/subscribe') {
          return NextResponse.redirect(new URL('/subscribe', req.url));
        }
        if (hasUsername && hasSubscription && pathname !== '/game') {
          return NextResponse.redirect(new URL('/game', req.url));
        }
      }
    } catch {
      // If status check fails, allow through (fail-open for dev)
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

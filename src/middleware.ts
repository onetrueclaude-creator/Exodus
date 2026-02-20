import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';

const isDev = process.env.NODE_ENV === 'development';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Dev mode bypass — developers access everything directly
  if (isDev) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Production: only the landing page and static assets are public.
  // Everything else is locked during development.
  if (
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Block ALL other routes (API, /game, /login, /subscribe, etc.)
  // Redirect to the "under development" landing page
  return NextResponse.redirect(new URL('/', req.url));
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

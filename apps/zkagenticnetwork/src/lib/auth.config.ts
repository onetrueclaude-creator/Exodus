import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';

/**
 * Lightweight auth config — no Prisma adapter.
 * Used by middleware (runs on Edge, can't use Node.js Prisma).
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: '/',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = nextUrl.pathname.startsWith('/game') ||
                          nextUrl.pathname.startsWith('/onboard') ||
                          nextUrl.pathname.startsWith('/subscribe');
      if (isProtected && !isLoggedIn) return false;
      return true;
    },
  },
};

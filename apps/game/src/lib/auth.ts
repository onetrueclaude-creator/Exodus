import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

/**
 * Auth setup — JWT sessions for now.
 * PrismaAdapter will be added once the database is running.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? token.email;
      }
      return token;
    },
    session({ session, token }) {
      // JWT strategy (no adapter): identity lives on the token, not `user`.
      // Tier/role are NOT put on the session — they are server-authoritative via
      // GET /api/me (DB + Founder allowlist). See identity-tier-security spec.
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.email = (token.email as string) ?? session.user.email;
      }
      return session;
    },
  },
});

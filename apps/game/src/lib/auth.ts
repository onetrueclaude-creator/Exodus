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
      }
      return token;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        (session as any).user.username = u.username;
        (session as any).user.subscription = u.subscription;
        (session as any).user.phantomWalletHash = u.phantomWalletHash;
        (session as any).user.blockchainToken = u.blockchainTokenX != null
          ? { x: u.blockchainTokenX, y: u.blockchainTokenY }
          : null;
      }
      return session;
    },
  },
});

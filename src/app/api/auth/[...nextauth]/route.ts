import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getGoogleUserRole } from '@/lib/admin-config';

function getNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXTAUTH_SECRET is required in production. Configure it in the deployment environment before starting HELE.'
    );
  }

  return 'hele-local-development-only-secret';
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id || user.email || '';
        token.name = user.name || '';
        token.picture = user.image || '';
      }

      if (account?.provider === 'google' && user.email) {
        token.provider = 'google';
        token.email = user.email;

        const { username, role } = getGoogleUserRole(user.email);
        token.username = username;
        token.role = role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;

        if (token.picture) {
          session.user.image = token.picture as string;
        }

        (session.user as Record<string, unknown>).provider = token.provider;
        (session.user as Record<string, unknown>).username = token.username;
        (session.user as Record<string, unknown>).role = token.role;
      }

      return session;
    },
  },
  secret: getNextAuthSecret(),
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

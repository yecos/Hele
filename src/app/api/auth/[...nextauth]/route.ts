import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { USERS_DB } from '@/lib/users';
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
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const username = credentials.username.toLowerCase();
        const user = USERS_DB[username];

        if (!user || user.password !== credentials.password) {
          return null;
        }

        return {
          id: username,
          name: user.name,
          email: `${username}@xuperstream.app`,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn() {
      return true;
    },
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

      if (account?.provider === 'credentials') {
        const dbUser = USERS_DB[token.id as string];
        if (dbUser) {
          token.username = token.id;
          token.role = dbUser.role;
          token.provider = 'credentials';
        }
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

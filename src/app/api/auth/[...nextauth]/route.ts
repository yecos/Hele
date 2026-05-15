import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const USERS_DB: Record<string, { password: string; name: string }> = {
  admin: { password: 'admin123', name: 'Admin' },
  hele: { password: 'hele123', name: 'Hele' },
  usuario: { password: 'usuario123', name: 'Usuario' },
};

const handler = NextAuth({
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
        const user = USERS_DB[credentials.username.toLowerCase()];
        if (user && user.password === credentials.password) {
          return {
            id: credentials.username.toLowerCase(),
            name: user.name,
            email: `${credentials.username.toLowerCase()}@xuperstream.app`,
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: undefined,
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth: allow all Google sign-ins
      if (account?.provider === 'google') {
        console.log(`[NextAuth] Google sign-in: ${user.email}`);
        return true;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // On first sign-in, `user` and `account` are populated
      if (user) {
        token.id = user.id || user.email || '';
        token.name = user.name || '';
        token.picture = user.image || '';
      }
      // Mark if this was a Google OAuth sign-in
      if (account?.provider === 'google') {
        token.provider = 'google';
        token.email = user.email || '';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        // Preserve the Google image
        if (token.picture) {
          session.user.image = token.picture as string;
        }
        // Add provider info for client-side detection
        (session.user as Record<string, unknown>).provider = token.provider;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'xuperstream-secret-key-change-in-production-2024',
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };

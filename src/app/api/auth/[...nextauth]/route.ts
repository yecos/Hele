import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

// ========================================
// USER DATABASE
// ========================================
const USERS_DB: Record<string, { password: string; name: string; role: string }> = {
  admin: { password: 'admin123', name: 'Admin', role: 'admin' },
  hele: { password: 'hele123', name: 'Hele', role: 'user' },
  usuario: { password: 'usuario123', name: 'Usuario', role: 'user' },
};

// Google accounts that get admin access
const GOOGLE_ADMIN_EMAILS = ['yecos11@gmail.com'];

// All allowed Google accounts (admin emails + any gmail is allowed)
// If you want to restrict to only specific emails, change this logic
function getGoogleUserRole(email: string): { username: string; role: string } {
  const emailPrefix = email.split('@')[0].toLowerCase();
  if (GOOGLE_ADMIN_EMAILS.includes(email.toLowerCase())) {
    return { username: 'admin', role: 'admin' };
  }
  return { username: emailPrefix, role: 'user' };
}

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
      if (account?.provider === 'google' && user.email) {
        token.provider = 'google';
        token.email = user.email;
        // Assign role based on email
        const { username, role } = getGoogleUserRole(user.email);
        token.username = username;
        token.role = role;
      }
      // For credentials, check role from DB
      if (account?.provider === 'credentials') {
        const dbUser = USERS_DB[token.id as string];
        if (dbUser) {
          token.role = dbUser.role;
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
        // Custom fields for client-side
        (session.user as Record<string, unknown>).provider = token.provider;
        (session.user as Record<string, unknown>).username = token.username;
        (session.user as Record<string, unknown>).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'xuperstream-secret-key-change-in-production-2024',
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };

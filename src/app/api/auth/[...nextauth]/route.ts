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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'xuperstream-secret-key-change-in-production-2024',
});

export { handler as GET, handler as POST };

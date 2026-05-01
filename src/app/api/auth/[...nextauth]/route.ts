import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';

// Hardcoded users for personal/demo use
const USERS_DB: Record<string, { password: string; name: string; role: string }> = {
  admin: { password: 'admin123', name: 'Admin', role: 'admin' },
  hele: { password: 'hele123', name: 'Hele', role: 'user' },
  usuario: { password: 'usuario123', name: 'Usuario', role: 'user' },
};

export const authOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.given_name || 'Google User',
          email: profile.email,
          image: profile.picture,
          role: 'user',
          provider: 'google',
        };
      },
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
            role: user.role,
            provider: 'credentials',
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google sign-in, update the user provider field
      if (account?.provider === 'google' && user.email) {
        try {
          await db.user.update({
            where: { email: user.email },
            data: { provider: 'google', image: user.image || undefined },
          });
        } catch {
          // User might not exist yet, PrismaAdapter handles creation
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // On sign in, add custom fields to token
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'user';
        token.provider = (user as any).provider || 'credentials';
      }
      // On session update, refresh the token
      if (trigger === 'update' && session) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        (session.user as any).role = token.role as string;
        (session.user as any).provider = token.provider as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After sign in, redirect to home
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

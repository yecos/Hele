'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';

/** Inner component that syncs NextAuth session → Zustand auth store */
function SessionSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { isLoggedIn, setUsername } = useAuthStore();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // NextAuth has an active session (e.g. after Google login)
      // Sync to Zustand + localStorage so the app knows we're logged in
      const username = session.user.email?.split('@')[0] || session.user.name || 'google-user';
      const authData = {
        username,
        name: session.user.name || 'Google User',
        email: session.user.email || '',
        image: session.user.image || '',
        token: 'nextauth-session',
        provider: 'google',
      };

      // Only update if not already logged in with the same data
      const stored = localStorage.getItem('xs-auth');
      const parsed = stored ? JSON.parse(stored) : null;

      if (!parsed || parsed.username !== username || parsed.provider !== 'google') {
        localStorage.setItem('xs-auth', JSON.stringify(authData));
        useAuthStore.setState({
          isLoggedIn: true,
          username,
          isLoading: false,
        });
      }
    }
  }, [session, status, isLoggedIn, setUsername]);

  return <>{children}</>;
}

/** Wraps the app with NextAuth SessionProvider + session sync */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionSync>{children}</SessionSync>
    </SessionProvider>
  );
}

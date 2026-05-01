'use client';

import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/lib/store';

/**
 * AuthProvider wraps SessionProvider for NextAuth.
 * AuthSyncInner bridges NextAuth session → Zustand store.
 * Both are combined in a single client component to avoid
 * React 19 hook resolution issues with next-auth@4.
 */
function AuthSyncInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const { setFromSession, clearAuth } = useAuthStore();

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      setFromSession({
        isLoggedIn: true,
        username: session.user.name || session.user.email?.split('@')[0] || 'User',
        userImage: session.user.image || '',
        userEmail: session.user.email || '',
        userRole: (session.user as any).role || 'user',
        userProvider: (session.user as any).provider || 'credentials',
      });
      localStorage.setItem('xs-auth', JSON.stringify({
        username: session.user.name || session.user.email?.split('@')[0] || 'User',
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: (session.user as any).role || 'user',
        provider: (session.user as any).provider || 'credentials',
      }));
    } else if (status === 'unauthenticated') {
      clearAuth();
      localStorage.removeItem('xs-auth');
    }
  }, [session, status, setFromSession, clearAuth]);

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60}>
      <AuthSyncInner>
        {children}
      </AuthSyncInner>
    </SessionProvider>
  );
}

export { signIn, signOut };

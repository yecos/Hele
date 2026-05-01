'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/lib/store';

/**
 * AuthSync bridges NextAuth's useSession with the Zustand auth store.
 * Place this inside <AuthProvider> so it can access the session.
 * Components can continue using useAuthStore() for state, while
 * actual auth operations (signIn/signOut) go through next-auth/react.
 */
export function AuthSync({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const { setFromSession, clearAuth } = useAuthStore();

  useEffect(() => {
    if (status === 'loading') return; // Wait for session to load

    if (session?.user) {
      setFromSession({
        isLoggedIn: true,
        username: session.user.name || session.user.email?.split('@')[0] || 'User',
        userImage: session.user.image || '',
        userEmail: session.user.email || '',
        userRole: (session.user as any).role || 'user',
        userProvider: (session.user as any).provider || 'credentials',
      });
      // Also persist to localStorage for splash screen / initial load
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

// Re-export next-auth functions for easy access
export { signIn, signOut };

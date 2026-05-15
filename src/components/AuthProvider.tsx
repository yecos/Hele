'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';

/** Inner component that syncs NextAuth session → Zustand auth store */
function SessionSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
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
      try {
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
      } catch {
        // localStorage not available
      }
    }
  }, [session, status]);

  return <>{children}</>;
}

/** Wraps the app with NextAuth SessionProvider + session sync.
 *  Uses an error boundary so NextAuth issues never break the app. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    // If SessionProvider fails, just render children without it
    return <>{children}</>;
  }

  return (
    <ErrorBoundary fallback={<>{children}</>} onError={() => setHasError(true)}>
      <SessionProvider>
        <SessionSync>{children}</SessionSync>
      </SessionProvider>
    </ErrorBoundary>
  );
}

/** Minimal error boundary for class-component requirement */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[AuthProvider] SessionProvider error, falling back:', error.message);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

import React from 'react';

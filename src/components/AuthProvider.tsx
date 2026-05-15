'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import React from 'react';

import { ADMIN_EMAILS } from '@/lib/admin-config';

/** Maps a Google session to a local username and role */
function mapGoogleUser(email: string, name: string, image?: string) {
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
  const username = isAdmin ? 'admin' : email.split('@')[0].toLowerCase();

  return {
    username,
    name: name || 'Google User',
    email,
    image: image || '',
    token: 'nextauth-session',
    provider: 'google',
    role: isAdmin ? 'admin' : 'user',
  };
}

/** Inner component that syncs NextAuth session → Zustand auth store */
function SessionSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const email = session.user.email || '';
      const name = session.user.name || '';
      const image = session.user.image || '';

      // Use server-assigned username/role if available, otherwise map locally
      const serverUsername = (session.user as Record<string, unknown>).username as string | undefined;
      const serverRole = (session.user as Record<string, unknown>).role as string | undefined;

      let authData;
      if (serverUsername) {
        // Server mapped the user already
        authData = {
          username: serverUsername,
          name,
          email,
          image,
          token: 'nextauth-session',
          provider: 'google',
          role: serverRole || 'user',
        };
      } else {
        // Fallback: map locally
        authData = mapGoogleUser(email, name, image);
      }

      try {
        const stored = localStorage.getItem('xs-auth');
        const parsed = stored ? JSON.parse(stored) : null;

        if (!parsed || parsed.username !== authData.username || parsed.provider !== 'google') {
          localStorage.setItem('xs-auth', JSON.stringify(authData));
          useAuthStore.setState({
            isLoggedIn: true,
            username: authData.username,
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

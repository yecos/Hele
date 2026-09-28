import { create } from 'zustand';

interface AuthState {
  isLoggedIn: boolean;
  username: string;
  isLoading: boolean;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  username: '',
  isLoading: false,

  loginWithGoogle: async () => {
    set({ isLoading: true });

    try {
      const { signIn } = await import('next-auth/react');
      const result = await signIn('google', {
        callbackUrl: '/',
        redirect: false,
      });

      if (result?.error) {
        console.warn('[Auth] Google sign-in failed:', result.error);
        set({ isLoading: false });
        return false;
      }

      if (result?.url) {
        window.location.assign(result.url);
        return true;
      }

      set({ isLoading: false });
      return true;
    } catch (error) {
      console.error('[Auth] Google sign-in failed:', error);
      set({ isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('xs-auth');
    set({ isLoggedIn: false, username: '' });

    void import('next-auth/react')
      .then(({ signOut }) => signOut({ callbackUrl: '/' }))
      .catch((error) => console.warn('[Auth] NextAuth signOut error:', error));
  },

  checkAuth: () => {
    try {
      const stored = localStorage.getItem('xs-auth');

      if (stored) {
        const parsed = JSON.parse(stored);

        if (parsed.username && typeof parsed.username === 'string') {
          set({
            isLoggedIn: true,
            username: parsed.username.toLowerCase(),
          });
          return;
        }
      }
    } catch (error) {
      console.warn('[Auth] checkAuth error:', error);
    }

    set({ isLoggedIn: false, username: '' });
  },
}));

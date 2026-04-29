import { create } from 'zustand';
import type { MovieItem, TMDBMovieDetail } from './tmdb';
import type { StreamSource, ServerGroup, AudioLang } from './sources';

// ==================== AUTH STATE ====================
interface AuthState {
  isLoggedIn: boolean;
  username: string;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  username: '',
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
        redirect: 'false',
        username,
        password,
        csrfToken: '',
        callbackUrl: '/',
      }).toString(),
      });

      if (res.ok) {
        // Try NextAuth sign in
        try {
          const signInRes = await fetch('/api/auth/signin/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, redirect: false }),
          });
          if (signInRes.ok) {
            const data = await signInRes.json();
            if (data.url) {
              set({ isLoggedIn: true, username: username.toLowerCase(), isLoading: false });
              return true;
            }
          }
        } catch {
          // Fallback: use legacy login endpoint
        }

        // Fallback to legacy auth
        const legacyRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await legacyRes.json();
        if (data.success) {
          localStorage.setItem('xs-auth', JSON.stringify({ username: data.username.toLowerCase(), token: data.token }));
          set({ isLoggedIn: true, username: data.username.toLowerCase(), isLoading: false });
          return true;
        }
      }

      set({ isLoading: false });
      return false;
    } catch {
      // Fallback to legacy
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('xs-auth', JSON.stringify({ username: data.username.toLowerCase(), token: data.token }));
          set({ isLoggedIn: true, username: data.username.toLowerCase(), isLoading: false });
          return true;
        }
      } catch {}
      set({ isLoading: false });
      return false;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true });
    try {
      // Try NextAuth Google OAuth
      const res = await fetch('/api/auth/signin/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect: false, callbackUrl: '/' }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          // Google OAuth configured — redirect to Google consent screen
          window.location.href = data.url;
          return true;
        }
      }

      // Google OAuth not configured — use demo mode
      console.log('Google OAuth not configured (missing GOOGLE_CLIENT_ID). Using demo mode.');
      const googleUser = {
        username: 'Google User',
        name: 'Google User',
        email: 'user@gmail.com',
        image: '',
        provider: 'google',
      };
      localStorage.setItem('xs-auth', JSON.stringify({
        username: googleUser.username,
        name: googleUser.name,
        email: googleUser.email,
        image: googleUser.image,
        token: 'google-demo-token',
        provider: 'google',
      }));
      set({ isLoggedIn: true, username: googleUser.username, isLoading: false });
      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('xs-auth');
    set({ isLoggedIn: false, username: '' });
  },

  checkAuth: () => {
    try {
      const stored = localStorage.getItem('xs-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.username) {
          set({ isLoggedIn: true, username: parsed.username.toLowerCase() });
          return;
        }
      }
    } catch {}
    set({ isLoggedIn: false, username: '' });
  },
}));

// ==================== VIEW STATE ====================
export type ViewType = 'home' | 'movies' | 'series' | 'iptv' | 'search' | 'history' | 'favorites' | 'settings';

interface ViewState {
  currentView: ViewType;
  searchQuery: string;
  selectedGenre: number | null;
  setView: (view: ViewType) => void;
  setSearchQuery: (q: string) => void;
  setSelectedGenre: (g: number | null) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'home',
  searchQuery: '',
  selectedGenre: null,
  setView: (view) => set({ currentView: view, searchQuery: '' }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedGenre: (g) => set({ selectedGenre: g }),
}));

// ==================== PLAYER STATE ====================
interface PlayerState {
  isPlaying: boolean;
  currentMovie: MovieItem | null;
  currentDetail: TMDBMovieDetail | null;
  currentSeason: number;
  currentEpisode: number;
  currentServerUrl: string;
  currentServerName: string;
  currentLang: AudioLang;
  serverGroups: ServerGroup[];
  isLoadingServers: boolean;
  showDetail: boolean;
  openDetail: () => void;
  closeDetail: () => void;

  playMovie: (movie: MovieItem, detail?: TMDBMovieDetail) => void;
  playEpisode: (season: number, episode: number) => void;
  closePlayer: () => void;
  setServerGroups: (groups: ServerGroup[]) => void;
  selectServer: (source: StreamSource) => void;
  selectLang: (lang: AudioLang) => void;
  setDetail: (detail: TMDBMovieDetail) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentMovie: null,
  currentDetail: null,
  currentSeason: 1,
  currentEpisode: 1,
  currentServerUrl: '',
  currentServerName: '',
  currentLang: 'latino',
  serverGroups: [],
  isLoadingServers: false,
  showDetail: false,

  playMovie: (movie, detail) => set({
    isPlaying: true,
    currentMovie: movie,
    currentDetail: detail || null,
    currentSeason: 1,
    currentEpisode: 1,
    currentServerUrl: '',
    currentServerName: '',
    serverGroups: [],
    isLoadingServers: true,
  }),

  playEpisode: (season, episode) => set({
    currentSeason: season,
    currentEpisode: episode,
    currentServerUrl: '',
    currentServerName: '',
    serverGroups: [],
    isLoadingServers: true,
  }),

  closePlayer: () => set({
    isPlaying: false,
    showDetail: false,
    currentMovie: null,
    currentDetail: null,
    currentServerUrl: '',
    currentServerName: '',
    serverGroups: [],
    isLoadingServers: false,
  }),

  setServerGroups: (groups) => set({
    serverGroups: groups,
    isLoadingServers: false,
    currentServerUrl: groups.length > 0 && groups[0].sources.length > 0 ? groups[0].sources[0].url : '',
    currentServerName: groups.length > 0 && groups[0].sources.length > 0 ? groups[0].sources[0].name : '',
    currentLang: groups.length > 0 ? groups[0].lang : 'latino',
  }),

  selectServer: (source) => set({
    currentServerUrl: source.url,
    currentServerName: source.name,
  }),

  selectLang: (lang) => set({ currentLang: lang }),
  setDetail: (detail) => set({ currentDetail: detail }),
  openDetail: () => set({ showDetail: true }),
  closeDetail: () => set({ showDetail: false }),
}));

// ==================== CAST STATE ====================
interface CastState {
  isCasting: boolean;
  castDevice: string | null;
  setCastState: (isCasting: boolean, device?: string | null) => void;
}

export const useCastStore = create<CastState>((set) => ({
  isCasting: false,
  castDevice: null,
  setCastState: (isCasting, device = null) => set({ isCasting, castDevice: device }),
}));

// ==================== FAVORITES STATE ====================
interface FavoritesState {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('xuper-favorites') || '[]') : [],

  toggleFavorite: (id) => {
    const current = get().favorites;
    const updated = current.includes(id)
      ? current.filter(f => f !== id)
      : [...current, id];
    localStorage.setItem('xuper-favorites', JSON.stringify(updated));
    set({ favorites: updated });
  },

  isFavorite: (id) => get().favorites.includes(id),
}));

// ==================== WATCH HISTORY ====================
interface WatchHistoryItem {
  id: string;
  movieId: string;
  title: string;
  posterUrl: string;
  mediaType: 'movie' | 'tv';
  timestamp: number;
  progress: number;
  duration: number;
}

interface HistoryState {
  history: WatchHistoryItem[];
  addToHistory: (item: Omit<WatchHistoryItem, 'timestamp'>) => void;
  removeFromHistory: (movieId: string) => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('xuper-history') || '[]') : [],

  addToHistory: (item) => {
    const current = get().history.filter(h => h.movieId !== item.movieId);
    const updated = [{ ...item, timestamp: Date.now() }, ...current].slice(0, 50);
    localStorage.setItem('xuper-history', JSON.stringify(updated));
    set({ history: updated });
  },

  removeFromHistory: (movieId) => {
    const updated = get().history.filter(h => h.movieId !== movieId);
    localStorage.setItem('xuper-history', JSON.stringify(updated));
    set({ history: updated });
  },
}));

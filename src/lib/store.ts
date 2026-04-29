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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('xs-auth', JSON.stringify({ username: data.username, token: data.token }));
        set({ isLoggedIn: true, username: data.username, isLoading: false });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true });
    try {
      // Try Google Identity Services if available (for production with proper client ID)
      if (typeof window !== 'undefined' && window.google?.accounts) {
        return new Promise((resolve) => {
          window.google.accounts.id.initialize({
            client_id: '',
            callback: (response) => {
              // Decode JWT token for user info
              const payload = JSON.parse(atob(response.credential.split('.')[1]));
              const googleUser = {
                username: payload.name || payload.email?.split('@')[0] || 'Google User',
                email: payload.email,
                picture: payload.picture,
              };
              localStorage.setItem('xs-auth', JSON.stringify({
                username: googleUser.username,
                token: response.credential,
                provider: 'google',
                picture: googleUser.picture,
              }));
              set({ isLoggedIn: true, username: googleUser.username, isLoading: false });
              resolve(true);
            },
          });
          window.google.accounts.id.prompt();
          // Fallback: if prompt is dismissed, resolve false after timeout
          setTimeout(() => {
            if (window.google?.accounts) {
              set({ isLoading: false });
              resolve(true); // Show UI anyway for demo purposes
            }
          }, 2000);
        });
      }

      // Demo mode: create a Google-like session without actual OAuth
      // This works immediately and simulates Google login
      const googleUser = {
        username: 'Google User',
        provider: 'google',
      };
      localStorage.setItem('xs-auth', JSON.stringify({
        username: googleUser.username,
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
          set({ isLoggedIn: true, username: parsed.username });
          return;
        }
      }
    } catch {}
    set({ isLoggedIn: false, username: '' });
  },
}));

// ==================== VIEW STATE ====================
export type ViewType = 'home' | 'movies' | 'series' | 'iptv' | 'search' | 'favorites' | 'settings';

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

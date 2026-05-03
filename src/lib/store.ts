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
        if (parsed.username && typeof parsed.username === 'string') {
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
  setView: (view) => set((state) => ({
    currentView: view,
    // Only clear searchQuery when navigating AWAY from search, not into it
    searchQuery: view === 'search' ? state.searchQuery : '',
  })),
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
// Stores full MovieItem metadata alongside IDs to avoid N+1 API calls

export interface FavoriteItem {
  id: string;
  tmdbId: number;
  title: string;
  mediaType: 'movie' | 'tv';
  posterUrl: string;
  backdropUrl: string;
  rating: number;
  year: number;
  overview: string;
  genreIds: number[];
  addedAt: number; // timestamp when added
}

interface FavoritesState {
  favorites: FavoriteItem[];
  toggleFavorite: (movie: MovieItem) => void;
  isFavorite: (id: string) => boolean;
  getFavoriteItem: (id: string) => FavoriteItem | undefined;
}

// Migration helper: convert old format (string[]) to new format (FavoriteItem[])
function migrateFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('xuper-favorites');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Old format: array of strings (IDs only)
    if (parsed.length > 0 && typeof parsed[0] === 'string') {
      // Migrate: convert IDs to minimal FavoriteItem objects
      const migrated = parsed.map((id: string) => ({
        id,
        tmdbId: parseInt(id.replace('tv-', '')) || 0,
        title: '',
        mediaType: (id.startsWith('tv-') ? 'tv' : 'movie') as 'movie' | 'tv',
        posterUrl: '',
        backdropUrl: '',
        rating: 0,
        year: 0,
        overview: '',
        genreIds: [],
        addedAt: Date.now(),
      }));
      localStorage.setItem('xuper-favorites', JSON.stringify(migrated));
      return migrated;
    }
    return parsed;
  } catch {
    return [];
  }
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: typeof window !== 'undefined' ? migrateFavorites() : [],

  toggleFavorite: (movie) => {
    const current = get().favorites;
    const existing = current.find(f => f.id === movie.id);
    let updated: FavoriteItem[];

    if (existing) {
      // Remove from favorites
      updated = current.filter(f => f.id !== movie.id);
    } else {
      // Add to favorites with full metadata
      const newItem: FavoriteItem = {
        id: movie.id,
        tmdbId: movie.tmdbId,
        title: movie.title,
        mediaType: movie.mediaType,
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl,
        rating: movie.rating,
        year: movie.year,
        overview: movie.overview,
        genreIds: movie.genreIds,
        addedAt: Date.now(),
      };
      updated = [newItem, ...current];
    }

    localStorage.setItem('xuper-favorites', JSON.stringify(updated));
    set({ favorites: updated });
  },

  isFavorite: (id) => get().favorites.some(f => f.id === id),

  getFavoriteItem: (id) => get().favorites.find(f => f.id === id),
}));

// ==================== WATCH HISTORY ====================
export interface WatchHistoryItem {
  id: string;
  movieId: string;
  title: string;
  posterUrl: string;
  backdropUrl: string;
  mediaType: 'movie' | 'tv';
  timestamp: number;
  progress: number; // seconds watched
  duration: number; // total duration in seconds
  season?: number; // for TV shows
  episode?: number; // for TV shows
  rating: number;
  year: number;
  overview: string;
}

interface HistoryState {
  history: WatchHistoryItem[];
  addToHistory: (item: Omit<WatchHistoryItem, 'timestamp'>) => void;
  updateProgress: (movieId: string, progress: number, duration: number) => void;
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

  updateProgress: (movieId, progress, duration) => {
    const current = get().history;
    const updated = current.map(h =>
      h.movieId === movieId ? { ...h, progress, duration } : h
    );
    localStorage.setItem('xuper-history', JSON.stringify(updated));
    set({ history: updated });
  },

  removeFromHistory: (movieId) => {
    const updated = get().history.filter(h => h.movieId !== movieId);
    localStorage.setItem('xuper-history', JSON.stringify(updated));
    set({ history: updated });
  },
}));

// ==================== XUPER CLIENT STATE ====================
interface XuperClientState {
  isLoggedIn: boolean;
  username: string;
  isConnecting: boolean;
  error: string;
  available: boolean;
  dcsOk: boolean;
  portalOk: boolean;
  latencyMs: number;
  activePortal: string;
  xuperLogin: (username: string, password: string) => Promise<boolean>;
  xuperLogout: () => void;
  checkXuperStatus: () => Promise<void>;
}

// ==================== IPTV FAVORITES STATE ====================
interface IptvFavoritesState {
  favorites: string[];
  toggleIptvFavorite: (id: string) => void;
  isIptvFavorite: (id: string) => boolean;
}

export const useIptvFavoritesStore = create<IptvFavoritesState>((set, get) => ({
  favorites: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('xs-iptv-favorites') || '[]') : [],

  toggleIptvFavorite: (id) => {
    const current = get().favorites;
    const updated = current.includes(id)
      ? current.filter(f => f !== id)
      : [...current, id];
    localStorage.setItem('xs-iptv-favorites', JSON.stringify(updated));
    set({ favorites: updated });
  },

  isIptvFavorite: (id) => get().favorites.includes(id),
}));

// ==================== IPTV RECENT CHANNELS STATE ====================
interface IptvRecentItem {
  id: string;
  timestamp: number;
}

interface IptvRecentState {
  recent: IptvRecentItem[];
  addToRecent: (id: string) => void;
}

export const useIptvRecentStore = create<IptvRecentState>((set, get) => ({
  recent: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('xs-iptv-recent') || '[]') : [],

  addToRecent: (id) => {
    const current = get().recent.filter(r => r.id !== id);
    const updated = [{ id, timestamp: Date.now() }, ...current].slice(0, 20);
    localStorage.setItem('xs-iptv-recent', JSON.stringify(updated));
    set({ recent: updated });
  },
}));

export const useXuperStore = create<XuperClientState>((set) => ({
  isLoggedIn: false,
  username: '',
  isConnecting: false,
  error: '',
  available: false,
  dcsOk: false,
  portalOk: false,
  latencyMs: 0,
  activePortal: '',

  xuperLogin: async (username, password) => {
    set({ isConnecting: true, error: '' });
    try {
      const res = await fetch('/api/xuper/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('xuper-session', JSON.stringify({ username, loggedIn: true }));
        set({
          isLoggedIn: true,
          username,
          isConnecting: false,
          error: '',
        });
        return true;
      } else {
        set({
          isConnecting: false,
          error: data.error || 'Login fallido',
        });
        return false;
      }
    } catch {
      set({
        isConnecting: false,
        error: 'Error de conexión',
      });
      return false;
    }
  },

  xuperLogout: () => {
    localStorage.removeItem('xuper-session');
    set({
      isLoggedIn: false,
      username: '',
      error: '',
    });
  },

  checkXuperStatus: async () => {
    try {
      const res = await fetch('/api/xuper/status');
      const data = await res.json();

      if (data.success) {
        set({
          available: data.connectivity?.available || false,
          dcsOk: data.connectivity?.dcsOk || false,
          portalOk: data.connectivity?.portalOk || false,
          latencyMs: data.connectivity?.latencyMs || 0,
          activePortal: data.connectivity?.activePortal || '',
          isLoggedIn: data.client?.isLoggedIn || false,
        });
      }
    } catch {
      set({ available: false, dcsOk: false, portalOk: false });
    }
  },
}));

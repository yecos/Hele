import { create } from 'zustand';
import type { MovieItem, TMDBMovieDetail } from './tmdb';
import type { StreamSource, ServerGroup, AudioLang } from './sources';

// ==================== VIEW STATE ====================
export type ViewType = 'home' | 'search' | 'favorites' | 'settings';

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

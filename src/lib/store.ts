import { create } from 'zustand';
import type { VideoSource, VideoSourceGroup, EpisodeInfo, SeasonInfo } from './sources';
import { getMovieSources, getTVSources } from './sources';

export type Movie = {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  videoUrl?: string | null;
  year: number;
  duration: string;
  rating: number;
  genre: string;
  category: string;
  isLive: boolean;
  featured: boolean;
  trending: boolean;
  genreIds?: number[];
  mediaType?: 'movie' | 'tv';
};

export type ViewType = 'home' | 'category' | 'search' | 'favorites' | 'movieDetail' | 'player' | 'auth' | 'pricing' | 'profile' | 'admin' | 'watchHistory' | 'iptv' | 'torrent';

export interface PlayerState {
  sources: VideoSourceGroup[];
  currentSource: VideoSource | null;
  selectedSeason: number;
  selectedEpisode: number;
  seasons: SeasonInfo[];
  episodes: EpisodeInfo[];
  isTVShow: boolean;
  tvDetails: {
    numberOfSeasons: number;
    numberOfEpisodes: number;
  } | null;
}

interface AppState {
  // Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  previousView: ViewType;
  goBack: () => void;

  // Selected movie
  selectedMovie: Movie | null;
  relatedMovies: Movie[];
  setSelectedMovie: (movie: Movie | null, related?: Movie[]) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Category filter
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;

  // Favorites
  favoriteIds: Set<string>;
  favorites: Movie[];
  setFavorites: (favorites: Movie[]) => void;
  toggleFavorite: (movieId: string) => void;
  isFavorite: (movieId: string) => boolean;

  // Auth
  isAuthenticated: boolean;
  authToken: string | null;
  userRole: 'user' | 'admin';
  login: (token: string, user: { id: string; name: string; email: string; plan: string; role: string }) => void;
  logout: () => void;

  // User
  userId: string;
  userName: string;
  userPlan: string;
  userEmail: string;
  userCreatedAt: string;
  setUserId: (id: string) => void;
  setUserInfo: (name: string, plan: string) => void;

  // Player
  playerState: PlayerState;
  setPlayerState: (state: Partial<PlayerState>) => void;
  playMovie: (tmdbId: number, mediaType: 'movie' | 'tv', title: string, season?: number, episode?: number) => void;
  switchSource: (source: VideoSource) => void;
  switchEpisode: (season: number, episode: number) => void;

  // Torrent
  torrentQuery: string;
  setTorrentQuery: (query: string) => void;
  playTorrent: (title: string, mediaType?: 'movie' | 'tv') => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'home',
  setCurrentView: (view) =>
    set((state) => ({ previousView: state.currentView, currentView: view })),
  previousView: 'home',
  goBack: () =>
    set((state) => ({
      currentView: state.previousView,
      previousView: 'home',
    })),

  // Selected movie
  selectedMovie: null,
  relatedMovies: [],
  setSelectedMovie: (movie, related = []) =>
    set({ selectedMovie: movie, relatedMovies: related }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Category
  selectedCategory: 'all',
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  // Favorites
  favoriteIds: new Set<string>(),
  favorites: [],
  setFavorites: (favorites) =>
    set({
      favorites,
      favoriteIds: new Set(favorites.map((f) => f.id)),
    }),
  toggleFavorite: (movieId) => {
    const { favoriteIds, favorites } = get();
    const newIds = new Set(favoriteIds);
    if (newIds.has(movieId)) {
      newIds.delete(movieId);
    } else {
      newIds.add(movieId);
    }
    set({
      favoriteIds: newIds,
      favorites: favorites.filter((f) => newIds.has(f.id)),
    });
  },
  isFavorite: (movieId) => get().favoriteIds.has(movieId),

  // Auth
  isAuthenticated: false,
  authToken: null,
  userRole: 'user',
  login: (token, user) =>
    set({
      isAuthenticated: true,
      authToken: token,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userPlan: user.plan,
      userRole: user.role as 'user' | 'admin',
    }),
  logout: () =>
    set({
      isAuthenticated: false,
      authToken: null,
      userId: '',
      userName: '',
      userEmail: '',
      userPlan: 'free',
      userRole: 'user',
      userCreatedAt: '',
      currentView: 'auth',
    }),

  // User
  userId: '',
  userName: '',
  userPlan: 'free',
  userEmail: '',
  userCreatedAt: '',
  setUserId: (id) => set({ userId: id }),
  setUserInfo: (name, plan) => set({ userName: name, userPlan: plan }),

  // Player
  playerState: {
    sources: [],
    currentSource: null,
    selectedSeason: 1,
    selectedEpisode: 1,
    seasons: [],
    episodes: [],
    isTVShow: false,
    tvDetails: null,
  },
  setPlayerState: (state) =>
    set((prev) => ({ playerState: { ...prev.playerState, ...state } })),
  playMovie: (tmdbId, mediaType, title, season, episode) => {
    const isTV = mediaType === 'tv';
    const prevState = get().playerState;
    const sources = isTV
      ? getTVSources(tmdbId, season || 1, episode || 1)
      : getMovieSources(tmdbId, title);
    set({
      playerState: {
        sources,
        currentSource: sources[0]?.sources[0] || null,
        selectedSeason: season || 1,
        selectedEpisode: episode || 1,
        seasons: isTV ? prevState.seasons : [],
        episodes: isTV ? [] : [],
        isTVShow: isTV,
        // FIX #2: Preservar tvDetails si ya existe (misma serie)
        tvDetails: (isTV && prevState.tvDetails) ? prevState.tvDetails : null,
      },
      currentView: 'player',
    });
  },
  switchSource: (source) =>
    set((prev) => ({
      playerState: { ...prev.playerState, currentSource: source },
    })),
  switchEpisode: (season, episode) => {
    const { selectedMovie, playerState } = get();
    if (!selectedMovie) return;
    const tmdbId = parseInt(selectedMovie.id);
    if (isNaN(tmdbId)) return;
    const sources = getTVSources(tmdbId, season, episode);
    set({
      playerState: {
        ...playerState,
        sources,
        currentSource: sources[0]?.sources[0] || null,
        selectedSeason: season,
        selectedEpisode: episode,
        episodes: [], // FIX #4: Limpiar episodios viejos
      },
    });
  },

  // Torrent
  torrentQuery: '',
  setTorrentQuery: (query) => set({ torrentQuery: query }),
  playTorrent: (title, mediaType = 'movie') => {
    // Build search query optimized for torrents
    let searchQuery = title;
    // Remove special characters that might interfere with search
    searchQuery = searchQuery.replace(/[^À-ɏḀ-ỿa-zA-Z0-9\s:]/g, '').trim();
    // If it's a TV show, append season/episode info if available
    const { playerState } = get();
    if (mediaType === 'tv' && playerState.selectedSeason) {
      searchQuery += ` S${String(playerState.selectedSeason).padStart(2, '0')}`;
      if (playerState.selectedEpisode > 1) {
        searchQuery += `E${String(playerState.selectedEpisode).padStart(2, '0')}`;
      }
    }
    set({ torrentQuery: searchQuery, currentView: 'torrent' });
  },

  // UI
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

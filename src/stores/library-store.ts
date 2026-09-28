import { create } from 'zustand';
import type { MovieItem } from '@/lib/tmdb';

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
  addedAt: number;
}

interface FavoritesState {
  favorites: FavoriteItem[];
  toggleFavorite: (movie: MovieItem) => void;
  isFavorite: (id: string) => boolean;
  getFavoriteItem: (id: string) => FavoriteItem | undefined;
}

function migrateFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem('xuper-favorites');
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    if (parsed.length > 0 && typeof parsed[0] === 'string') {
      const migrated = parsed.map((id: string) => ({
        id,
        tmdbId: Number.parseInt(id.replace('tv-', ''), 10) || 0,
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
  } catch (error) {
    console.warn('[Favorites] Corrupted data, resetting:', error);
    return [];
  }
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: typeof window !== 'undefined' ? migrateFavorites() : [],

  toggleFavorite: (movie) => {
    const current = get().favorites;
    const existing = current.find((favorite) => favorite.id === movie.id);

    const updated = existing
      ? current.filter((favorite) => favorite.id !== movie.id)
      : [
          {
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
          },
          ...current,
        ];

    localStorage.setItem('xuper-favorites', JSON.stringify(updated));
    set({ favorites: updated });
  },

  isFavorite: (id) => get().favorites.some((favorite) => favorite.id === id),
  getFavoriteItem: (id) =>
    get().favorites.find((favorite) => favorite.id === id),
}));

export interface WatchHistoryItem {
  id: string;
  movieId: string;
  title: string;
  posterUrl: string;
  backdropUrl: string;
  mediaType: 'movie' | 'tv';
  timestamp: number;
  progress: number;
  duration: number;
  season?: number;
  episode?: number;
  rating: number;
  year: number;
  overview: string;
}

interface HistoryState {
  history: WatchHistoryItem[];
  addToHistory: (item: Omit<WatchHistoryItem, 'timestamp'>) => void;
  updateProgress: (
    movieId: string,
    progress: number,
    duration: number
  ) => void;
  removeFromHistory: (movieId: string) => void;
}

function readHistory(): WatchHistoryItem[] {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(localStorage.getItem('xuper-history') || '[]');
  } catch (error) {
    console.warn('[History] Corrupted data, resetting:', error);
    return [];
  }
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: readHistory(),

  addToHistory: (item) => {
    const current = get().history.filter(
      (historyItem) => historyItem.movieId !== item.movieId
    );
    const updated = [{ ...item, timestamp: Date.now() }, ...current].slice(
      0,
      50
    );

    localStorage.setItem('xuper-history', JSON.stringify(updated));
    set({ history: updated });
  },

  updateProgress: (movieId, progress, duration) => {
    const updated = get().history.map((historyItem) =>
      historyItem.movieId === movieId
        ? { ...historyItem, progress, duration }
        : historyItem
    );

    localStorage.setItem('xuper-history', JSON.stringify(updated));
    set({ history: updated });
  },

  removeFromHistory: (movieId) => {
    const updated = get().history.filter(
      (historyItem) => historyItem.movieId !== movieId
    );

    localStorage.setItem('xuper-history', JSON.stringify(updated));
    set({ history: updated });
  },
}));

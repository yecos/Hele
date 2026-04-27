import { create } from 'zustand';

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
};

export type ViewType = 'home' | 'category' | 'search' | 'favorites' | 'movieDetail' | 'player';

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

  // User
  userId: string;
  userName: string;
  userPlan: string;
  setUserId: (id: string) => void;
  setUserInfo: (name: string, plan: string) => void;

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

  // User
  userId: 'demo-user',
  userName: 'Invitado',
  userPlan: 'free',
  setUserId: (id) => set({ userId: id }),
  setUserInfo: (name, plan) => set({ userName: name, userPlan: plan }),

  // UI
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

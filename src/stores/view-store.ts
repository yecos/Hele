import { create } from 'zustand';

export type ViewType =
  | 'home'
  | 'movies'
  | 'series'
  | 'iptv'
  | 'search'
  | 'history'
  | 'favorites'
  | 'library'
  | 'settings';

interface ViewState {
  currentView: ViewType;
  searchQuery: string;
  selectedGenre: number | null;
  setView: (view: ViewType) => void;
  setSearchQuery: (query: string) => void;
  setSelectedGenre: (genre: number | null) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'home',
  searchQuery: '',
  selectedGenre: null,

  setView: (view) => {
    set((state) => ({
      currentView: view,
      searchQuery: view === 'search' ? state.searchQuery : '',
    }));

    if (typeof window !== 'undefined') {
      const routes: Record<ViewType, string> = {
        home: '/',
        movies: '/movies',
        series: '/series',
        iptv: '/live',
        search: '/search',
        history: '/history',
        favorites: '/favorites',
        library: '/library',
        settings: '/settings',
      };
      const target = routes[view];

      if (window.location.pathname !== target) {
        window.location.assign(target);
      }
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedGenre: (selectedGenre) => set({ selectedGenre }),
}));

import { create } from 'zustand';

export type ViewType =
  | 'home'
  | 'movies'
  | 'series'
  | 'iptv'
  | 'search'
  | 'history'
  | 'favorites'
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

  setView: (view) =>
    set((state) => ({
      currentView: view,
      searchQuery: view === 'search' ? state.searchQuery : '',
    })),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedGenre: (selectedGenre) => set({ selectedGenre }),
}));

import { create } from 'zustand';
import type { MovieItem, TMDBMovieDetail } from '@/lib/tmdb';
import type { AudioLang, ServerGroup, StreamSource } from '@/lib/sources';

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

  playMovie: (movie, detail) =>
    set({
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

  playEpisode: (season, episode) =>
    set({
      currentSeason: season,
      currentEpisode: episode,
      currentServerUrl: '',
      currentServerName: '',
      serverGroups: [],
      isLoadingServers: true,
    }),

  closePlayer: () =>
    set({
      isPlaying: false,
      showDetail: false,
      currentMovie: null,
      currentDetail: null,
      currentServerUrl: '',
      currentServerName: '',
      serverGroups: [],
      isLoadingServers: false,
    }),

  setServerGroups: (groups) =>
    set({
      serverGroups: groups,
      isLoadingServers: false,
      currentServerUrl:
        groups.length > 0 && groups[0].sources.length > 0
          ? groups[0].sources[0].url
          : '',
      currentServerName:
        groups.length > 0 && groups[0].sources.length > 0
          ? groups[0].sources[0].name
          : '',
      currentLang: groups.length > 0 ? groups[0].lang : 'latino',
    }),

  selectServer: (source) =>
    set({
      currentServerUrl: source.url,
      currentServerName: source.name,
    }),

  selectLang: (currentLang) => set({ currentLang }),
  setDetail: (currentDetail) => set({ currentDetail }),
  openDetail: () => set({ showDetail: true }),
  closeDetail: () => set({ showDetail: false }),
}));

interface CastState {
  isCasting: boolean;
  castDevice: string | null;
  setCastState: (isCasting: boolean, device?: string | null) => void;
}

export const useCastStore = create<CastState>((set) => ({
  isCasting: false,
  castDevice: null,
  setCastState: (isCasting, castDevice = null) =>
    set({ isCasting, castDevice }),
}));

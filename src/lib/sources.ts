// Servidores de pelisjuanita.com
// Los URLs son únicos por contenido, se obtienen via scraper API
// También incluye servidores TMDB-based como fallback (vidsrc, moviesapi)

export type SourceMode = 'embed' | 'native';
export type AudioLang = 'latino' | 'español' | 'subtitulada';

export interface StreamSource {
  id: string;
  name: string;
  server: string;
  url: string;
  lang: AudioLang;
  quality: string;
  type: 'stream' | 'download';
  mode: SourceMode;
}

export interface ServerGroup {
  lang: AudioLang;
  label: string;
  sources: StreamSource[];
}

// Servidores que aceptan TMDB IDs directamente (fallback)
interface TMDBServer {
  id: string;
  name: string;
  getUrl: (tmdbId: number, type: 'movie' | 'tv', season?: number, episode?: number) => string;
}

export const TMDB_SERVERS: TMDBServer[] = [
  {
    id: 'moviesapi',
    name: 'MoviesAPI',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://moviesapi.to/movie/${tmdbId}`;
      return `https://moviesapi.to/tv/${tmdbId}-${season}-${episode}`;
    },
  },
  {
    id: 'vidsrc-pm',
    name: 'VidSrc PM',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.pm/embed/movie/${tmdbId}`;
      return `https://vidsrc.pm/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },
  {
    id: 'vidsrc-io',
    name: 'VidSrc IO',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.io/embed/movie/${tmdbId}`;
      return `https://vidsrc.io/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },
  {
    id: 'vidsrc-xyz',
    name: 'VidSrc XYZ',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.xyz/embed/movie/${tmdbId}`;
      return `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },
  {
    id: 'vidsrc-cc',
    name: 'VidSrc CC',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.cc/embed/movie/${tmdbId}`;
      return `https://vidsrc.cc/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },
];

// Genera fuentes fallback basadas en TMDB ID
export function getTMDBFallbackSources(
  tmdbId: number,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): ServerGroup {
  return {
    lang: 'latino',
    label: 'Servidores Alternativos (TMDB)',
    sources: TMDB_SERVERS.map(server => ({
      id: server.id,
      name: server.name,
      server: server.id,
      url: server.getUrl(tmdbId, type, season, episode),
      lang: 'latino' as AudioLang,
      quality: 'Auto',
      type: 'stream' as const,
      mode: 'embed' as SourceMode,
    })),
  };
}

// Mapea los iconos de servidor de pelisjuanita
export const SERVER_ICONS: Record<string, string> = {
  streamwish: '📡',
  earnvids: '🎬',
  waaw: '🌐',
  xupalace: '⚡',
  fastream: '🚀',
  dood: '▶️',
  '1fichier': '📥',
  moviesapi: '🎥',
  'vidsrc-pm': '📺',
  'vidsrc-io': '📺',
  'vidsrc-xyz': '📺',
  'vidsrc-cc': '📺',
  default: '🖥️',
};

export const LANG_LABELS: Record<AudioLang, string> = {
  latino: '🇲🇽 Latino',
  español: '🇪🇸 Español',
  subtitulada: '🇺🇸 Subtitulado',
};

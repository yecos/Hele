// Servidores de streaming con TMDB IDs
// Incluye servidores embed que aceptan TMDB IDs directamente

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

// Servidores que aceptan TMDB IDs directamente
interface TMDBServer {
  id: string;
  name: string;
  getUrl: (tmdbId: number, type: 'movie' | 'tv', season?: number, episode?: number) => string;
}

export const TMDB_SERVERS: TMDBServer[] = [
  // ===== PRINCIPAL =====
  {
    id: 'vidsrc-pm',
    name: 'VidSrc PM',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.pm/embed/movie/${tmdbId}`;
      return `https://vidsrc.pm/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },

  // ===== VIDSRC ECOSYSTEM =====
  {
    id: 'vidsrc-to',
    name: 'VidSrc',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.to/embed/movie/${tmdbId}`;
      return `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
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
    id: 'vidsrc-dev',
    name: 'VidSrc 4K',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.dev/embed/movie/${tmdbId}`;
      return `https://vidsrc.dev/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },
  {
    id: 'vidsrc-pro',
    name: 'VidSrc Pro',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.pro/embed/movie/${tmdbId}`;
      return `https://vidsrc.pro/embed/tv/${tmdbId}/${season}/${episode}`;
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

  // ===== MULTI-SOURCE & EMBED =====
  {
    id: 'vidlink',
    name: 'VidLink',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidlink.pro/movie/${tmdbId}`;
      return `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`;
    },
  },
  {
    id: 'embed-su',
    name: 'Embed.su',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://www.embed.su/embed/movie/${tmdbId}`;
      return `https://www.embed.su/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },
  {
    id: 'smashystream',
    name: 'SmashyStream',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://embed.smashystream.com/embed/movie/${tmdbId}`;
      return `https://embed.smashystream.com/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },
  {
    id: '2embed',
    name: '2Embed',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://www.2embed.cc/embed/${tmdbId}`;
      return `https://www.2embed.cc/embed/${tmdbId}/${season}/${episode}`;
    },
  },
  {
    id: 'cinesrc',
    name: 'CineSrc',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://cinesrc.st/embed/movie/${tmdbId}`;
      return `https://cinesrc.st/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },

  // ===== MOVIESAPI =====
  {
    id: 'moviesapi',
    name: 'MoviesAPI',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://moviesapi.to/movie/${tmdbId}`;
      return `https://moviesapi.to/tv/${tmdbId}-${season}-${episode}`;
    },
  },
  {
    id: 'moviesapi-club',
    name: 'MoviesAPI Club',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://moviesapi.club/movie/${tmdbId}`;
      return `https://moviesapi.club/tv/${tmdbId}-${season}-${episode}`;
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
    label: 'Servidores (TMDB)',
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

// Mapea los iconos de servidor
export const SERVER_ICONS: Record<string, string> = {
  // VidSrc ecosystem
  'vidsrc-pm': '📺',
  'vidsrc-to': '📺',
  'vidsrc-io': '📺',
  'vidsrc-dev': '🎬',
  'vidsrc-pro': '📺',
  'vidsrc-xyz': '📺',
  // Multi-source
  vidlink: '🔗',
  'embed-su': '🍿',
  smashystream: '💥',
  '2embed': '▶️',
  cinesrc: '🎬',
  // MoviesAPI
  moviesapi: '🎥',
  'moviesapi-club': '🎥',
  // Legacy
  streamwish: '📡',
  earnvids: '🎬',
  waaw: '🌐',
  xupalace: '⚡',
  fastream: '🚀',
  dood: '▶️',
  '1fichier': '📥',
  default: '🖥️',
};

export const LANG_LABELS: Record<AudioLang, string> = {
  latino: '🇲🇽 Latino',
  español: '🇪🇸 Español',
  subtitulada: '🇺🇸 Subtitulado',
};

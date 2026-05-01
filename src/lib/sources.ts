// Servidores de streaming con TMDB IDs
// Organizados por idioma: Latino, Subtitulado, Inglés
// Actualizado: Mayo 2026 - Limpieza de servers muertos + nuevos funcionales

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

interface TMDBServer {
  id: string;
  name: string;
  getUrl: (tmdbId: number, type: 'movie' | 'tv', season?: number, episode?: number) => string;
}

// ═══════════════════════════════════════════════════════════
//  ESPAÑOL LATINO — Servidores con audio en español latino
// ═══════════════════════════════════════════════════════════
export const LATINO_SERVERS: TMDBServer[] = [
  {
    id: 'vidsrc-lat',
    name: 'VidSrc LAT',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.lat/embed/movie/${tmdbId}`;
      return `https://vidsrc.lat/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },
  {
    id: 'nifelvid',
    name: 'NifelVid',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://japierdolevid.com/embed/movie?tmdb=${tmdbId}&ds_lang=es&autoplay=1`;
      return `https://japierdolevid.com/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&ds_lang=es&autoplay=1`;
    },
  },
  {
    id: 'autoembed-lat',
    name: 'AutoEmbed',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://autoembed.co/movie/tmdb/${tmdbId}`;
      return `https://autoembed.co/tv/tmdb/${tmdbId}/${season}/${episode}`;
    },
  },
];

// ═══════════════════════════════════════════════════════════
//  SUBTITULADO — Audio original con subtítulos en español
// ═══════════════════════════════════════════════════════════
export const SUBTITLED_SERVERS: TMDBServer[] = [
  {
    id: 'vidsrc-pm',
    name: 'VidSrc',
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
    id: 'vidlink',
    name: 'VidLink',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidlink.pro/movie/${tmdbId}`;
      return `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}`;
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
    id: 'vidsrc-ru',
    name: 'VidSrc RU',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.ru/embed/movie/${tmdbId}`;
      return `https://vidsrc.ru/embed/tv/${tmdbId}/${season}/${episode}`;
    },
  },
  {
    id: 'moviesapi',
    name: 'MoviesAPI',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://moviesapi.to/movie/${tmdbId}`;
      return `https://moviesapi.to/tv/${tmdbId}-${season}-${episode}`;
    },
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed EN',
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://autoembed.co/movie/tmdb/${tmdbId}`;
      return `https://autoembed.co/tv/tmdb/${tmdbId}/${season}/${episode}`;
    },
  },
];

// ═══════════════════════════════════════════════════════════
//  ALL SERVERS — flat list for probing & settings
// ═══════════════════════════════════════════════════════════
export const TMDB_SERVERS: TMDBServer[] = [
  ...LATINO_SERVERS,
  ...SUBTITLED_SERVERS,
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
  // Latino
  'vidsrc-lat': '🇲🇽',
  nifelvid: '🇲🇽',
  'autoembed-lat': '🔄',
  // VidSrc ecosystem
  'vidsrc-pm': '📺',
  'vidsrc-io': '📺',
  'vidsrc-dev': '🎬',
  'vidsrc-ru': '🌐',
  // Multi-source
  vidlink: '🔗',
  // MoviesAPI
  moviesapi: '🎥',
  autoembed: '🔄',
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
  latino: '🇲🇽 Español Latino',
  español: '🇪🇸 Español',
  subtitulada: '🇺🇸 Subtitulado',
};

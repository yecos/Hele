// Video Sources Service for XuperStream
// Integrates multiple streaming providers with TMDB IDs
// Supports dual-mode playback: native HLS (.m3u8) and embed iframe fallback

// ─── Types ────────────────────────────────────────────────────────────────

export type SourceMode = 'native' | 'embed';
// 'native' = .m3u8 URL played in our own <video> with HLS.js
// 'embed'  = iframe embed as fallback

export interface VideoSource {
  id: string;
  name: string;
  type: 'embed' | 'hls' | 'direct';
  mode: SourceMode; // NEW — whether this is a native stream or embed fallback
  url: string;
  quality?: string;
  lang?: string;
  server?: string;
  isNative?: boolean; // convenience flag, true when mode === 'native'
}

export interface VideoSourceGroup {
  server: string;
  sources: VideoSource[];
}

export interface SeasonInfo {
  season_number: number;
  name: string;
  episode_count: number;
}

export interface EpisodeInfo {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  runtime: number;
  vote_average: number;
}

interface StreamServer {
  id: string;
  name: string;
  mode: SourceMode;
  priority: number; // lower = higher priority
  getUrl: (
    tmdbId: number,
    type: 'movie' | 'tv',
    season?: number,
    episode?: number
  ) => string;
}

// ─── Native Servers (primary — URLs resolved to .m3u8 via /api/sources/resolve) ──

const NATIVE_SERVERS: StreamServer[] = [
  {
    id: 'vidsrc-pm',
    name: 'Servidor 1 (vidsrc.pm)',
    mode: 'native',
    priority: 1,
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.pm/embed/movie/${tmdbId}?lang=es`;
      return `https://vidsrc.pm/embed/tv/${tmdbId}/${season}/${episode}?lang=es`;
    },
  },
  {
    id: 'vidsrc-cc',
    name: 'Servidor 2 (vidsrc.cc)',
    mode: 'native',
    priority: 2,
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.cc/embed/movie/${tmdbId}?lang=es`;
      return `https://vidsrc.cc/embed/tv/${tmdbId}/${season}/${episode}?lang=es`;
    },
  },
  {
    id: 'vidsrc-icu',
    name: 'Servidor 3 (vidsrc.icu)',
    mode: 'native',
    priority: 3,
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.icu/embed/movie/${tmdbId}?lang=es`;
      return `https://vidsrc.icu/embed/tv/${tmdbId}/${season}/${episode}?lang=es`;
    },
  },
  {
    id: 'embed-su',
    name: 'Servidor 4 (embed.su)',
    mode: 'native',
    priority: 4,
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://embed.su/embed/movie/${tmdbId}?lang=es`;
      return `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}?lang=es`;
    },
  },
  {
    id: 'autoembed',
    name: 'Servidor 5 (autoembed.cc)',
    mode: 'native',
    priority: 5,
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://autoembed.cc/embed/movie/${tmdbId}?lang=es`;
      return `https://autoembed.cc/embed/tv/${tmdbId}/${season}/${episode}?lang=es`;
    },
  },
  {
    id: 'moviesapi',
    name: 'Servidor 6 (moviesapi)',
    mode: 'native',
    priority: 6,
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://moviesapi.to/movie/${tmdbId}`;
      return `https://moviesapi.to/tv/${tmdbId}-${season}-${episode}`;
    },
  },
];

// ─── Embed Fallback Servers (last resort — iframe embed) ──────────────────

const EMBED_SERVERS: StreamServer[] = [
  {
    id: 'vidsrc-pm-fallback',
    name: 'Fallback 1 (vidsrc.pm)',
    mode: 'embed',
    priority: 10,
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.pm/embed/movie/${tmdbId}?lang=es`;
      return `https://vidsrc.pm/embed/tv/${tmdbId}/${season}/${episode}?lang=es`;
    },
  },
  {
    id: 'vidsrc-me',
    name: 'Fallback 2 (vidsrc.me)',
    mode: 'embed',
    priority: 11,
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.me/embed/movie/${tmdbId}?lang=es`;
      return `https://vidsrc.me/embed/tv/${tmdbId}/${season}/${episode}?lang=es`;
    },
  },
  {
    id: 'vidsrc-io',
    name: 'Fallback 3 (vidsrc.io)',
    mode: 'embed',
    priority: 12,
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.io/embed/movie/${tmdbId}?lang=es`;
      return `https://vidsrc.io/embed/tv/${tmdbId}/${season}/${episode}?lang=es`;
    },
  },
  {
    id: 'vidsrc-dev',
    name: 'Fallback 4 (vidsrc.dev)',
    mode: 'embed',
    priority: 13,
    getUrl: (tmdbId, type, season, episode) => {
      if (type === 'movie') return `https://vidsrc.dev/embed/movie/${tmdbId}?lang=es`;
      return `https://vidsrc.dev/embed/tv/${tmdbId}/${season}/${episode}?lang=es`;
    },
  },
];

// All servers merged and sorted by priority (native first, then embed fallbacks)
const ALL_SERVERS: StreamServer[] = [...NATIVE_SERVERS, ...EMBED_SERVERS].sort(
  (a, b) => a.priority - b.priority
);

// ─── Internal: Build a VideoSourceGroup[] from a list of servers ───────────

function buildSourceGroups(
  servers: StreamServer[],
  tmdbId: number,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): VideoSourceGroup[] {
  return servers.map((server) => ({
    server: server.name,
    sources: [
      {
        id: server.id,
        name: server.name,
        type: server.mode === 'native' ? 'hls' : 'embed',
        mode: server.mode,
        url: server.getUrl(tmdbId, type, season, episode),
        quality: 'Auto',
        server: server.id,
        isNative: server.mode === 'native',
      },
    ],
  }));
}

// ─── Get Video Sources ────────────────────────────────────────────────────

/**
 * Returns source groups for a movie.
 *
 * @param tmdbId   TMDB movie ID
 * @param title    Optional title (kept for backward compat, not used in URL)
 * @param mode     Optional filter: 'native' | 'embed' | undefined (all)
 */
export function getMovieSources(
  tmdbId: number,
  title?: string,
  mode?: SourceMode
): VideoSourceGroup[] {
  const servers = mode
    ? ALL_SERVERS.filter((s) => s.mode === mode)
    : ALL_SERVERS;

  return buildSourceGroups(servers, tmdbId, 'movie', undefined, undefined);
}

/**
 * Returns source groups for a TV episode.
 *
 * @param tmdbId   TMDB TV show ID
 * @param season   Season number (default 1)
 * @param episode  Episode number (default 1)
 * @param mode     Optional filter: 'native' | 'embed' | undefined (all)
 */
export function getTVSources(
  tmdbId: number,
  season: number = 1,
  episode: number = 1,
  mode?: SourceMode
): VideoSourceGroup[] {
  const servers = mode
    ? ALL_SERVERS.filter((s) => s.mode === mode)
    : ALL_SERVERS;

  return buildSourceGroups(servers, tmdbId, 'tv', season, episode);
}

// ─── Convenience Helpers for New Architecture ─────────────────────────────

/**
 * Returns only native (HLS-extractable) source groups.
 */
export function getNativeSources(
  tmdbId: number,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): VideoSourceGroup[] {
  if (type === 'movie') return getMovieSources(tmdbId, undefined, 'native');
  return getTVSources(tmdbId, season ?? 1, episode ?? 1, 'native');
}

/**
 * Returns only embed (iframe fallback) source groups.
 */
export function getEmbedSources(
  tmdbId: number,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): VideoSourceGroup[] {
  if (type === 'movie') return getMovieSources(tmdbId, undefined, 'embed');
  return getTVSources(tmdbId, season ?? 1, episode ?? 1, 'embed');
}

/**
 * Builds the /api/sources/resolve URL for a given native source URL.
 * The resolve API will scrape the embed page and return the extracted .m3u8 URL.
 */
export function getResolveUrl(sourceUrl: string): string {
  return `/api/sources/resolve?url=${encodeURIComponent(sourceUrl)}`;
}

// ─── Get Seasons List (for TV shows) ─────────────────────────────────────

export function getSeasonsList(
  numberOfSeasons: number,
  tvName?: string
): SeasonInfo[] {
  const seasons: SeasonInfo[] = [];
  for (let i = 1; i <= numberOfSeasons; i++) {
    seasons.push({
      season_number: i,
      name: `Temporada ${i}`,
      episode_count: 0, // Will be populated from TMDB details
    });
  }
  return seasons;
}

// ─── Helper: Check if a movie has streamable sources ─────────────────────

export function hasVideoSources(movieId: string, mediaType?: string): boolean {
  // All TMDB-sourced content can get video sources
  // Seed data items without TMDB IDs won't have sources
  if (!mediaType && isNaN(Number(movieId))) return false;
  return true;
}

// ─── Helper: Get default server source ───────────────────────────────────

export function getDefaultSource(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): VideoSource | null {
  // Always prefer the highest-priority native server
  const server = ALL_SERVERS[0];
  if (!server) return null;

  const url = server.getUrl(
    tmdbId,
    mediaType,
    season,
    episode
  );

  return {
    id: server.id,
    name: server.name,
    type: server.mode === 'native' ? 'hls' : 'embed',
    mode: server.mode,
    url,
    quality: 'Auto',
    server: server.id,
    isNative: server.mode === 'native',
  };
}

// ─── Proxy URL for embed sources (to avoid CORS/referrer issues) ──────────

export function getEmbedProxyUrl(embedUrl: string): string {
  return `/api/proxy?url=${encodeURIComponent(embedUrl)}`;
}

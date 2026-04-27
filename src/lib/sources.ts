// Video Sources Service for XuperStream
// Integrates multiple streaming providers with TMDB IDs

export interface VideoSource {
  id: string;
  name: string;
  type: 'embed' | 'hls' | 'direct';
  url: string;
  quality?: string;
  lang?: string;
  server?: string;
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

// ─── Streaming Server Configurations ──────────────────────────────────────

const STREAM_SERVERS = [
  {
    id: 'vidsrc',
    name: 'Servidor 1',
    // vidsrc provides embed URLs based on TMDB IDs
    getMovieUrl: (tmdbId: number, _title?: string) =>
      `https://vidsrc.to/embed/movie/${tmdbId}`,
    getTVUrl: (tmdbId: number, season: number, episode: number) =>
      `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
    type: 'embed' as const,
  },
  {
    id: 'vidsrc-cc',
    name: 'Servidor 2',
    getMovieUrl: (tmdbId: number, _title?: string) =>
      `https://vidsrc.cc/v2/embed/movie/${tmdbId}`,
    getTVUrl: (tmdbId: number, season: number, episode: number) =>
      `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`,
    type: 'embed' as const,
  },
  {
    id: 'vidsrc-xyz',
    name: 'Servidor 3',
    getMovieUrl: (tmdbId: number, _title?: string) =>
      `https://vidsrc.xyz/embed/movie/${tmdbId}`,
    getTVUrl: (tmdbId: number, season: number, episode: number) =>
      `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`,
    type: 'embed' as const,
  },
  {
    id: 'embed.su',
    name: 'Servidor 4',
    getMovieUrl: (tmdbId: number, _title?: string) =>
      `https://embed.su/embed/movie/${tmdbId}`,
    getTVUrl: (tmdbId: number, season: number, episode: number) =>
      `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`,
    type: 'embed' as const,
  },
  {
    id: '2embed',
    name: 'Servidor 5',
    getMovieUrl: (tmdbId: number, _title?: string) =>
      `https://www.2embed.cc/embed/${tmdbId}`,
    getTVUrl: (tmdbId: number, season: number, episode: number) =>
      `https://www.2embed.cc/embed/${tmdbId}/${season}/${episode}`,
    type: 'embed' as const,
  },
];

// ─── Get Video Sources ────────────────────────────────────────────────────

export function getMovieSources(
  tmdbId: number,
  title?: string
): VideoSourceGroup[] {
  return STREAM_SERVERS.map((server) => ({
    server: server.name,
    sources: [
      {
        id: server.id,
        name: server.name,
        type: server.type,
        url: server.getMovieUrl(tmdbId, title),
        quality: 'Auto',
        server: server.id,
      },
    ],
  }));
}

export function getTVSources(
  tmdbId: number,
  season: number = 1,
  episode: number = 1
): VideoSourceGroup[] {
  return STREAM_SERVERS.map((server) => ({
    server: server.name,
    sources: [
      {
        id: server.id,
        name: server.name,
        type: server.type,
        url: server.getTVUrl(tmdbId, season, episode),
        quality: 'Auto',
        server: server.id,
      },
    ],
  }));
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
  const server = STREAM_SERVERS[0]; // Default to first server
  if (!server) return null;

  const url =
    mediaType === 'movie'
      ? server.getMovieUrl(tmdbId)
      : server.getTVUrl(tmdbId, season || 1, episode || 1);

  return {
    id: server.id,
    name: server.name,
    type: server.type,
    url,
    quality: 'Auto',
    server: server.id,
  };
}

// ─── Proxy URL for embed sources (to avoid CORS issues) ──────────────────

export function getEmbedProxyUrl(embedUrl: string): string {
  // Use our API route to proxy embed sources
  return `/api/proxy-embed?url=${encodeURIComponent(embedUrl)}`;
}

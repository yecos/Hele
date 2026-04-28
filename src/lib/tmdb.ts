const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '2dca580c2a14b55200e784d157207b4d';
const LANG = 'es-ES';
const REGION = 'CO';

export interface TMDBMovie {
  id: number;
  title: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  genre_ids?: number[];
  media_type?: string;
  popularity?: number;
}

export interface TMDBMovieDetail extends TMDBMovie {
  genres: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  tagline?: string;
  production_companies?: { name: string; logo_path: string | null }[];
  videos?: { results: { key: string; site: string; type: string; name: string }[] };
  seasons?: { season_number: number; name: string; episode_count: number; poster_path: string | null }[];
  similar?: { results: TMDBMovie[] };
  credits?: { cast: { id: number; name: string; character: string; profile_path: string | null; order: number }[] };
}

export interface TMDBSeasonDetail {
  id: number;
  season_number: number;
  name: string;
  episodes: {
    id: number;
    episode_number: number;
    name: string;
    overview: string;
    still_path: string | null;
    runtime: number | null;
    vote_average: number;
    air_date: string;
  }[];
}

export interface MovieItem {
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
}

function getPosterUrl(path: string | null, size = 'w500'): string {
  if (!path) return '/placeholder-poster.svg';
  return `${TMDB_IMG}/${size}${path}`;
}

function getBackdropUrl(path: string | null, size = 'w1280'): string {
  if (!path) return '';
  return `${TMDB_IMG}/${size}${path}`;
}

export function mapToMovieItem(item: TMDBMovie): MovieItem {
  const isTV = !!item.name || item.media_type === 'tv';
  const date = isTV ? item.first_air_date : item.release_date;
  return {
    id: `${item.id}`,
    tmdbId: item.id,
    title: isTV ? (item.name || '') : (item.title || ''),
    mediaType: isTV ? 'tv' : 'movie',
    posterUrl: getPosterUrl(item.poster_path),
    backdropUrl: getBackdropUrl(item.backdrop_path),
    rating: item.vote_average,
    year: date ? parseInt(date.substring(0, 4)) : 0,
    overview: item.overview || '',
    genreIds: item.genre_ids || [],
  };
}

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', LANG);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB error: ${res.status} ${res.statusText}`);
  return res.json();
}

export const tmdb = {
  getTrending: (type: 'all' | 'movie' | 'tv' = 'all', window: 'week' | 'day' = 'week') =>
    tmdbFetch<{ results: TMDBMovie[] }>(`/trending/${type}/${window}`).then(r => r.results.map(mapToMovieItem)),

  getPopularMovies: (page = 1) =>
    tmdbFetch<{ results: TMDBMovie[] }>('/movie/popular', { page: String(page) }).then(r => r.results.map(mapToMovieItem)),

  getPopularTV: (page = 1) =>
    tmdbFetch<{ results: TMDBMovie[] }>('/tv/popular', { page: String(page) }).then(r => r.results.map(mapToMovieItem)),

  getTopRatedMovies: (page = 1) =>
    tmdbFetch<{ results: TMDBMovie[] }>('/movie/top_rated', { page: String(page) }).then(r => r.results.map(mapToMovieItem)),

  getTopRatedTV: (page = 1) =>
    tmdbFetch<{ results: TMDBMovie[] }>('/tv/top_rated', { page: String(page) }).then(r => r.results.map(mapToMovieItem)),

  getNowPlaying: (page = 1) =>
    tmdbFetch<{ results: TMDBMovie[] }>('/movie/now_playing', { page: String(page), region: REGION }).then(r => r.results.map(mapToMovieItem)),

  getAiringTodayTV: (page = 1) =>
    tmdbFetch<{ results: TMDBMovie[] }>('/tv/airing_today', { page: String(page) }).then(r => r.results.map(mapToMovieItem)),

  getUpcoming: (page = 1) =>
    tmdbFetch<{ results: TMDBMovie[] }>('/movie/upcoming', { page: String(page), region: REGION }).then(r => r.results.map(mapToMovieItem)),

  searchMulti: (query: string, page = 1) =>
    tmdbFetch<{ results: TMDBMovie[] }>('/search/multi', { query, page: String(page) }).then(r =>
      r.results.filter(i => i.media_type === 'movie' || i.media_type === 'tv').map(mapToMovieItem)
    ),

  discoverMovies: (params: Record<string, string> = {}) =>
    tmdbFetch<{ results: TMDBMovie[] }>('/discover/movie', { ...params, region: REGION }).then(r => r.results.map(mapToMovieItem)),

  discoverTV: (params: Record<string, string> = {}) =>
    tmdbFetch<{ results: TMDBMovie[] }>('/discover/tv', { ...params }).then(r => r.results.map(mapToMovieItem)),

  getMovieDetail: (id: number) =>
    tmdbFetch<TMDBMovieDetail>(`/movie/${id}`, { append_to_response: 'videos,similar,credits' }),

  getTVDetail: (id: number) =>
    tmdbFetch<TMDBMovieDetail>(`/tv/${id}`, { append_to_response: 'videos,similar,credits' }),

  getSeasonDetail: (tvId: number, season: number) =>
    tmdbFetch<TMDBSeasonDetail>(`/tv/${tvId}/season/${season}`),

  getGenres: async () => {
    const [movies, tv] = await Promise.all([
      tmdbFetch<{ genres: { id: number; name: string }[] }>('/genre/movie/list'),
      tmdbFetch<{ genres: { id: number; name: string }[] }>('/genre/tv/list'),
    ]);
    const map = new Map<number, string>();
    [...movies.genres, ...tv.genres].forEach(g => map.set(g.id, g.name));
    return map;
  },
};

export { getPosterUrl, getBackdropUrl };

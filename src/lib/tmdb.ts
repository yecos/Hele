// TMDB API Service for XuperStream
// https://developer.themoviedb.org/docs

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  media_type?: string;
  adult: boolean;
  original_language: string;
  original_title: string;
  popularity: number;
  video: boolean;
}

export interface TMDBTV {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  media_type?: string;
  origin_country: string[];
  original_language: string;
  original_name: string;
  popularity: number;
}

export interface TMDBMovieDetail extends TMDBMovie {
  genres: TMDBGenre[];
  runtime: number;
  status: string;
  tagline: string;
  production_companies: { id: number; name: string; logo_path: string | null }[];
  spoken_languages: { english_name: string; iso_639_1: string }[];
}

export interface TMDBTVDetail extends TMDBTV {
  genres: TMDBGenre[];
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  tagline: string;
  runtime?: number;
  episode_run_time: number[];
  created_by: { id: number; name: string; profile_path: string | null }[];
  networks: { id: number; name: string; logo_path: string | null }[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBGenreList {
  genres: TMDBGenre[];
}

export type TMDBMediaItem = TMDBMovie | TMDBTV;

// ─── Helper: API Key ────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY || '';
  if (!key || key === 'YOUR_TMDB_API_KEY_HERE') {
    throw new Error('TMDB_API_KEY is not configured. Add it to .env.local');
  }
  return key;
}

export function isTmdbConfigured(): boolean {
  const key = process.env.TMDB_API_KEY || '';
  return !!key && key !== 'YOUR_TMDB_API_KEY_HERE';
}

// ─── Core Fetch Helper ─────────────────────────────────────────────────────

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', getApiKey());
  url.searchParams.set('language', 'es-ES');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText} for ${endpoint}`);
  }
  return res.json();
}

// ─── Image URL Helpers ─────────────────────────────────────────────────────

export function getPosterUrl(path: string | null, size: string = 'w500'): string {
  if (!path) return '/placeholder-poster.png';
  return `${TMDB_IMG}/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size: string = 'w1280'): string {
  if (!path) return '/placeholder-backdrop.png';
  return `${TMDB_IMG}/${size}${path}`;
}

// ─── Map TMDB item to app Movie type ───────────────────────────────────────

import { Movie } from './store';

export function mapTmdbToMovie(item: TMDBMediaItem): Movie {
  const isTV =
    (item as TMDBMediaItem & { media_type?: string }).media_type === 'tv' ||
    'first_air_date' in item ||
    'name' in item;

  const tvItem = item as TMDBTV;
  const movieItem = item as TMDBMovie;

  const title = isTV ? (tvItem.name || '') : (movieItem.title || '');
  const date = isTV
    ? (tvItem.first_air_date || '')
    : (movieItem.release_date || '');
  const year = date ? parseInt(date.split('-')[0]) : 0;

  return {
    id: String(item.id),
    title,
    description: item.overview || '',
    posterUrl: getPosterUrl(item.poster_path),
    backdropUrl: getBackdropUrl(item.backdrop_path),
    videoUrl: null,
    year,
    duration: isTV ? '' : '',
    rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : 0,
    genre: '',
    genreIds: item.genre_ids || [],
    category: isTV ? 'series' : 'peliculas',
    isLive: false,
    featured: false,
    trending: false,
    mediaType: isTV ? 'tv' : 'movie',
  };
}

// ─── API Functions ─────────────────────────────────────────────────────────

export async function getTrending(
  mediaType: 'movie' | 'tv' | 'all' = 'all',
  timeWindow: 'day' | 'week' = 'week',
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMediaItem>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMediaItem>>(
    `/trending/${mediaType}/${timeWindow}`,
    { page: String(page) }
  );
}

export async function getPopularMovies(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>(
    '/movie/popular',
    { page: String(page) }
  );
}

export async function getPopularTV(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBTV>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBTV>>(
    '/tv/popular',
    { page: String(page) }
  );
}

export async function getTopRatedMovies(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>(
    '/movie/top_rated',
    { page: String(page) }
  );
}

export async function getTopRatedTV(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBTV>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBTV>>(
    '/tv/top_rated',
    { page: String(page) }
  );
}

export async function getNowPlayingMovies(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>(
    '/movie/now_playing',
    { page: String(page) }
  );
}

export async function getAiringTodayTV(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBTV>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBTV>>(
    '/tv/airing_today',
    { page: String(page) }
  );
}

export async function searchMulti(
  query: string,
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMediaItem>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMediaItem>>(
    '/search/multi',
    { query, page: String(page) }
  );
}

export async function getMovieDetails(
  movieId: number
): Promise<TMDBMovieDetail> {
  return tmdbFetch<TMDBMovieDetail>(`/movie/${movieId}`);
}

export async function getTVDetails(
  tvId: number
): Promise<TMDBTVDetail> {
  return tmdbFetch<TMDBTVDetail>(`/tv/${tvId}`);
}

export async function getMovieGenres(): Promise<TMDBGenreList> {
  return tmdbFetch<TMDBGenreList>('/genre/movie/list');
}

export async function getTVGenres(): Promise<TMDBGenreList> {
  return tmdbFetch<TMDBGenreList>('/genre/tv/list');
}

export async function discoverMovies(params: {
  genre?: string;
  year?: number;
  sort_by?: string;
  page?: number;
  language?: string;
  region?: string;
  original_language?: string;
}): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  const searchParams: Record<string, string> = {
    sort_by: params.sort_by || 'popularity.desc',
    page: String(params.page || 1),
  };
  if (params.genre) searchParams.with_genres = params.genre;
  if (params.year) searchParams.primary_release_year = String(params.year);
  if (params.language) searchParams.language = params.language;
  if (params.region) searchParams.region = params.region;
  if (params.original_language) searchParams.with_original_language = params.original_language;
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>('/discover/movie', searchParams);
}

export async function discoverTV(params: {
  genre?: string;
  sort_by?: string;
  page?: number;
  language?: string;
  original_language?: string;
}): Promise<TMDBPaginatedResponse<TMDBTV>> {
  const searchParams: Record<string, string> = {
    sort_by: params.sort_by || 'popularity.desc',
    page: String(params.page || 1),
  };
  if (params.genre) searchParams.with_genres = params.genre;
  if (params.language) searchParams.language = params.language;
  if (params.original_language) searchParams.with_original_language = params.original_language;
  return tmdbFetch<TMDBPaginatedResponse<TMDBTV>>('/discover/tv', searchParams);
}

// ─── Latin American Content ──────────────────────────────────────────────

export async function getLatamMovies(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return discoverMovies({
    sort_by: 'popularity.desc',
    page,
    original_language: 'es',
    region: 'CO',
  });
}

export async function getLatamTV(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBTV>> {
  return discoverTV({
    sort_by: 'popularity.desc',
    page,
    original_language: 'es',
  });
}

export async function getSpanishTopRated(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return discoverMovies({
    sort_by: 'vote_average.desc',
    page,
    original_language: 'es',
  });
}

export async function getSpanishTVTopRated(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBTV>> {
  return discoverTV({
    sort_by: 'vote_average.desc',
    page,
    original_language: 'es',
  });
}

export async function getLatinGenreMovies(
  genre: string,
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return discoverMovies({
    genre,
    sort_by: 'popularity.desc',
    page,
    original_language: 'es',
  });
}

export async function getLatinGenreTV(
  genre: string,
  page = 1
): Promise<TMDBPaginatedResponse<TMDBTV>> {
  return discoverTV({
    genre,
    sort_by: 'popularity.desc',
    page,
    original_language: 'es',
  });
}

export async function getNowPlayingLatam(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return discoverMovies({
    sort_by: 'popularity.desc',
    page,
    original_language: 'es',
    year: 2025,
  });
}

export async function getAiringTodayLatam(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBTV>> {
  const searchParams: Record<string, string> = {
    sort_by: 'popularity.desc',
    page: String(page),
    'with_original_language': 'es',
  };
  return tmdbFetch<TMDBPaginatedResponse<TMDBTV>>('/tv/airing_today', searchParams);
}

export async function getMovieVideos(
  movieId: number
): Promise<{ id: number; results: TMDBVideo[] }> {
  return tmdbFetch(`/movie/${movieId}/videos`, { language: 'es-ES' });
}

export async function getSimilarMovies(
  movieId: number,
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>(
    `/movie/${movieId}/similar`,
    { page: String(page) }
  );
}

export async function getSimilarTV(
  tvId: number,
  page = 1
): Promise<TMDBPaginatedResponse<TMDBTV>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBTV>>(
    `/tv/${tvId}/similar`,
    { page: String(page) }
  );
}

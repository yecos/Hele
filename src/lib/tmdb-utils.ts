'use client';

import type { MovieItem } from './tmdb';

// ==================== SHARED MAPITEM ====================
// Single source of truth for mapping TMDB API responses to MovieItem
// Eliminates duplication across HomeView, MoviesView, SeriesView, SearchView

export function mapTmdbToMovieItem(item: any): MovieItem {
  const isTV = !!item.name || item.media_type === 'tv';
  const date = isTV ? item.first_air_date : item.release_date;
  return {
    id: String(item.id),
    tmdbId: item.id,
    title: isTV ? (item.name || '') : (item.title || ''),
    mediaType: isTV ? 'tv' : 'movie',
    posterUrl: item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : '/placeholder-poster.svg',
    backdropUrl: item.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
      : '',
    rating: item.vote_average || 0,
    year: date ? parseInt(date.substring(0, 4)) : 0,
    overview: item.overview || '',
    genreIds: item.genre_ids || [],
  };
}

// ==================== TMDB CLIENT CACHE ====================
// Simple in-memory cache with TTL to avoid redundant API calls
// Uses endpoint URL as cache key

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class TmdbCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const tmdbCache = new TmdbCache();

// Cached fetch helper for TMDB API calls
export async function cachedTmdbFetch<T>(
  endpoint: string,
  ttl?: number
): Promise<T> {
  const cacheKey = endpoint;
  const cached = tmdbCache.get<T>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`/api/tmdb?endpoint=${endpoint}`);
  if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);
  const data = await res.json();
  tmdbCache.set(cacheKey, data, ttl);
  return data as T;
}

// Cached category loader - returns MovieItem[] from a TMDB endpoint
export async function cachedCategoryLoader(
  endpoint: string,
  limit = 20,
  ttl?: number
): Promise<MovieItem[]> {
  try {
    const data = await cachedTmdbFetch<{ results?: any[] }>(endpoint, ttl);
    return (data.results || []).slice(0, limit).map(mapTmdbToMovieItem);
  } catch (err) {
    console.error('Error loading category:', endpoint, err);
    return [];
  }
}

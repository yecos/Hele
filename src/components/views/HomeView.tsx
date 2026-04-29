'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { usePlayerStore, useFavoritesStore, useHistoryStore } from '@/lib/store';
import type { MovieItem } from '@/lib/tmdb';
import { HeroBanner } from '@/components/streaming/HeroBanner';
import { CategoryRow } from '@/components/streaming/MovieCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Info } from 'lucide-react';

interface CategoryData {
  title: string;
  loader: () => Promise<MovieItem[]>;
}

export function HomeView() {
  const { t } = useT();
  const playMovie = usePlayerStore(s => s.playMovie);
  const { favorites } = useFavoritesStore();
  const { history } = useHistoryStore();
  const [categories, setCategories] = useState<{ title: string; movies: MovieItem[] }[]>([]);
  const [heroMovies, setHeroMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const loadData = async () => {
      try {
        const categoryLoaders: CategoryData[] = [
          { title: '🔥 ' + t('home.trending'), loader: () => fetch('/api/tmdb?endpoint=/trending/all/week').then(r => r.json()).then(d => (d.results || []).filter((i: any) => i.media_type === 'movie' || i.media_type === 'tv').map(mapItem)) },
          { title: '🎬 ' + t('home.popularMovies'), loader: () => fetch('/api/tmdb?endpoint=/movie/popular').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '📺 ' + t('home.popularSeries'), loader: () => fetch('/api/tmdb?endpoint=/tv/popular').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '⭐ ' + t('home.topRated'), loader: () => fetch('/api/tmdb?endpoint=/movie/top_rated').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🆕 ' + t('home.nowPlaying'), loader: () => fetch('/api/tmdb?endpoint=/movie/now_playing&region=CO').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '🚀 ' + t('home.upcoming'), loader: () => fetch('/api/tmdb?endpoint=/movie/upcoming&region=CO').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '🎭 ' + t('home.topRatedSeries'), loader: () => fetch('/api/tmdb?endpoint=/tv/top_rated').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '📺 ' + t('home.airingToday'), loader: () => fetch('/api/tmdb?endpoint=/tv/airing_today').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '🎬 ' + t('home.action'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=28').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '😂 ' + t('home.comedy'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=35').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '😱 ' + t('home.horror'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=27').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔬 ' + t('home.scifi'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=878').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🦸 ' + t('home.animation'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=16').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '💎 ' + t('home.drama'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=18&sort_by=vote_average.desc&vote_count.gte=500').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
        ];

        const results = await Promise.allSettled(categoryLoaders.map(c => c.loader()));
        const loaded = categoryLoaders.map((c, i) => ({
          title: c.title,
          movies: results[i].status === 'fulfilled' ? results[i].value : [],
        }));

        // Retry failed categories once
        const failedIndices = results.map((r, i) => r.status === 'rejected' ? i : -1).filter(i => i >= 0);
        if (failedIndices.length > 0) {
          const retries = await Promise.allSettled(failedIndices.map(i => categoryLoaders[i].loader()));
          retries.forEach((r, j) => {
            if (r.status === 'fulfilled') {
              loaded[failedIndices[j]] = { title: loaded[failedIndices[j]].title, movies: r.value };
            }
          });
        }

        setCategories(loaded);

        // Set hero movies from trending
        const trending = loaded[0]?.movies || [];
        setHeroMovies(trending.slice(0, 10));

        // Load genres
        try {
          const [mg, tg] = await Promise.all([
            fetch('/api/tmdb?endpoint=/genre/movie/list').then(r => r.json()),
            fetch('/api/tmdb?endpoint=/genre/tv/list').then(r => r.json()),
          ]);
          const map = new Map<number, string>();
          [...(mg.genres || []), ...(tg.genres || [])].forEach((g: any) => map.set(g.id, g.name));
          setGenres(map);
        } catch {}
      } catch (err) {
        console.error('Error loading home:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="pt-20">
        {/* Hero skeleton */}
        <div className="w-full h-[60vh] min-h-[400px] bg-gray-900">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="max-w-[1400px] mx-auto px-4 py-4 space-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="w-[160px] h-[240px] rounded-xl flex-shrink-0" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20">
      {/* Continue Watching */}
      {history.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-2">
          <CategoryRow
            title={'▶️ ' + t('home.continueWatching')}
            movies={history.slice(0, 10).map(h => ({
              id: h.movieId,
              tmdbId: parseInt(h.movieId) || 0,
              title: h.title,
              mediaType: h.mediaType,
              posterUrl: h.posterUrl,
              backdropUrl: '',
              rating: 0,
              year: 0,
              overview: '',
              genreIds: [],
            }))}
            progressMap={Object.fromEntries(
              history.slice(0, 10).filter(h => h.progress > 0 && h.duration > 0).map(h => [h.movieId, h.progress / h.duration])
            )}
          />
        </div>
      )}

      {/* Hero */}
      <HeroBanner movies={heroMovies} />

      {/* Category rows */}
      <div className="max-w-[1400px] mx-auto space-y-6 py-4">
        {categories.map(cat => (
          <CategoryRow key={cat.title} title={cat.title} movies={cat.movies} />
        ))}
      </div>

      {/* Spacer at bottom */}
      <div className="h-20" />
    </div>
  );
}

// Helper to map TMDB API response to MovieItem
function mapItem(item: any): MovieItem {
  const isTV = !!item.name || item.media_type === 'tv';
  const date = isTV ? item.first_air_date : item.release_date;
  return {
    id: String(item.id),
    tmdbId: item.id,
    title: isTV ? (item.name || '') : (item.title || ''),
    mediaType: isTV ? 'tv' : 'movie',
    posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '/placeholder-poster.svg',
    backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
    rating: item.vote_average || 0,
    year: date ? parseInt(date.substring(0, 4)) : 0,
    overview: item.overview || '',
    genreIds: item.genre_ids || [],
  };
}

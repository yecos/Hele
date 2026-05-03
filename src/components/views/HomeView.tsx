'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { usePlayerStore, useFavoritesStore, useHistoryStore } from '@/lib/store';
import type { MovieItem } from '@/lib/tmdb';
import { mapTmdbToMovieItem, cachedCategoryLoader } from '@/lib/tmdb-utils';
import { HeroBanner } from '@/components/streaming/HeroBanner';
import { CategoryRow } from '@/components/streaming/MovieCard';
import { TopTenCarousel } from '@/components/streaming/TopTenCarousel';
import { Skeleton } from '@/components/ui/skeleton';

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

  useEffect(() => {
    const loadData = async () => {
      try {
        const categoryLoaders: CategoryData[] = [
          // ── Trending & Popular ──
          { title: '🔥 ' + t('home.trending'), loader: () => cachedCategoryLoader('/trending/all/week', 20, 3 * 60 * 1000).then(items => items.filter(i => i.mediaType === 'movie' || i.mediaType === 'tv')) },
          { title: '🎬 ' + t('home.popularMovies'), loader: () => cachedCategoryLoader('/movie/popular') },
          { title: '📺 ' + t('home.popularSeries'), loader: () => cachedCategoryLoader('/tv/popular') },

          // ── Top Rated & Now ──
          { title: '⭐ ' + t('home.topRated'), loader: () => cachedCategoryLoader('/movie/top_rated', 15) },
          { title: '🆕 ' + t('home.nowPlaying'), loader: () => cachedCategoryLoader('/movie/now_playing&region=CO') },
          { title: '🚀 ' + t('home.upcoming'), loader: () => cachedCategoryLoader('/movie/upcoming&region=CO') },
          { title: '🎭 ' + t('home.topRatedSeries'), loader: () => cachedCategoryLoader('/tv/top_rated', 15) },
          { title: '📡 ' + t('home.airingToday'), loader: () => cachedCategoryLoader('/tv/airing_today') },

          // ── Géneros de Película ──
          { title: '💥 ' + t('home.action'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=28') },
          { title: '😂 ' + t('home.comedy'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=35', 15) },
          { title: '😱 ' + t('home.horror'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=27', 15) },
          { title: '🔬 ' + t('home.scifi'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=878', 15) },
          { title: '🦸 ' + t('home.animation'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=16', 15) },
          { title: '💎 ' + t('home.drama'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=18&sort_by=vote_average.desc&vote_count.gte=500', 15) },
          { title: '💕 Romance', loader: () => cachedCategoryLoader('/discover/movie&with_genres=10749', 15) },
          { title: '🕵️ Thriller', loader: () => cachedCategoryLoader('/discover/movie&with_genres=53', 15) },
          { title: '🔍 Misterio', loader: () => cachedCategoryLoader('/discover/movie&with_genres=9648', 15) },
          { title: '🐉 Fantasía', loader: () => cachedCategoryLoader('/discover/movie&with_genres=14', 15) },
          { title: '🔫 Crimen', loader: () => cachedCategoryLoader('/discover/movie&with_genres=80', 15) },
          { title: '🌄 Aventura', loader: () => cachedCategoryLoader('/discover/movie&with_genres=12', 15) },
          { title: '🎵 Musical', loader: () => cachedCategoryLoader('/discover/movie&with_genres=10402', 15) },
          { title: '👨‍👩‍👧 Familiar', loader: () => cachedCategoryLoader('/discover/movie&with_genres=10751', 15) },
          { title: '🤠 Western', loader: () => cachedCategoryLoader('/discover/movie&with_genres=37', 15) },
          { title: '⚔️ Guerra', loader: () => cachedCategoryLoader('/discover/movie&with_genres=10752', 15) },
          { title: '📖 Historia', loader: () => cachedCategoryLoader('/discover/movie&with_genres=36', 15) },

          // ── Géneros de Serie ──
          { title: '🗡️ Series Acción', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10759', 15) },
          { title: '😂 Series Comedia', loader: () => cachedCategoryLoader('/discover/tv&with_genres=35', 15) },
          { title: '🔍 Series Misterio', loader: () => cachedCategoryLoader('/discover/tv&with_genres=9648', 15) },
          { title: '🧪 Series Sci-Fi & Fantasía', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10765', 15) },
          { title: '🎬 Documentales', loader: () => cachedCategoryLoader('/discover/tv&with_genres=99', 15) },

          // ── Por Año ──
          { title: '🎬 Estrenos 2026', loader: () => cachedCategoryLoader('/discover/movie&primary_release_year=2026&sort_by=popularity.desc', 15) },
          { title: '🎬 Lo Mejor 2025', loader: () => cachedCategoryLoader('/discover/movie&primary_release_year=2025&sort_by=vote_average.desc&vote_count.gte=200', 15) },
          { title: '🎬 Clásicos Modernos (2020s)', loader: () => cachedCategoryLoader('/discover/movie&primary_release_date.gte=2020-01-01&primary_release_date.lte=2024-12-31&sort_by=vote_average.desc&vote_count.gte=2000', 15) },
          { title: '🎞️ Clásicos de los 90s', loader: () => cachedCategoryLoader('/discover/movie&primary_release_date.gte=1990-01-01&primary_release_date.lte=1999-12-31&sort_by=vote_average.desc&vote_count.gte=2000', 15) },
          { title: '🎞️ Joyas de los 2000s', loader: () => cachedCategoryLoader('/discover/movie&primary_release_date.gte=2000-01-01&primary_release_date.lte=2009-12-31&sort_by=vote_average.desc&vote_count.gte=2000', 15) },

          // ── Por Región / Idioma ──
          { title: '🇪🇸 Cine Español', loader: () => cachedCategoryLoader('/discover/movie&with_original_language=es&sort_by=popularity.desc', 15) },
          { title: '🇰🇷 Cine Coreano', loader: () => cachedCategoryLoader('/discover/movie&with_original_language=ko&sort_by=popularity.desc', 15) },
          { title: '🇯🇵 Anime & Cine Japonés', loader: () => cachedCategoryLoader('/discover/movie&with_original_language=ja&sort_by=popularity.desc', 15) },
          { title: '🇫🇷 Cine Francés', loader: () => cachedCategoryLoader('/discover/movie&with_original_language=fr&sort_by=popularity.desc&vote_count.gte=100', 15) },

          // ── Especiales ──
          { title: '🏆 Premios Oscar (Mejor Valoradas)', loader: () => cachedCategoryLoader('/discover/movie&sort_by=vote_average.desc&vote_count.gte=5000', 15) },
          { title: '🎭 Películas Independientes', loader: () => cachedCategoryLoader('/discover/movie&with_genres=18&without_genres=28,12,878&sort_by=vote_average.desc&vote_count.gte=200', 15) },
          { title: '🧒 Para Toda la Familia', loader: () => cachedCategoryLoader('/discover/movie&with_genres=10751&sort_by=popularity.desc', 15) },
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
      } catch (err) {
        console.error('Error loading home:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Continue watching items from history with progress
  const continueWatching = history
    .filter(h => h.posterUrl && h.progress > 0 && h.duration > 0)
    .slice(0, 10)
    .map(h => ({
      id: h.movieId,
      tmdbId: parseInt(h.movieId) || 0,
      title: h.title,
      mediaType: h.mediaType,
      posterUrl: h.posterUrl,
      backdropUrl: h.backdropUrl || '',
      rating: h.rating || 0,
      year: h.year || 0,
      overview: h.overview || '',
      genreIds: [],
    }));

  const continueProgressMap = Object.fromEntries(
    history
      .filter(h => h.progress > 0 && h.duration > 0)
      .slice(0, 10)
      .map(h => [h.movieId, h.progress / h.duration])
  );

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
      {continueWatching.length > 0 && (
        <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-2">
          <CategoryRow
            title={'▶️ ' + t('home.continueWatching')}
            movies={continueWatching}
            progressMap={continueProgressMap}
          />
        </div>
      )}

      {/* Hero */}
      <HeroBanner movies={heroMovies} />

      {/* Top 10 trending today */}
      <div className="max-w-[1400px] mx-auto pt-4 pb-2">
        <TopTenCarousel title="Top 10 en Tendencia Hoy" type="all" />
      </div>

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

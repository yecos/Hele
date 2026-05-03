'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import type { MovieItem } from '@/lib/tmdb';
import { cachedCategoryLoader } from '@/lib/tmdb-utils';
import { CategoryRow } from '@/components/streaming/MovieCard';
import { TopTenCarousel } from '@/components/streaming/TopTenCarousel';
import { Skeleton } from '@/components/ui/skeleton';
import { Film } from 'lucide-react';

interface CategoryData {
  title: string;
  loader: () => Promise<MovieItem[]>;
}

export function MoviesView() {
  const { t } = useT();
  const [categories, setCategories] = useState<{ title: string; movies: MovieItem[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const categoryLoaders: CategoryData[] = [
          // ── Trending & Popular ──
          { title: '🎬 ' + t('movies.trending'), loader: () => cachedCategoryLoader('/trending/movie/week') },
          { title: '🔥 ' + t('movies.popular'), loader: () => cachedCategoryLoader('/movie/popular') },
          { title: '⭐ ' + t('movies.topRated'), loader: () => cachedCategoryLoader('/movie/top_rated', 15) },
          { title: '🆕 ' + t('movies.nowPlaying'), loader: () => cachedCategoryLoader('/movie/now_playing&region=CO') },
          { title: '🚀 ' + t('movies.upcoming'), loader: () => cachedCategoryLoader('/movie/upcoming&region=CO') },

          // ── Géneros ──
          { title: '💥 ' + t('movies.action'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=28') },
          { title: '😂 ' + t('movies.comedy'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=35', 15) },
          { title: '😱 ' + t('movies.horror'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=27', 15) },
          { title: '🔬 ' + t('movies.scifi'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=878', 15) },
          { title: '🦸 ' + t('movies.animation'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=16', 15) },
          { title: '💎 ' + t('movies.drama'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=18&sort_by=vote_average.desc&vote_count.gte=500', 15) },
          { title: '💕 ' + t('movies.romance'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=10749', 15) },
          { title: '🕵️ ' + t('movies.thriller'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=53', 15) },
          { title: '🔍 ' + t('movies.mystery'), loader: () => cachedCategoryLoader('/discover/movie&with_genres=9648', 15) },
          { title: '🐉 Fantasía', loader: () => cachedCategoryLoader('/discover/movie&with_genres=14', 15) },
          { title: '🔫 Crimen', loader: () => cachedCategoryLoader('/discover/movie&with_genres=80', 15) },
          { title: '🌄 Aventura', loader: () => cachedCategoryLoader('/discover/movie&with_genres=12', 15) },
          { title: '🎵 Musical', loader: () => cachedCategoryLoader('/discover/movie&with_genres=10402', 15) },
          { title: '👨‍👩‍👧 Familiar', loader: () => cachedCategoryLoader('/discover/movie&with_genres=10751', 15) },
          { title: '🤠 Western', loader: () => cachedCategoryLoader('/discover/movie&with_genres=37', 15) },
          { title: '⚔️ Guerra', loader: () => cachedCategoryLoader('/discover/movie&with_genres=10752', 15) },
          { title: '📖 Historia', loader: () => cachedCategoryLoader('/discover/movie&with_genres=36', 15) },
          { title: '🔬 Documentales', loader: () => cachedCategoryLoader('/discover/movie&with_genres=99', 15) },
          { title: '📺 Película de TV', loader: () => cachedCategoryLoader('/discover/movie&with_genres=10770', 15) },

          // ── Por Año ──
          { title: '🎬 Estrenos 2026', loader: () => cachedCategoryLoader('/discover/movie&primary_release_year=2026&sort_by=popularity.desc', 15) },
          { title: '🌟 Lo Mejor 2025', loader: () => cachedCategoryLoader('/discover/movie&primary_release_year=2025&sort_by=vote_average.desc&vote_count.gte=200', 15) },
          { title: '🔥 Populares 2024', loader: () => cachedCategoryLoader('/discover/movie&primary_release_year=2024&sort_by=popularity.desc&vote_count.gte=200', 15) },
          { title: '🎞️ Clásicos de los 90s', loader: () => cachedCategoryLoader('/discover/movie&primary_release_date.gte=1990-01-01&primary_release_date.lte=1999-12-31&sort_by=vote_average.desc&vote_count.gte=2000', 15) },
          { title: '🎞️ Joyas de los 2000s', loader: () => cachedCategoryLoader('/discover/movie&primary_release_date.gte=2000-01-01&primary_release_date.lte=2009-12-31&sort_by=vote_average.desc&vote_count.gte=2000', 15) },
          { title: '🎞️ Años 2010', loader: () => cachedCategoryLoader('/discover/movie&primary_release_date.gte=2010-01-01&primary_release_date.lte=2019-12-31&sort_by=vote_average.desc&vote_count.gte=3000', 15) },
          { title: '📽️ Clásicos de los 80s', loader: () => cachedCategoryLoader('/discover/movie&primary_release_date.gte=1980-01-01&primary_release_date.lte=1989-12-31&sort_by=vote_average.desc&vote_count.gte=1000', 15) },
          { title: '📽️ Años 70s & Anteriores', loader: () => cachedCategoryLoader('/discover/movie&primary_release_date.lte=1979-12-31&sort_by=vote_average.desc&vote_count.gte=500', 15) },

          // ── Por Región / Idioma ──
          { title: '🇪🇸 Cine Español', loader: () => cachedCategoryLoader('/discover/movie&with_original_language=es&sort_by=popularity.desc', 15) },
          { title: '🇰🇷 Cine Coreano', loader: () => cachedCategoryLoader('/discover/movie&with_original_language=ko&sort_by=popularity.desc', 15) },
          { title: '🇯🇵 Anime & Cine Japonés', loader: () => cachedCategoryLoader('/discover/movie&with_original_language=ja&sort_by=popularity.desc', 15) },
          { title: '🇫🇷 Cine Francés', loader: () => cachedCategoryLoader('/discover/movie&with_original_language=fr&sort_by=popularity.desc&vote_count.gte=100', 15) },
          { title: '🇮🇹 Cine Italiano', loader: () => cachedCategoryLoader('/discover/movie&with_original_language=it&sort_by=popularity.desc&vote_count.gte=100', 15) },
          { title: '🇧🇷 Cine Brasileño', loader: () => cachedCategoryLoader('/discover/movie&with_original_language=pt&sort_by=popularity.desc&vote_count.gte=50', 15) },
          { title: '🇮🇳 Cine Indio (Bollywood)', loader: () => cachedCategoryLoader('/discover/movie&with_original_language=hi&sort_by=popularity.desc', 15) },
          { title: '🇩🇪 Cine Alemán', loader: () => cachedCategoryLoader('/discover/movie&with_original_language=de&sort_by=popularity.desc&vote_count.gte=100', 15) },

          // ── Combinaciones / Especiales ──
          { title: '🏆 Mejor Valoradas de Todos los Tiempos', loader: () => cachedCategoryLoader('/discover/movie&sort_by=vote_average.desc&vote_count.gte=5000', 15) },
          { title: '💥 Acción + Aventura', loader: () => cachedCategoryLoader('/discover/movie&with_genres=28,12', 15) },
          { title: '😱 Terror + Misterio', loader: () => cachedCategoryLoader('/discover/movie&with_genres=27,9648', 15) },
          { title: '💕 Comedia Romántica', loader: () => cachedCategoryLoader('/discover/movie&with_genres=35,10749', 15) },
          { title: '🔬 Ciencia Ficción + Aventura', loader: () => cachedCategoryLoader('/discover/movie&with_genres=878,12', 15) },
          { title: '🎭 Drama Independiente', loader: () => cachedCategoryLoader('/discover/movie&with_genres=18&without_genres=28,12,878&sort_by=vote_average.desc&vote_count.gte=200', 15) },
          { title: '🦸 Animación para Adultos', loader: () => cachedCategoryLoader('/discover/movie&with_genres=16&without_genres=10751&sort_by=vote_average.desc&vote_count.gte=500', 15) },
          { title: '⚔️ Guerra + Historia', loader: () => cachedCategoryLoader('/discover/movie&with_genres=10752,36', 15) },
          { title: '🔫 Crimen + Thriller', loader: () => cachedCategoryLoader('/discover/movie&with_genres=80,53', 15) },
          { title: '🐉 Fantasía + Aventura', loader: () => cachedCategoryLoader('/discover/movie&with_genres=14,12', 15) },
        ];

        const results = await Promise.allSettled(categoryLoaders.map(c => c.loader()));
        const loaded = categoryLoaders.map((c, i) => ({
          title: c.title,
          movies: results[i].status === 'fulfilled' ? results[i].value : [],
        }));

        setCategories(loaded);
      } catch (err) {
        console.error('Error loading movies:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="pt-20 px-4 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Film size={28} className="text-red-500" />
          <h1 className="text-2xl font-bold text-white">{t('movies.title')}</h1>
        </div>
        <div className="space-y-8">
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
      <div className="px-4 max-w-[1400px] mx-auto mb-4">
        <div className="flex items-center gap-3">
          <Film size={28} className="text-red-500" />
          <h1 className="text-2xl font-bold text-white">{t('movies.title')}</h1>
        </div>
      </div>

      {/* Top 10 Movies */}
      <div className="px-4 max-w-[1400px] mx-auto">
        <TopTenCarousel title="Top 10 Películas" type="movie" />
      </div>

      <div className="max-w-[1400px] mx-auto space-y-6">
        {categories.map(cat => (
          <CategoryRow key={cat.title} title={cat.title} movies={cat.movies} />
        ))}
      </div>

      <div className="h-20" />
    </div>
  );
}

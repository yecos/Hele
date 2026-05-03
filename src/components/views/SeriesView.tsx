'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import type { MovieItem } from '@/lib/tmdb';
import { cachedCategoryLoader } from '@/lib/tmdb-utils';
import { CategoryRow } from '@/components/streaming/MovieCard';
import { TopTenCarousel } from '@/components/streaming/TopTenCarousel';
import { Skeleton } from '@/components/ui/skeleton';
import { Tv } from 'lucide-react';

interface CategoryData {
  title: string;
  loader: () => Promise<MovieItem[]>;
}

export function SeriesView() {
  const { t } = useT();
  const [categories, setCategories] = useState<{ title: string; movies: MovieItem[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const categoryLoaders: CategoryData[] = [
          // ── Trending & Popular ──
          { title: '📺 ' + t('series.trending'), loader: () => cachedCategoryLoader('/trending/tv/week') },
          { title: '🔥 ' + t('series.popular'), loader: () => cachedCategoryLoader('/tv/popular') },
          { title: '⭐ ' + t('series.topRated'), loader: () => cachedCategoryLoader('/tv/top_rated', 15) },
          { title: '📡 ' + t('series.airingToday'), loader: () => cachedCategoryLoader('/tv/airing_today') },
          { title: '🆕 ' + t('series.onTheAir'), loader: () => cachedCategoryLoader('/tv/on_the_air') },

          // ── Géneros ──
          { title: '🎭 ' + t('series.drama'), loader: () => cachedCategoryLoader('/discover/tv&with_genres=18&sort_by=popularity.desc', 15) },
          { title: '😂 ' + t('series.comedy'), loader: () => cachedCategoryLoader('/discover/tv&with_genres=35', 15) },
          { title: '🔍 ' + t('series.mystery'), loader: () => cachedCategoryLoader('/discover/tv&with_genres=9648', 15) },
          { title: '🧪 ' + t('series.scifi'), loader: () => cachedCategoryLoader('/discover/tv&with_genres=10765', 15) },
          { title: '📺 ' + t('series.animation'), loader: () => cachedCategoryLoader('/discover/tv&with_genres=16', 15) },
          { title: '📸 ' + t('series.documentary'), loader: () => cachedCategoryLoader('/discover/tv&with_genres=99', 15) },
          { title: '🧟 ' + t('series.horror'), loader: () => cachedCategoryLoader('/discover/tv&with_genres=27', 15) },
          { title: '🗡️ Acción & Aventura', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10759', 15) },
          { title: '🔫 Crimen', loader: () => cachedCategoryLoader('/discover/tv&with_genres=80', 15) },
          { title: '💕 Romance en TV', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10749', 15) },
          { title: '👨‍👩‍👧 Familiar', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10751', 15) },
          { title: '🧒 Infantil', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10762', 15) },
          { title: '🎤 Reality Shows', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10764', 15) },
          { title: '📰 Noticias', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10763', 15) },
          { title: '🎙️ Talk Shows', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10767', 15) },
          { title: '⚔️ Guerra & Política', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10768', 15) },
          { title: '🧼 Telenovelas', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10766', 15) },

          // ── Por Año ──
          { title: '🆕 Series 2026', loader: () => cachedCategoryLoader('/discover/tv&first_air_date_year=2026&sort_by=popularity.desc', 15) },
          { title: '🌟 Lo Mejor 2025', loader: () => cachedCategoryLoader('/discover/tv&first_air_date_year=2025&sort_by=vote_average.desc&vote_count.gte=100', 15) },
          { title: '🔥 Populares 2024', loader: () => cachedCategoryLoader('/discover/tv&first_air_date_year=2024&sort_by=popularity.desc&vote_count.gte=100', 15) },
          { title: '🎞️ Series Clásicas (90s)', loader: () => cachedCategoryLoader('/discover/tv&first_air_date.gte=1990-01-01&first_air_date.lte=1999-12-31&sort_by=vote_average.desc&vote_count.gte=500', 15) },
          { title: '🎞️ Series de los 2000s', loader: () => cachedCategoryLoader('/discover/tv&first_air_date.gte=2000-01-01&first_air_date.lte=2009-12-31&sort_by=vote_average.desc&vote_count.gte=500', 15) },
          { title: '🎞️ Series de los 2010s', loader: () => cachedCategoryLoader('/discover/tv&first_air_date.gte=2010-01-01&first_air_date.lte=2019-12-31&sort_by=vote_average.desc&vote_count.gte=1000', 15) },

          // ── Por Región / Idioma ──
          { title: '🇪🇸 Series Españolas', loader: () => cachedCategoryLoader('/discover/tv&with_original_language=es&sort_by=popularity.desc', 15) },
          { title: '🇰🇷 K-Dramas', loader: () => cachedCategoryLoader('/discover/tv&with_original_language=ko&sort_by=popularity.desc', 15) },
          { title: '🇯🇵 Anime Series', loader: () => cachedCategoryLoader('/discover/tv&with_original_language=ja&with_genres=16&sort_by=popularity.desc', 15) },
          { title: '🇯🇵 Series Japonesas', loader: () => cachedCategoryLoader('/discover/tv&with_original_language=ja&sort_by=popularity.desc', 15) },
          { title: '🇩🇪 Series Alemanas', loader: () => cachedCategoryLoader('/discover/tv&with_original_language=de&sort_by=popularity.desc&vote_count.gte=50', 15) },
          { title: '🇹🇷 Series Turcas', loader: () => cachedCategoryLoader('/discover/tv&with_original_language=tr&sort_by=popularity.desc', 15) },
          { title: '🇮🇳 Series Indias', loader: () => cachedCategoryLoader('/discover/tv&with_original_language=hi&sort_by=popularity.desc', 15) },
          { title: '🇧🇷 Series Brasileñas', loader: () => cachedCategoryLoader('/discover/tv&with_original_language=pt&sort_by=popularity.desc', 15) },
          { title: '🇫🇷 Series Francesas', loader: () => cachedCategoryLoader('/discover/tv&with_original_language=fr&sort_by=popularity.desc&vote_count.gte=50', 15) },

          // ── Especiales ──
          { title: '🏆 Mejor Valoradas de Todos los Tiempos', loader: () => cachedCategoryLoader('/discover/tv&sort_by=vote_average.desc&vote_count.gte=3000', 15) },
          { title: '🔪 Crimen + Misterio', loader: () => cachedCategoryLoader('/discover/tv&with_genres=80,9648', 15) },
          { title: '🧪 Sci-Fi + Fantasía Popular', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10765&sort_by=popularity.desc', 15) },
          { title: '🎭 Drama + Crimen', loader: () => cachedCategoryLoader('/discover/tv&with_genres=18,80', 15) },
          { title: '🧟 Terror + Misterio', loader: () => cachedCategoryLoader('/discover/tv&with_genres=27,9648', 15) },
          { title: '😂 Comedia + Romance', loader: () => cachedCategoryLoader('/discover/tv&with_genres=35,10749', 15) },
          { title: '⚔️ Acción + Sci-Fi', loader: () => cachedCategoryLoader('/discover/tv&with_genres=10759,10765', 15) },
          { title: '🎬 Miniseries (1 temporada)', loader: () => cachedCategoryLoader('/discover/tv&with_genres=18&with_runtime=30&sort_by=vote_average.desc&vote_count.gte=500', 15) },
        ];

        const results = await Promise.allSettled(categoryLoaders.map(c => c.loader()));
        const loaded = categoryLoaders.map((c, i) => ({
          title: c.title,
          movies: results[i].status === 'fulfilled' ? results[i].value : [],
        }));

        setCategories(loaded);
      } catch (err) {
        console.error('Error loading series:', err);
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
          <Tv size={28} className="text-blue-500" />
          <h1 className="text-2xl font-bold text-white">{t('series.title')}</h1>
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
          <Tv size={28} className="text-blue-500" />
          <h1 className="text-2xl font-bold text-white">{t('series.title')}</h1>
        </div>
      </div>

      {/* Top 10 Series */}
      <div className="px-4 max-w-[1400px] mx-auto">
        <TopTenCarousel title="Top 10 Series" type="tv" />
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

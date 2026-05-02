'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import type { MovieItem } from '@/lib/tmdb';
import { CategoryRow } from '@/components/streaming/MovieCard';
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
          { title: '📺 ' + t('series.trending'), loader: () => fetch('/api/tmdb?endpoint=/trending/tv/week').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '🔥 ' + t('series.popular'), loader: () => fetch('/api/tmdb?endpoint=/tv/popular').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '⭐ ' + t('series.topRated'), loader: () => fetch('/api/tmdb?endpoint=/tv/top_rated').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '📡 ' + t('series.airingToday'), loader: () => fetch('/api/tmdb?endpoint=/tv/airing_today').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '🆕 ' + t('series.onTheAir'), loader: () => fetch('/api/tmdb?endpoint=/tv/on_the_air').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },

          // ── Géneros ──
          { title: '🎭 ' + t('series.drama'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=18&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '😂 ' + t('series.comedy'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=35').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔍 ' + t('series.mystery'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=9648').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🧪 ' + t('series.scifi'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10765').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '📺 ' + t('series.animation'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=16').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '📸 ' + t('series.documentary'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=99').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🧟 ' + t('series.horror'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=27').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🗡️ Acción & Aventura', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10759').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔫 Crimen', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=80').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '💕 Romance en TV', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10749').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '👨‍👩‍👧 Familiar', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10751').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🧒 Infantil', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10762').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🎤 Reality Shows', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10764').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '📰 Noticias', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10763').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🎙️ Talk Shows', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10767').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '⚔️ Guerra & Política', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10768').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🧼 Telenovelas', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10766').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },

          // ── Por Año ──
          { title: '🆕 Series 2026', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&first_air_date_year=2026&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🌟 Lo Mejor 2025', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&first_air_date_year=2025&sort_by=vote_average.desc&vote_count.gte=100').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔥 Populares 2024', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&first_air_date_year=2024&sort_by=popularity.desc&vote_count.gte=100').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🎞️ Series Clásicas (90s)', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&first_air_date.gte=1990-01-01&first_air_date.lte=1999-12-31&sort_by=vote_average.desc&vote_count.gte=500').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🎞️ Series de los 2000s', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&first_air_date.gte=2000-01-01&first_air_date.lte=2009-12-31&sort_by=vote_average.desc&vote_count.gte=500').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🎞️ Series de los 2010s', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&first_air_date.gte=2010-01-01&first_air_date.lte=2019-12-31&sort_by=vote_average.desc&vote_count.gte=1000').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },

          // ── Por Región / Idioma ──
          { title: '🇪🇸 Series Españolas', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_original_language=es&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇰🇷 K-Dramas', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_original_language=ko&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇯🇵 Anime Series', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_original_language=ja&with_genres=16&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇯🇵 Series Japonesas', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_original_language=ja&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇩🇪 Series Alemanas', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_original_language=de&sort_by=popularity.desc&vote_count.gte=50').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇹🇷 Series Turcas', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_original_language=tr&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇮🇳 Series Indias', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_original_language=hi&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇧🇷 Series Brasileñas', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_original_language=pt&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇫🇷 Series Francesas', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_original_language=fr&sort_by=popularity.desc&vote_count.gte=50').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },

          // ── Especiales ──
          { title: '🏆 Mejor Valoradas de Todos los Tiempos', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&sort_by=vote_average.desc&vote_count.gte=3000').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔪 Crimen + Misterio', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=80,9648').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🧪 Sci-Fi + Fantasía Popular', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10765&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🎭 Drama + Crimen', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=18,80').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🧟 Terror + Misterio', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=27,9648').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '😂 Comedia + Romance', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=35,10749').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '⚔️ Acción + Sci-Fi', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10759,10765').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🎬 Miniseries (1 temporada)', loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=18&with_runtime=30&sort_by=vote_average.desc&vote_count.gte=500').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
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

      <div className="max-w-[1400px] mx-auto space-y-6">
        {categories.map(cat => (
          <CategoryRow key={cat.title} title={cat.title} movies={cat.movies} />
        ))}
      </div>

      <div className="h-20" />
    </div>
  );
}

function mapItem(item: any): MovieItem {
  return {
    id: String(item.id),
    tmdbId: item.id,
    title: item.name || '',
    mediaType: 'tv',
    posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
    backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
    rating: item.vote_average || 0,
    year: item.first_air_date ? parseInt(item.first_air_date.substring(0, 4)) : 0,
    overview: item.overview || '',
    genreIds: item.genre_ids || [],
  };
}

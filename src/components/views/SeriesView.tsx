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
          { title: '📺 ' + t('series.trending'), loader: () => fetch('/api/tmdb?endpoint=/trending/tv/week').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '🔥 ' + t('series.popular'), loader: () => fetch('/api/tmdb?endpoint=/tv/popular').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '⭐ ' + t('series.topRated'), loader: () => fetch('/api/tmdb?endpoint=/tv/top_rated').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '📡 ' + t('series.airingToday'), loader: () => fetch('/api/tmdb?endpoint=/tv/airing_today').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '🆕 ' + t('series.onTheAir'), loader: () => fetch('/api/tmdb?endpoint=/tv/on_the_air').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '🎭 ' + t('series.drama'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=18&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '😂 ' + t('series.comedy'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=35').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔍 ' + t('series.mystery'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=9648').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🧪 ' + t('series.scifi'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=10765').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '📺 ' + t('series.animation'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=16').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '📸 ' + t('series.documentary'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=99').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🧟 ' + t('series.horror'), loader: () => fetch('/api/tmdb?endpoint=/discover/tv&with_genres=27').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
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

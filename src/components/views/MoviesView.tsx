'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import type { MovieItem } from '@/lib/tmdb';
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
          { title: '🎬 ' + t('movies.trending'), loader: () => fetch('/api/tmdb?endpoint=/trending/movie/week').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '🔥 ' + t('movies.popular'), loader: () => fetch('/api/tmdb?endpoint=/movie/popular').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '⭐ ' + t('movies.topRated'), loader: () => fetch('/api/tmdb?endpoint=/movie/top_rated').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🆕 ' + t('movies.nowPlaying'), loader: () => fetch('/api/tmdb?endpoint=/movie/now_playing&region=CO').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '🚀 ' + t('movies.upcoming'), loader: () => fetch('/api/tmdb?endpoint=/movie/upcoming&region=CO').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },

          // ── Géneros ──
          { title: '💥 ' + t('movies.action'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=28').then(r => r.json()).then(d => (d.results || []).map(mapItem)) },
          { title: '😂 ' + t('movies.comedy'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=35').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '😱 ' + t('movies.horror'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=27').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔬 ' + t('movies.scifi'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=878').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🦸 ' + t('movies.animation'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=16').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '💎 ' + t('movies.drama'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=18&sort_by=vote_average.desc&vote_count.gte=500').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '💕 ' + t('movies.romance'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=10749').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🕵️ ' + t('movies.thriller'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=53').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔍 ' + t('movies.mystery'), loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=9648').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🐉 Fantasía', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=14').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔫 Crimen', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=80').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🌄 Aventura', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=12').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🎵 Musical', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=10402').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '👨‍👩‍👧 Familiar', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=10751').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🤠 Western', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=37').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '⚔️ Guerra', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=10752').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '📖 Historia', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=36').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔬 Documentales', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=99').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '📺 Película de TV', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=10770').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },

          // ── Por Año ──
          { title: '🎬 Estrenos 2026', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&primary_release_year=2026&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🌟 Lo Mejor 2025', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&primary_release_year=2025&sort_by=vote_average.desc&vote_count.gte=200').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔥 Populares 2024', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&primary_release_year=2024&sort_by=popularity.desc&vote_count.gte=200').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🎞️ Clásicos de los 90s', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&primary_release_date.gte=1990-01-01&primary_release_date.lte=1999-12-31&sort_by=vote_average.desc&vote_count.gte=2000').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🎞️ Joyas de los 2000s', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&primary_release_date.gte=2000-01-01&primary_release_date.lte=2009-12-31&sort_by=vote_average.desc&vote_count.gte=2000').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🎞️ Años 2010', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&primary_release_date.gte=2010-01-01&primary_release_date.lte=2019-12-31&sort_by=vote_average.desc&vote_count.gte=3000').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '📽️ Clásicos de los 80s', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&primary_release_date.gte=1980-01-01&primary_release_date.lte=1989-12-31&sort_by=vote_average.desc&vote_count.gte=1000').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '📽️ Años 70s & Anteriores', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&primary_release_date.lte=1979-12-31&sort_by=vote_average.desc&vote_count.gte=500').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },

          // ── Por Región / Idioma ──
          { title: '🇪🇸 Cine Español', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_original_language=es&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇰🇷 Cine Coreano', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_original_language=ko&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇯🇵 Anime & Cine Japonés', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_original_language=ja&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇫🇷 Cine Francés', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_original_language=fr&sort_by=popularity.desc&vote_count.gte=100').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇮🇹 Cine Italiano', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_original_language=it&sort_by=popularity.desc&vote_count.gte=100').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇧🇷 Cine Brasileño', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_original_language=pt&sort_by=popularity.desc&vote_count.gte=50').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇮🇳 Cine Indio (Bollywood)', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_original_language=hi&sort_by=popularity.desc').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🇩🇪 Cine Alemán', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_original_language=de&sort_by=popularity.desc&vote_count.gte=100').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },

          // ── Combinaciones / Especiales ──
          { title: '🏆 Mejor Valoradas de Todos los Tiempos', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&sort_by=vote_average.desc&vote_count.gte=5000').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '💥 Acción + Aventura', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=28,12').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '😱 Terror + Misterio', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=27,9648').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '💕 Comedia Romántica', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=35,10749').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔬 Ciencia Ficción + Aventura', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=878,12').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🎭 Drama Independiente', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=18&without_genres=28,12,878&sort_by=vote_average.desc&vote_count.gte=200').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🦸 Animación para Adultos', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=16&without_genres=10751&sort_by=vote_average.desc&vote_count.gte=500').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '⚔️ Guerra + Historia', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=10752,36').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🔫 Crimen + Thriller', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=80,53').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
          { title: '🐉 Fantasía + Aventura', loader: () => fetch('/api/tmdb?endpoint=/discover/movie&with_genres=14,12').then(r => r.json()).then(d => (d.results || []).slice(0, 15).map(mapItem)) },
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

function mapItem(item: any): MovieItem {
  return {
    id: String(item.id),
    tmdbId: item.id,
    title: item.title || '',
    mediaType: 'movie',
    posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
    backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
    rating: item.vote_average || 0,
    year: item.release_date ? parseInt(item.release_date.substring(0, 4)) : 0,
    overview: item.overview || '',
    genreIds: item.genre_ids || [],
  };
}

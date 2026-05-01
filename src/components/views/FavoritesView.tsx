'use client';

import { useState, useEffect } from 'react';
import { useFavoritesStore, usePlayerStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import type { MovieItem } from '@/lib/tmdb';
import { Heart, Trash2, Play, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function FavoritesView() {
  const { favorites } = useFavoritesStore();
  const playMovie = usePlayerStore(s => s.playMovie);
  const { t } = useT();
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (favorites.length === 0) {
      setMovies([]);
      setLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      setLoading(true);
      try {
        // Fetch each favorite by TMDB ID
        const items = await Promise.allSettled(
          favorites.map(async (id) => {
            const isTV = id.startsWith('tv-');
            const tmdbId = isTV ? parseInt(id.replace('tv-', '')) : parseInt(id);
            const type = isTV ? 'tv' : 'movie';
            const endpoint = `/${type}/${tmdbId}`;
            const res = await fetch(`/api/tmdb?endpoint=${endpoint}`);
            if (!res.ok) return null;
            const data = await res.json();
            return {
              id: String(data.id),
              tmdbId: data.id,
              title: isTV ? (data.name || '') : (data.title || ''),
              mediaType: type as 'movie' | 'tv',
              posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
              backdropUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '',
              rating: data.vote_average || 0,
              year: (isTV ? data.first_air_date : data.release_date)?.substring(0, 4) ? parseInt((isTV ? data.first_air_date : data.release_date).substring(0, 4)) : 0,
              overview: data.overview || '',
              genreIds: data.genre_ids || [],
            } as MovieItem;
          })
        );
        setMovies(items.filter((r): r is PromiseFulfilledResult<MovieItem> => r.status === 'fulfilled' && r.value !== null).map(r => r.value));
      } catch (err) {
        console.error('Error loading favorites:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [favorites]);

  return (
    <div className="pt-20 px-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Heart size={28} className="text-red-500" />
        <h1 className="text-2xl font-bold text-white">{t('favorites.title')}</h1>
        <span className="text-gray-500 text-sm">({favorites.length})</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {movies.map(movie => (
            <div
              key={movie.id}
              onClick={() => playMovie(movie)}
              className="group cursor-pointer"
            >
              <div className="relative rounded-xl overflow-hidden aspect-[2/3] bg-gray-900">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={20} fill="white" className="ml-0.5" />
                  </div>
                </div>
                {movie.rating > 0 && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-yellow-400 px-2 py-0.5 rounded-md text-xs font-bold">
                    <Star size={10} fill="currentColor" />
                    {movie.rating.toFixed(1)}
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase">
                  {movie.mediaType === 'movie' ? t('misc.peli') : t('misc.serie')}
                </div>
              </div>
              <p className="text-white text-sm font-medium mt-2 truncate">{movie.title}</p>
              <p className="text-gray-500 text-xs">{movie.year > 0 ? movie.year : ''}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <img src="/logo.svg" alt="XuperStream" className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <Heart size={48} className="text-gray-700 mx-auto mb-4" />
          <h3 className="text-gray-400 text-lg font-semibold">{t('favorites.empty')}</h3>
          <p className="text-gray-600 text-sm mt-1">{t('favorites.emptyDesc')}</p>
        </div>
      )}

      <div className="h-20" />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useFavoritesStore, usePlayerStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { Heart, Play, Star, Film, Tv, Trash2, ArrowUpDown } from 'lucide-react';

type SortMode = 'recent' | 'rating' | 'year' | 'title';
type FilterMode = 'all' | 'movie' | 'tv';

export function FavoritesView() {
  const { favorites, toggleFavorite } = useFavoritesStore();
  const playMovie = usePlayerStore(s => s.playMovie);
  const { t } = useT();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  // Filter favorites
  const filtered = filter === 'all'
    ? favorites
    : favorites.filter(f => f.mediaType === filter);

  // Sort favorites
  const sorted = [...filtered].sort((a, b) => {
    switch (sortMode) {
      case 'rating': return b.rating - a.rating;
      case 'year': return b.year - a.year;
      case 'title': return a.title.localeCompare(b.title);
      case 'recent':
      default: return (b.addedAt || 0) - (a.addedAt || 0);
    }
  });

  // Movies with posters (for grid display)
  const withPosters = sorted.filter(f => f.posterUrl && f.title);
  // Movies without posters (old migrated format - need API fetch)
  const withoutPosters = sorted.filter(f => !f.posterUrl || !f.title);

  const sortLabels: Record<SortMode, string> = {
    recent: 'Recientes',
    rating: 'Valoración',
    year: 'Año',
    title: 'Título',
  };

  return (
    <div className="pt-20 px-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Heart size={28} className="text-red-500" />
          <h1 className="text-2xl font-bold text-white">{t('favorites.title')}</h1>
          <span className="text-gray-500 text-sm">({favorites.length})</span>
        </div>
      </div>

      {/* Filter and sort controls */}
      {favorites.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {[
              { id: 'all' as const, label: t('search.all') },
              { id: 'movie' as const, label: t('search.movies') },
              { id: 'tv' as const, label: t('search.series') },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f.id
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-gray-500" />
            {Object.entries(sortLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortMode(key as SortMode)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                  sortMode === key
                    ? 'bg-red-600/20 text-red-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {sorted.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
          {sorted.map(item => (
            <div
              key={item.id}
              className="group cursor-pointer relative"
              onClick={() => playMovie({
                id: item.id,
                tmdbId: item.tmdbId,
                title: item.title,
                mediaType: item.mediaType,
                posterUrl: item.posterUrl,
                backdropUrl: item.backdropUrl,
                rating: item.rating,
                year: item.year,
                overview: item.overview,
                genreIds: item.genreIds,
              })}
            >
              <div className="relative rounded-xl overflow-hidden aspect-[2/3] bg-gray-900">
                {item.posterUrl ? (
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
                    {item.mediaType === 'tv' ? <Tv size={24} className="text-gray-600" /> : <Film size={24} className="text-gray-600" />}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={20} fill="white" className="ml-0.5" />
                  </div>
                </div>
                {item.rating > 0 && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-yellow-400 px-2 py-0.5 rounded-md text-xs font-bold">
                    <Star size={10} fill="currentColor" />
                    {item.rating.toFixed(1)}
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase">
                  {item.mediaType === 'movie' ? t('misc.peli') : t('misc.serie')}
                </div>
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite({
                      id: item.id,
                      tmdbId: item.tmdbId,
                      title: item.title,
                      mediaType: item.mediaType,
                      posterUrl: item.posterUrl,
                      backdropUrl: item.backdropUrl,
                      rating: item.rating,
                      year: item.year,
                      overview: item.overview,
                      genreIds: item.genreIds,
                    });
                  }}
                  className="absolute bottom-2 right-2 p-1.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all"
                  title="Quitar de mi lista"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <p className="text-white text-sm font-medium mt-2 truncate">{item.title || 'Cargando...'}</p>
              <p className="text-gray-500 text-xs">{item.year > 0 ? item.year : ''}</p>
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

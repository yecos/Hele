'use client';

import { useState, useEffect } from 'react';
import { useHistoryStore, usePlayerStore } from '@/lib/store';
import { Clock, Play, Trash2, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function HistoryView() {
  const { history, removeFromHistory } = useHistoryStore();
  const playMovie = usePlayerStore(s => s.playMovie);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Hace un momento';
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  };

  const clearHistory = () => {
    if (confirm('¿Borrar todo el historial de reproducción?')) {
      localStorage.removeItem('xuper-history');
      window.location.reload();
    }
  };

  return (
    <div className="pt-20 px-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock size={28} className="text-red-500" />
          <h1 className="text-2xl font-bold text-white">Historial</h1>
          <span className="text-gray-500 text-sm">({history.length})</span>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-gray-500 hover:text-red-400 text-xs font-medium transition-colors"
          >
            Borrar todo
          </button>
        )}
      </div>

      {history.length > 0 ? (
        <div className="space-y-2">
          {history.map(item => (
            <div
              key={item.id}
              className="group flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
              onClick={() => playMovie({
                id: item.movieId,
                tmdbId: parseInt(item.movieId) || 0,
                title: item.title,
                mediaType: item.mediaType,
                posterUrl: item.posterUrl,
                backdropUrl: '',
                rating: 0,
                year: 0,
                overview: '',
                genreIds: [],
              })}
            >
              {/* Poster thumbnail */}
              <div className="relative w-16 sm:w-20 aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                {item.posterUrl ? (
                  <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play size={16} className="text-gray-600" />
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                    <Play size={14} fill="white" className="ml-0.5" />
                  </div>
                </div>
                {/* Progress bar */}
                {item.progress > 0 && item.duration > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                    <div
                      className="h-full bg-red-600 rounded-r"
                      style={{ width: `${Math.min((item.progress / item.duration) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white text-sm font-semibold truncate">{item.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-500 text-xs capitalize">
                    {item.mediaType === 'movie' ? 'Película' : 'Serie'}
                  </span>
                  <span className="text-gray-600 text-xs">·</span>
                  <span className="text-gray-500 text-xs">{formatTime(item.timestamp)}</span>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); removeFromHistory(item.movieId); }}
                className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Clock size={48} className="text-gray-700 mx-auto mb-4" />
          <h3 className="text-gray-400 text-lg font-semibold">Sin historial</h3>
          <p className="text-gray-600 text-sm mt-1">Las películas y series que veas aparecerán aquí</p>
        </div>
      )}

      <div className="h-20" />
    </div>
  );
}

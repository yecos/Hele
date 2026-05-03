'use client';

import { useHistoryStore, usePlayerStore } from '@/lib/store';
import { useT, DATE_LOCALES } from '@/lib/i18n';
import type { WatchHistoryItem } from '@/lib/store';
import { Clock, Play, Trash2, Star, Film, Tv, Filter } from 'lucide-react';
import { useState } from 'react';

type FilterMode = 'all' | 'movie' | 'tv';

export function HistoryView() {
  const { history, removeFromHistory } = useHistoryStore();
  const { t, locale } = useT();
  const playMovie = usePlayerStore(s => s.playMovie);
  const [filter, setFilter] = useState<FilterMode>('all');

  const filteredHistory = filter === 'all'
    ? history
    : history.filter(h => h.mediaType === filter);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return t('history.momentAgo');
    if (diffHours < 24) return t('history.hoursAgo', { n: diffHours });
    if (diffDays === 1) return t('history.yesterday');
    if (diffDays < 7) return t('history.daysAgo', { n: diffDays });
    return date.toLocaleDateString(DATE_LOCALES[locale], { day: 'numeric', month: 'short' });
  };

  const formatProgress = (item: WatchHistoryItem) => {
    if (item.progress <= 0 || item.duration <= 0) return null;
    const percent = Math.min((item.progress / item.duration) * 100, 100);
    return percent;
  };

  const clearHistory = () => {
    if (confirm(t('history.clearConfirm'))) {
      localStorage.removeItem('xuper-history');
      window.location.reload();
    }
  };

  return (
    <div className="pt-20 px-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock size={28} className="text-red-500" />
          <h1 className="text-2xl font-bold text-white">{t('history.title')}</h1>
          <span className="text-gray-500 text-sm">({history.length})</span>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-gray-500 hover:text-red-400 text-xs font-medium transition-colors"
          >
            {t('history.clearAll')}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      {history.length > 0 && (
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
          {[
            { id: 'all' as const, label: t('search.all'), count: history.length },
            { id: 'movie' as const, label: t('search.movies'), count: history.filter(h => h.mediaType === 'movie').length },
            { id: 'tv' as const, label: t('search.series'), count: history.filter(h => h.mediaType === 'tv').length },
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
              {f.label} <span className="opacity-50">({f.count})</span>
            </button>
          ))}
        </div>
      )}

      {filteredHistory.length > 0 ? (
        <div className="space-y-2">
          {filteredHistory.map(item => {
            const progressPercent = formatProgress(item);
            return (
              <div
                key={item.id}
                className="group flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => playMovie({
                  id: item.movieId,
                  tmdbId: parseInt(item.movieId) || 0,
                  title: item.title,
                  mediaType: item.mediaType,
                  posterUrl: item.posterUrl,
                  backdropUrl: item.backdropUrl || '',
                  rating: item.rating || 0,
                  year: item.year || 0,
                  overview: item.overview || '',
                  genreIds: [],
                })}
              >
                {/* Poster thumbnail */}
                <div className="relative w-16 sm:w-20 aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                  {item.posterUrl ? (
                    <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {item.mediaType === 'tv' ? <Tv size={16} className="text-gray-600" /> : <Film size={16} className="text-gray-600" />}
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                      <Play size={14} fill="white" className="ml-0.5" />
                    </div>
                  </div>
                  {/* Progress bar */}
                  {progressPercent !== null && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                      <div
                        className="h-full bg-red-600 rounded-r"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white text-sm font-semibold truncate">{item.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-gray-500 text-xs">
                      {item.mediaType === 'movie' ? t('history.movie') : t('history.serie')}
                    </span>
                    {item.season && item.episode && (
                      <span className="text-blue-400 text-xs">
                        T{String(item.season).padStart(2, '0')}E{String(item.episode).padStart(2, '0')}
                      </span>
                    )}
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-gray-500 text-xs">{formatTime(item.timestamp)}</span>
                    {item.rating > 0 && (
                      <>
                        <span className="text-gray-600 text-xs">·</span>
                        <span className="flex items-center gap-1 text-yellow-400 text-xs">
                          <Star size={10} fill="currentColor" />
                          {item.rating.toFixed(1)}
                        </span>
                      </>
                    )}
                    {progressPercent !== null && (
                      <>
                        <span className="text-gray-600 text-xs">·</span>
                        <span className="text-red-400 text-xs font-medium">
                          {Math.round(progressPercent)}% visto
                        </span>
                      </>
                    )}
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
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <img src="/logo.svg" alt="XuperStream" className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <Clock size={48} className="text-gray-700 mx-auto mb-4" />
          <h3 className="text-gray-400 text-lg font-semibold">{t('history.empty')}</h3>
          <p className="text-gray-600 text-sm mt-1">{t('history.emptyDesc')}</p>
        </div>
      )}

      <div className="h-20" />
    </div>
  );
}

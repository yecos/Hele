'use client';

import { useState } from 'react';
import { Heart, Clock3, Library } from 'lucide-react';
import { FavoritesView } from '@/components/views/FavoritesView';
import { HistoryView } from '@/components/views/HistoryView';
import { useFavoritesStore, useHistoryStore } from '@/lib/store';
import { useT } from '@/lib/i18n';

type LibraryTab = 'favorites' | 'history';

export function LibraryView() {
  const [tab, setTab] = useState<LibraryTab>('favorites');
  const favoritesCount = useFavoritesStore((state) => state.favorites.length);
  const historyCount = useHistoryStore((state) => state.history.length);
  const { t } = useT();

  return (
    <div className="pt-20 px-4 max-w-[1400px] mx-auto">
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Library size={22} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {t('library.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('library.subtitle')}
            </p>
          </div>
        </div>

        <div className="mt-6 inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
          <button
            onClick={() => setTab('favorites')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              tab === 'favorites'
                ? 'bg-white text-black shadow-lg'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Heart size={15} />
            {t('favorites.title')}
            <span className="text-xs opacity-60">{favoritesCount}</span>
          </button>

          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              tab === 'history'
                ? 'bg-white text-black shadow-lg'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Clock3 size={15} />
            {t('history.title')}
            <span className="text-xs opacity-60">{historyCount}</span>
          </button>
        </div>
      </section>

      {tab === 'favorites' ? (
        <FavoritesView embedded />
      ) : (
        <HistoryView embedded />
      )}
    </div>
  );
}

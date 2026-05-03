'use client';

import { useState, useEffect, useCallback } from 'react';
import { useT } from '@/lib/i18n';
import { useViewStore, usePlayerStore } from '@/lib/store';
import type { MovieItem } from '@/lib/tmdb';
import { mapTmdbToMovieItem, cachedCategoryLoader } from '@/lib/tmdb-utils';
import { CategoryRow } from '@/components/streaming/MovieCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Search as SearchIcon, SlidersHorizontal, X, Star } from 'lucide-react';

export function SearchView() {
  const { t } = useT();
  const { searchQuery, setSearchQuery } = useViewStore();
  const playMovie = usePlayerStore(s => s.playMovie);
  const [results, setResults] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(searchQuery);
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const doSearch = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tmdb?endpoint=/search/multi&query=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const items = (data.results || [])
            .filter((i: any) => i.media_type === 'movie' || i.media_type === 'tv')
            .map(mapTmdbToMovieItem);
          setResults(items);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Search error:', err);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    doSearch();
    return () => controller.abort();
  }, [debouncedQuery]);

  const filteredResults = filter === 'all' ? results : results.filter(m => m.mediaType === filter);

  const discoverCategories = [
    { title: '🎬 ' + t('search.actionMovies'), endpoint: '/discover/movie&with_genres=28' },
    { title: '😂 ' + t('search.comedies'), endpoint: '/discover/movie&with_genres=35' },
    { title: '📺 ' + t('search.dramaSeries'), endpoint: '/discover/tv&with_genres=18' },
    { title: '😱 ' + t('search.horror'), endpoint: '/discover/movie&with_genres=27' },
  ];

  return (
    <div className="pt-20 px-4 max-w-[1400px] mx-auto">
      {/* Search bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('search.placeholder')}
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setSearchQuery(e.target.value); }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white text-base outline-none focus:border-red-500/50 transition-colors placeholder:text-gray-500"
            autoFocus
          />
          {inputValue && (
            <button
              onClick={() => { setInputValue(''); setSearchQuery(''); setResults([]); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        {results.length > 0 && (
          <div className="flex items-center gap-2 mt-3 justify-center">
            {[
              { id: 'all' as const, label: t('search.all') },
              { id: 'movie' as const, label: t('search.movies') },
              { id: 'tv' as const, label: t('search.series') },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filter === f.id
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex flex-wrap gap-4 justify-center">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="w-[160px] h-[240px] rounded-xl" />
          ))}
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="flex flex-wrap gap-4 justify-center">
          {filteredResults.map(movie => (
            <SearchResultCard key={`${movie.mediaType}-${movie.id}`} movie={movie} />
          ))}
        </div>
      ) : debouncedQuery ? (
        <div className="text-center py-20">
          <SearchIcon size={48} className="text-gray-700 mx-auto mb-4" />
          <h3 className="text-gray-400 text-lg font-semibold">{t('search.noResults', { query: debouncedQuery })}</h3>
          <p className="text-gray-600 text-sm mt-1">{t('search.tryAnother')}</p>
        </div>
      ) : (
        <div className="text-center py-16">
          <SearchIcon size={48} className="text-gray-700 mx-auto mb-4" />
          <h3 className="text-gray-400 text-lg font-semibold">{t('search.searchFavorite')}</h3>
        </div>
      )}

      {/* Discover when no search */}
      {!debouncedQuery && (
        <div className="mt-12 space-y-8">
          <h2 className="text-xl font-bold text-white">{t('search.exploreGenres')}</h2>
          {discoverCategories.map(cat => (
            <DiscoverRow key={cat.title} title={cat.title} endpoint={cat.endpoint} />
          ))}
        </div>
      )}

      <div className="h-20" />
    </div>
  );
}

function SearchResultCard({ movie }: { movie: MovieItem }) {
  const { t } = useT();
  const playMovie = usePlayerStore(s => s.playMovie);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => playMovie(movie)}
      className="w-[130px] sm:w-[150px] md:w-[170px] cursor-pointer group"
    >
      <div className="relative rounded-xl overflow-hidden aspect-[2/3] bg-gray-900">
        {!imgError ? (
          <img src={movie.posterUrl} alt={movie.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
            <span className="text-gray-600 text-xs text-center px-2">{movie.title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
              <SearchIcon size={20} className="text-white ml-0.5" />
            </div>
          </div>
        </div>
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase">
          {movie.mediaType === 'movie' ? t('search.movieBadge') : t('search.serieBadge')}
        </div>
        {movie.rating > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-yellow-400 px-2 py-0.5 rounded-md text-xs font-bold">
            <Star size={10} fill="currentColor" />
            {movie.rating.toFixed(1)}
          </div>
        )}
      </div>
      <p className="text-white text-sm font-medium mt-2 truncate">{movie.title}</p>
      <p className="text-gray-500 text-xs">{movie.year > 0 ? movie.year : ''}</p>
    </div>
  );
}

function DiscoverRow({ title, endpoint }: { title: string; endpoint: string }) {
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cachedCategoryLoader(endpoint, 15)
      .then(items => { setMovies(items); setLoading(false); })
      .catch(() => setLoading(false));
  }, [endpoint]);

  if (loading) {
    return (
      <div>
        <h3 className="text-white font-bold mb-3">{title}</h3>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="w-[160px] h-[240px] rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return <CategoryRow title={title} movies={movies} />;
}

// mapItem removed — using shared mapTmdbToMovieItem from tmdb-utils

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, TrendingUp, ArrowLeft, Tv, Film } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MovieCard from './MovieCard';
import { useAppStore, Movie } from '@/lib/store';

export default function SearchView() {
  const { currentView, searchQuery, setSearchQuery, goBack } = useAppStore();
  const [results, setResults] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentView === 'search') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentView]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Fetch search results (TMDB first, seed data fallback)
  useEffect(() => {
    if (currentView !== 'search') return;

    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        // Fetch trending when search is empty
        try {
          const tmdbRes = await fetch('/api/tmdb/trending?type=all&time=week');
          if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            const trendingResults = (tmdbData.results || []).slice(0, 15);
            if (trendingResults.length > 0) {
              setTrending(trendingResults);
              return;
            }
          }
          const res = await fetch('/api/movies?trending=true');
          if (res.ok) {
            const data = await res.json();
            setTrending(Array.isArray(data) ? data : data.movies || []);
          }
        } catch {
          // silently fail
        }
        return;
      }

      setIsLoading(true);
      try {
        // Try TMDB search first
        const tmdbRes = await fetch(
          `/api/tmdb/search?q=${encodeURIComponent(debouncedQuery)}`
        );
        if (tmdbRes.ok) {
          const tmdbData = await tmdbRes.json();
          const tmdbResults = tmdbData.results || [];
          if (tmdbResults.length > 0) {
            setResults(tmdbResults);
            return;
          }
        }
        // Fallback to local search
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          const localResults = Array.isArray(data)
            ? data
            : data.movies ||
              (data.results || []);
          setResults(localResults);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery, currentView]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    goBack();
  }, [goBack, setSearchQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose]
  );

  if (currentView !== 'search') return null;

  const displayResults = debouncedQuery.trim() ? results : trending;

  // Filter out "person" results from TMDB multi-search
  const filteredResults = displayResults.filter(
    (m) => m.mediaType !== 'person' || !m.mediaType
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-black pt-20 sm:pt-24"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full h-9 w-9 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Buscar</h1>
        </div>

        {/* Search Input */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar películas, series, deportes..."
            className="h-12 sm:h-14 pl-10 sm:pl-12 pr-10 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 text-base sm:text-lg rounded-lg focus:border-red-600 focus:ring-red-600/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2"
            >
              <X className="h-5 w-5 text-gray-500 hover:text-white transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 pb-16">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Results / Trending */}
        {!isLoading && (
          <>
            {!debouncedQuery.trim() && trending.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  <h2 className="text-base sm:text-lg font-semibold text-white">
                    Tendencias
                  </h2>
                </div>
              </div>
            )}

            {debouncedQuery.trim() && filteredResults.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-400">
                  {filteredResults.length} resultado
                  {filteredResults.length !== 1 ? 's' : ''} para &quot;
                  {debouncedQuery}&quot;
                </p>
              </div>
            )}

            {/* Grid */}
            {filteredResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                {filteredResults.map((movie) => (
                  <div key={movie.id} className="relative">
                    <MovieCard movie={movie} />
                    {/* Media Type Badge */}
                    {movie.mediaType && (
                      <Badge
                        className={`absolute top-2 left-2 z-10 text-[10px] px-1.5 py-0 border-0 ${
                          movie.mediaType === 'tv'
                            ? 'bg-purple-600/90 text-white'
                            : 'bg-blue-600/90 text-white'
                        }`}
                      >
                        {movie.mediaType === 'tv' ? (
                          <span className="flex items-center gap-1">
                            <Tv className="h-3 w-3" /> Serie
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Film className="h-3 w-3" /> Película
                          </span>
                        )}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <Search className="h-12 w-12 text-gray-600 mb-4" />
                  <p className="text-lg text-gray-400 font-medium mb-1">
                    {debouncedQuery.trim()
                      ? 'No se encontraron resultados'
                      : 'Empieza a buscar contenido'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {debouncedQuery.trim()
                      ? `No hay resultados para "${debouncedQuery}"`
                      : 'Escribe el nombre de una película, serie o género'}
                  </p>
                </motion.div>
              )
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

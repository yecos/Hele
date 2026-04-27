'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MovieCard from './MovieCard';
import { useAppStore, Movie } from '@/lib/store';

interface CategoryViewProps {
  category: string;
  title: string;
  description?: string;
}

interface TMDBGenre {
  id: number;
  name: string;
}

const STATIC_GENRES = [
  { id: 0, name: 'Todos' },
  { id: 28, name: 'Acción' },
  { id: 35, name: 'Comedia' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Terror' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Ciencia Ficción' },
  { id: 99, name: 'Documental' },
  { id: 16, name: 'Animación' },
  { id: 53, name: 'Thriller' },
  { id: 12, name: 'Aventura' },
  { id: 80, name: 'Crimen' },
  { id: 14, name: 'Fantasía' },
];

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Populares' },
  { value: 'vote_average.desc', label: 'Mejor valoradas' },
  { value: 'release_date.desc', label: 'Más recientes' },
  { value: 'release_date.asc', label: 'Más antiguas' },
];

export default function CategoryView({ category, title, description }: CategoryViewProps) {
  const { currentView, goBack, selectedCategory } = useAppStore();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<TMDBGenre | null>(null);
  const [genres, setGenres] = useState<TMDBGenre[]>(STATIC_GENRES);
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tmdbAvailable, setTmdbAvailable] = useState(false);
  const [spanishOnly, setSpanishOnly] = useState(false);

  const mediaType = category === 'series' ? 'tv' : category === 'peliculas' ? 'movie' : null;

  // Load TMDB genres on mount
  useEffect(() => {
    if (!mediaType || currentView !== 'category') return;

    const loadGenres = async () => {
      try {
        const res = await fetch('/api/tmdb/genres');
        if (res.ok) {
          const data = await res.json();
          const genreList =
            mediaType === 'tv'
              ? data.tv_genres || []
              : data.movie_genres || [];
          if (genreList.length > 0) {
            setGenres([{ id: 0, name: 'Todos' }, ...genreList]);
            setTmdbAvailable(true);
          }
        }
      } catch {
        // Use static genres
      }
    };

    loadGenres();
  }, [mediaType, currentView]);

  // Fetch movies
  useEffect(() => {
    if (currentView !== 'category') return;
    window.scrollTo({ top: 0 });

    const fetchMovies = async () => {
      setIsLoading(true);
      try {
        if (mediaType && tmdbAvailable) {
          // Use TMDB discover API
          const params = new URLSearchParams({
            type: mediaType,
            sort_by: sortBy,
            page: String(page),
          });
          if (selectedGenre && selectedGenre.id !== 0) {
            params.set('genre', String(selectedGenre.id));
          }
          if (spanishOnly) {
            params.set('original_language', 'es');
          }

          const res = await fetch(`/api/tmdb/discover?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            const newMovies = data.results || [];
            setMovies(page === 1 ? newMovies : (prev) => [...prev, ...newMovies]);
            setTotalPages(data.total_pages || 1);
            return;
          }
        }

        // Fallback to seed data for non-TMDB categories (deportes, tv)
        const params = new URLSearchParams({ category });
        const res = await fetch(`/api/movies?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setMovies(Array.isArray(data) ? data : data.movies || []);
        }
      } catch {
        setMovies([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, [category, currentView, selectedGenre, sortBy, page, mediaType, tmdbAvailable, spanishOnly]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setMovies([]);
  }, [selectedGenre, sortBy, spanishOnly]);

  if (currentView !== 'category') return null;

  const loadMore = () => {
    if (page < totalPages && page < 10) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-black pt-20 sm:pt-24 pb-16"
    >
      {/* Header */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            onClick={goBack}
            className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full h-9 w-9 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl">{description}</p>
        )}
      </div>

      {/* Filters Row */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-6 sm:mb-8 space-y-4">
        {/* Genre Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {genres.map((genre) => (
            <Button
              key={genre.id}
              variant={
                selectedGenre?.id === genre.id
                  ? 'default'
                  : 'outline'
              }
              onClick={() =>
                setSelectedGenre(
                  genre.id === 0 ? null : genre
                )
              }
              className={`flex-shrink-0 rounded-full text-xs sm:text-sm font-medium transition-all ${
                selectedGenre?.id === genre.id
                  ? 'bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg shadow-red-600/20'
                  : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 bg-transparent'
              }`}
            >
              {genre.name}
            </Button>
          ))}
        </div>

        {/* Sort Options (only for TMDB categories) */}
        {tmdbAvailable && (
          <div className="flex items-center gap-3 flex-wrap">
            <SlidersHorizontal className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SORT_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortBy(option.value)}
                  className={`flex-shrink-0 text-xs rounded-full ${
                    sortBy === option.value
                      ? 'text-red-400 bg-red-500/10'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {(mediaType === 'movie' || mediaType === 'tv') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSpanishOnly(!spanishOnly)}
                className={`flex-shrink-0 text-xs rounded-full border ${
                  spanishOnly
                    ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'
                    : 'border-gray-700 text-gray-500 hover:text-white hover:border-gray-500'
                }`}
              >
                {spanishOnly ? 'Espanol activado' : 'Solo en Espanol'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16">
        {/* Loading */}
        {isLoading && movies.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
          </div>
        )}

        {/* Movies Grid */}
        {!isLoading && movies.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">
                {movies.length} título{movies.length !== 1 ? 's' : ''}
                {selectedGenre && selectedGenre.id !== 0 && (
                  <Badge
                    variant="outline"
                    className="ml-2 border-gray-600 text-gray-300 text-xs"
                  >
                    {selectedGenre.name}
                  </Badge>
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>

            {/* Load More */}
            {tmdbAvailable && page < totalPages && page < 10 && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoading}
                  className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 rounded-full px-8"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Cargar más
                </Button>
              </div>
            )}
          </>
        )}

        {/* Loading more indicator */}
        {isLoading && movies.length > 0 && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 text-red-600 animate-spin" />
          </div>
        )}

        {/* No Results */}
        {!isLoading && movies.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <p className="text-lg text-gray-400 font-medium mb-1">
              No hay contenido disponible
            </p>
            <p className="text-sm text-gray-600">
              {selectedGenre
                ? `No se encontraron ${selectedGenre.name.toLowerCase()}s en esta categoría`
                : 'Prueba con otra categoría o género'}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

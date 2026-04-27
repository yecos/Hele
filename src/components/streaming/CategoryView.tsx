'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MovieCard from './MovieCard';
import { useAppStore, Movie } from '@/lib/store';

interface CategoryViewProps {
  category: string;
  title: string;
  description?: string;
}

const GENRES = [
  'Todos',
  'Acción',
  'Comedia',
  'Drama',
  'Terror',
  'Romance',
  'Ciencia Ficción',
  'Documental',
  'Animación',
  'Thriller',
  'Aventura',
  'Crimen',
  'Fantasía',
];

export default function CategoryView({ category, title, description }: CategoryViewProps) {
  const { currentView, goBack, setSelectedMovie, setCurrentView, selectedCategory } = useAppStore();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('Todos');

  useEffect(() => {
    if (currentView !== 'category') return;
    window.scrollTo({ top: 0 });

    const fetchMovies = async () => {
      setIsLoading(true);
      try {
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
  }, [category, currentView]);

  if (currentView !== 'category') return null;

  const filteredMovies =
    selectedGenre === 'Todos'
      ? movies
      : movies.filter((m) =>
          m.genre.toLowerCase().includes(selectedGenre.toLowerCase())
        );

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

      {/* Genre Filter */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-6 sm:mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {GENRES.map((genre) => (
            <Button
              key={genre}
              variant={selectedGenre === genre ? 'default' : 'outline'}
              onClick={() => setSelectedGenre(genre)}
              className={`flex-shrink-0 rounded-full text-xs sm:text-sm font-medium transition-all ${
                selectedGenre === genre
                  ? 'bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg shadow-red-600/20'
                  : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 bg-transparent'
              }`}
            >
              {genre}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
          </div>
        )}

        {/* Movies Grid */}
        {!isLoading && filteredMovies.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-400">
                {filteredMovies.length} título{filteredMovies.length !== 1 ? 's' : ''}
                {selectedGenre !== 'Todos' && (
                  <Badge
                    variant="outline"
                    className="ml-2 border-gray-600 text-gray-300 text-xs"
                  >
                    {selectedGenre}
                  </Badge>
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
              {filteredMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </>
        )}

        {/* No Results */}
        {!isLoading && filteredMovies.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <p className="text-lg text-gray-400 font-medium mb-1">
              No hay contenido disponible
            </p>
            <p className="text-sm text-gray-600">
              {selectedGenre !== 'Todos'
                ? `No se encontraron ${selectedGenre.toLowerCase()}s en esta categoría`
                : 'Prueba con otra categoría o género'}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

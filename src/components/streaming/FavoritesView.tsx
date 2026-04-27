'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MovieCard from './MovieCard';
import { useAppStore, Movie } from '@/lib/store';

export default function FavoritesView() {
  const { currentView, goBack, setCurrentView, setFavorites, userId } = useAppStore();
  const [favorites, setLocalFavorites] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentView !== 'favorites') return;
    window.scrollTo({ top: 0 });

    const fetchFavorites = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/favorites?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          const favs: Movie[] = Array.isArray(data) ? data : data.favorites || [];
          setLocalFavorites(favs);
          setFavorites(favs);
        }
      } catch {
        setLocalFavorites([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, [currentView, userId, setFavorites]);

  if (currentView !== 'favorites') return null;

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

        <div className="flex items-center gap-3 mb-2">
          <Heart className="h-6 w-6 sm:h-7 sm:w-7 text-red-500 fill-red-500" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Mi Lista
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-400">
          {favorites.length > 0
            ? `${favorites.length} título${favorites.length !== 1 ? 's' : ''} en tu lista`
            : 'Guarda tus películas y series favoritas aquí'}
        </p>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
          </div>
        )}

        {/* Favorites Grid */}
        {!isLoading && favorites.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {favorites.map((movie) => (
              <MovieCard key={movie.id} movie={movie} showProgress />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && favorites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mb-6">
              <Heart className="h-10 w-10 text-gray-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Tu lista está vacía
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mb-8 max-w-md">
              Agrega películas y series a tu lista para verlas más tarde.
              Solo haz clic en el corazón en cualquier título.
            </p>
            <Button
              onClick={() => setCurrentView('home')}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-5 text-sm font-semibold rounded-lg transition-all hover:scale-105 shadow-lg shadow-red-600/20"
            >
              Explorar Contenido
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

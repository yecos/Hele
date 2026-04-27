'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Play, Heart, Star, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import MovieCard from './MovieCard';

export default function MovieDetailModal() {
  const {
    selectedMovie,
    relatedMovies,
    currentView,
    goBack,
    setCurrentView,
    setSelectedMovie,
    toggleFavorite,
    isFavorite,
  } = useAppStore();

  useEffect(() => {
    if (currentView === 'movieDetail') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [currentView]);

  if (currentView !== 'movieDetail' || !selectedMovie) return null;

  const movie = selectedMovie;
  const favorite = isFavorite(movie.id);

  const handlePlay = () => {
    setCurrentView('player');
  };

  const handleClose = () => {
    goBack();
  };

  const handleBack = () => {
    goBack();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] bg-black overflow-y-auto"
    >
      {/* Backdrop */}
      <div className="relative w-full h-[40vh] sm:h-[50vh] md:h-[45vh]">
        <img
          src={movie.backdropUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />

        {/* Top Buttons */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 sm:p-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm rounded-full h-9 w-9 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm rounded-full h-9 w-9 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Live Badge on Backdrop */}
        {movie.isLive && (
          <div className="absolute bottom-4 left-4 sm:left-6">
            <Badge className="bg-red-600 text-white border-0 px-3 py-1 text-sm font-bold shadow-lg animate-pulse">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-white" />
              EN VIVO
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative -mt-20 sm:-mt-24 z-10 px-4 sm:px-6 md:px-12 lg:px-16 pb-16">
        {/* Title & Meta */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight">
          {movie.title}
        </h1>

        {/* Meta Row */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <span className="flex items-center gap-1.5 text-yellow-500 font-semibold">
            <Star className="h-4 w-4 fill-yellow-500" />
            {movie.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1.5 text-gray-300 text-sm">
            <Calendar className="h-4 w-4" />
            {movie.year}
          </span>
          <span className="flex items-center gap-1.5 text-gray-300 text-sm">
            <Clock className="h-4 w-4" />
            {movie.duration}
          </span>
        </div>

        {/* Genre Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {movie.genre.split(',').map((g) => (
            <Badge
              key={g.trim()}
              variant="outline"
              className="border-gray-600 text-gray-300 text-xs sm:text-sm bg-white/5"
            >
              {g.trim()}
            </Badge>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <Button
            onClick={handlePlay}
            className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-10 py-5 sm:py-6 text-sm sm:text-base font-semibold rounded-lg transition-all hover:scale-105 shadow-lg shadow-red-600/30"
          >
            <Play className="h-5 w-5 mr-2 fill-white" />
            Reproducir
          </Button>
          <Button
            variant="outline"
            onClick={() => toggleFavorite(movie.id)}
            className={`bg-white/10 hover:bg-white/20 border-gray-600 px-4 sm:px-6 py-5 sm:py-6 text-sm sm:text-base font-semibold rounded-lg backdrop-blur-sm transition-all ${
              favorite ? 'text-red-500 border-red-500/50' : 'text-white'
            }`}
          >
            <Heart
              className={`h-5 w-5 mr-2 ${favorite ? 'fill-red-500' : ''}`}
            />
            {favorite ? 'En Mi Lista' : 'Mi Lista'}
          </Button>
        </div>

        {/* Description */}
        <div className="mb-8 sm:mb-12">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">
            Sinopsis
          </h3>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-3xl">
            {movie.description}
          </p>
        </div>

        {/* Related Movies */}
        {relatedMovies && relatedMovies.length > 0 && (
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-4">
              Contenido Relacionado
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
              {relatedMovies.slice(0, 12).map((relMovie) => (
                <MovieCard key={relMovie.id} movie={relMovie} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

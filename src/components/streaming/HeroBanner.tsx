'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore, Movie } from '@/lib/store';

interface HeroBannerProps {
  featuredMovies: Movie[];
}

export default function HeroBanner({ featuredMovies }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { setCurrentView, setSelectedMovie } = useAppStore();

  const currentMovie = featuredMovies[currentIndex];

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrentIndex(index);
      setTimeout(() => setIsTransitioning(false), 600);
    },
    [isTransitioning]
  );

  const goNext = useCallback(() => {
    goToSlide((currentIndex + 1) % featuredMovies.length);
  }, [currentIndex, featuredMovies.length, goToSlide]);

  // Auto-rotate every 8 seconds
  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const timer = setInterval(goNext, 8000);
    return () => clearInterval(timer);
  }, [goNext, featuredMovies.length]);

  if (!currentMovie) return null;

  const handlePlay = () => {
    setSelectedMovie(currentMovie);
    setCurrentView('player');
  };

  const handleMoreInfo = () => {
    setSelectedMovie(currentMovie);
    setCurrentView('movieDetail');
  };

  return (
    <div className="relative w-full h-[50vh] sm:h-[65vh] md:h-[70vh] lg:h-[80vh] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMovie.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          {/* Backdrop Image */}
          <div className="absolute inset-0">
            <img
              src={currentMovie.backdropUrl}
              alt={currentMovie.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMovie.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="absolute bottom-12 sm:bottom-16 md:bottom-20 left-4 sm:left-8 md:left-12 lg:left-16 right-4 sm:right-8 md:right-[50%] max-w-2xl"
        >
          {/* Live Badge */}
          {currentMovie.isLive && (
            <Badge className="mb-3 bg-red-600 text-white border-0 px-2.5 py-0.5 text-xs font-bold animate-pulse">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-white" />
              EN VIVO
            </Badge>
          )}

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 leading-tight drop-shadow-lg">
            {currentMovie.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <span className="flex items-center gap-1 text-yellow-500 text-sm font-semibold">
              <Star className="h-4 w-4 fill-yellow-500" />
              {currentMovie.rating.toFixed(1)}
            </span>
            <span className="text-gray-400 text-sm">•</span>
            <span className="text-gray-300 text-sm">{currentMovie.year}</span>
            <span className="text-gray-400 text-sm">•</span>
            <span className="text-gray-300 text-sm">{currentMovie.duration}</span>
          </div>

          {/* Genre Tags */}
          <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
            {currentMovie.genre.split(',').map((g) => (
              <Badge
                key={g.trim()}
                variant="outline"
                className="border-gray-500 text-gray-300 text-xs bg-white/5 backdrop-blur-sm"
              >
                {g.trim()}
              </Badge>
            ))}
          </div>

          {/* Description */}
          <p className="text-gray-300 text-sm sm:text-base mb-5 sm:mb-6 line-clamp-2 sm:line-clamp-3 leading-relaxed">
            {currentMovie.description}
          </p>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handlePlay}
              className="bg-red-600 hover:bg-red-700 text-white px-5 sm:px-8 py-5 sm:py-6 text-sm sm:text-base font-semibold rounded-lg transition-all hover:scale-105 shadow-lg shadow-red-600/30"
            >
              <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2 fill-white" />
              Reproducir
            </Button>
            <Button
              variant="outline"
              onClick={handleMoreInfo}
              className="bg-white/10 hover:bg-white/20 text-white border-gray-500 px-5 sm:px-8 py-5 sm:py-6 text-sm sm:text-base font-semibold rounded-lg backdrop-blur-sm transition-all"
            >
              <Info className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Más Info
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dot Indicators */}
      {featuredMovies.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {featuredMovies.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? 'w-8 h-2 bg-red-600'
                  : 'w-2 h-2 bg-gray-500 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

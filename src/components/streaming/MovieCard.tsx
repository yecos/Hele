'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Heart, Star, Cast, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAppStore, Movie } from '@/lib/store';
import { useCastStore } from '@/lib/cast-store';

interface MovieCardProps {
  movie: Movie;
  showProgress?: boolean;
}

export default function MovieCard({ movie, showProgress = false }: MovieCardProps) {
  const { setCurrentView, setSelectedMovie, toggleFavorite, isFavorite, playMovie, setPlayerState } = useAppStore();
  const { available: castAvailable, connected: castConnected, loading: castLoading, castMedia } = useCastStore();
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [favAnimating, setFavAnimating] = useState(false);
  const favorite = isFavorite(movie.id);

  const handleClick = () => {
    setSelectedMovie(movie);
    setCurrentView('movieDetail');
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFavAnimating(true);
    toggleFavorite(movie.id);
    setTimeout(() => setFavAnimating(false), 400);
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMovie(movie);
    const tmdbId = parseInt(movie.id);
    const hasTmdbId = !isNaN(tmdbId);
    if (hasTmdbId && movie.mediaType) {
      // TMDB content: generate embed sources
      playMovie(tmdbId, movie.mediaType, movie.title);
    } else if (movie.videoUrl) {
      // Seed data with direct video URL
      setPlayerState({
        sources: [{
          server: 'Directo',
          sources: [{
            id: 'direct',
            name: 'Reproduccion Directa',
            type: 'direct',
            url: movie.videoUrl,
            quality: 'Auto',
            server: 'direct',
          }],
        }],
        currentSource: {
          id: 'direct',
          name: 'Reproduccion Directa',
          type: 'direct',
          url: movie.videoUrl,
          quality: 'Auto',
          server: 'direct',
        },
        isTVShow: false,
      });
      setCurrentView('player');
    } else {
      // Fallback: try as movie with numeric ID
      if (hasTmdbId) {
        playMovie(tmdbId, 'movie', movie.title);
      }
    }
  };

  const handleCast = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (movie.videoUrl) {
      // Direct URL — cast immediately without opening player
      await castMedia(movie.videoUrl, movie.title, movie.backdropUrl);
    } else {
      // TMDB content — open player first (sources need resolution)
      handlePlay(e);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="relative group cursor-pointer flex-shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 shadow-lg shadow-black/40">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <Play className="h-10 w-10 text-gray-600" />
          </div>
        ) : (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}

        {/* Bottom Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Hover Overlay with Play + Cast */}
        <motion.div
          initial={false}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3"
        >
          <motion.div
            initial={false}
            animate={{ scale: isHovered ? 1 : 0.7, opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40"
            onClick={handlePlay}
          >
            <Play className="h-5 w-5 text-white fill-white ml-0.5" />
          </motion.div>
          {/* Cast button (only visible when devices available) */}
          {(castAvailable || castConnected) && (
            <motion.button
              initial={false}
              animate={{ scale: isHovered ? 1 : 0.7, opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                castConnected
                  ? 'bg-blue-600 shadow-blue-600/40'
                  : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'
              }`}
              onClick={handleCast}
              disabled={castLoading}
              title="Enviar a Chromecast"
            >
              {castLoading ? (
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              ) : (
                <Cast className="h-4 w-4 text-white" />
              )}
            </motion.button>
          )}
        </motion.div>

        {/* Live Badge */}
        {movie.isLive && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-red-600 text-white border-0 px-2 py-0.5 text-[10px] font-bold shadow-lg">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              EN VIVO
            </Badge>
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleFavorite}
          className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-black/70"
        >
          <motion.div
            animate={
              favAnimating
                ? { scale: [1, 1.4, 1], rotate: [0, 15, -15, 0] }
                : {}
            }
            transition={{ duration: 0.4 }}
          >
            <Heart
              className={`h-3.5 w-3.5 transition-colors ${
                favorite
                  ? 'text-red-500 fill-red-500'
                  : 'text-white/70 hover:text-white'
              }`}
            />
          </motion.div>
        </button>

        {/* Rating Badge */}
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            <span className="text-[10px] font-semibold text-white">
              {movie.rating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Title & Genre */}
        <div className="absolute bottom-0 inset-x-0 p-2.5 z-10">
          <h3 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 leading-tight mb-1 drop-shadow-md">
            {movie.title}
          </h3>
          <p className="text-[10px] text-gray-400 line-clamp-1">
            {movie.genre.split(',')[0]?.trim()}
          </p>
          {showProgress && (
            <div className="mt-1.5 h-0.5 bg-gray-600 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-red-600 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

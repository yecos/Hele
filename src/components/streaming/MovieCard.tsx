'use client';

import { useState, useRef } from 'react';
import type { MovieItem } from '@/lib/tmdb';
import { usePlayerStore, useFavoritesStore } from '@/lib/store';
import { Play, Heart, Star, ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface MovieCardProps {
  movie: MovieItem;
  showProgress?: boolean;
  progress?: number;
}

export function MovieCard({ movie, showProgress, progress }: MovieCardProps) {
  const playMovie = usePlayerStore(s => s.playMovie);
  const { openDetail } = usePlayerStore();
  const { toggleFavorite, isFavorite } = useFavoritesStore();
  const favorite = isFavorite(movie.id);
  const [hovered, setHovered] = useState(false);
  const [touchActive, setTouchActive] = useState(false);
  const [imgError, setImgError] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const showOverlay = hovered || touchActive;

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setTouchActive(true);
    }, 300);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <div
      className="group relative flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Poster */}
      <div className="relative rounded-xl overflow-hidden aspect-[2/3] bg-gray-900">
        {!imgError ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
            <span className="text-gray-600 text-xs text-center px-2">{movie.title}</span>
          </div>
        )}

        {/* Hover / Long-press overlay */}
        <div className={`absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 transition-opacity duration-200 ${showOverlay ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setTouchActive(false); playMovie(movie); }}
            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all hover:scale-105 shadow-lg"
            aria-label="Reproducir"
          >
            <Play size={22} fill="white" className="ml-0.5" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setTouchActive(false); toggleFavorite(movie.id); }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            aria-label={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart size={18} className={favorite ? 'text-red-500 fill-red-500' : 'text-white'} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setTouchActive(false); playMovie(movie); setTimeout(() => openDetail(), 50); }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            aria-label="Más información"
          >
            <Info size={18} className="text-white" />
          </button>
        </div>

        {/* Rating badge */}
        {movie.rating > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-yellow-400 px-2 py-0.5 rounded-md text-xs font-bold">
            <Star size={10} fill="currentColor" />
            {movie.rating.toFixed(1)}
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase">
          {movie.mediaType === 'movie' ? 'Peli' : 'Serie'}
        </div>

        {/* Progress bar */}
        {showProgress && progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-red-600 rounded-r"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Title */}
      <div className="mt-2 px-1">
        <h3 className="text-white text-sm font-medium truncate">{movie.title}</h3>
        <p className="text-gray-500 text-xs">{movie.year > 0 ? movie.year : ''}</p>
      </div>
    </div>
  );
}

// Horizontal scrollable row
interface CategoryRowProps {
  title: string;
  movies: MovieItem[];
  progressMap?: Record<string, number>;
}

export function CategoryRow({ title, movies, progressMap }: CategoryRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (movies.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/row">
      <h2 className="text-lg sm:text-xl font-bold text-white mb-3 px-4 max-w-[1400px] mx-auto">{title}</h2>

      <div className="relative">
        {/* Scroll buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-background to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Desplazar izquierda"
        >
          <ChevronLeft size={28} className="text-white" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-background to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Desplazar derecha"
        >
          <ChevronRight size={28} className="text-white" />
        </button>

        {/* Cards */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map(movie => (
            <MovieCard
              key={`${movie.mediaType}-${movie.id}`}
              movie={movie}
              showProgress={!!progressMap}
              progress={progressMap?.[movie.id]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

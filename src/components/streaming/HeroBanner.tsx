'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MovieItem } from '@/lib/tmdb';
import { usePlayerStore } from '@/lib/store';
import { Play, Star, Info, ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroBannerProps {
  movies: MovieItem[];
}

export function HeroBanner({ movies }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const playMovie = usePlayerStore(s => s.playMovie);

  const next = useCallback(() => setCurrent(c => (c + 1) % movies.length), [movies.length]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + movies.length) % movies.length), [movies.length]);

  useEffect(() => {
    if (movies.length === 0) return;
    const interval = setInterval(next, 8000);
    return () => clearInterval(interval);
  }, [next, movies.length]);

  if (movies.length === 0) return null;

  const movie = movies[current];

  return (
    <div className="relative w-full h-[60vh] min-h-[400px] max-h-[700px] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${movie.backdropUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/30" />

      {/* Content */}
      <div className="relative h-full max-w-[1400px] mx-auto px-4 flex items-center">
        <div className="max-w-lg space-y-4">
          <div className="flex items-center gap-2">
            {movie.rating > 0 && (
              <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-sm font-bold">
                <Star size={14} fill="currentColor" />
                {movie.rating.toFixed(1)}
              </div>
            )}
            <span className="text-gray-400 text-sm capitalize">
              {movie.mediaType === 'movie' ? 'Película' : 'Serie'}
            </span>
            {movie.year > 0 && <span className="text-gray-400 text-sm">{movie.year}</span>}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg">
            {movie.title}
          </h1>

          {movie.overview && (
            <p className="text-gray-300 text-sm sm:text-base line-clamp-3 leading-relaxed">
              {movie.overview}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => playMovie(movie)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/20"
            >
              <Play size={20} fill="white" />
              Ver Ahora
            </button>
            <button
              onClick={() => playMovie(movie)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold transition-all backdrop-blur-sm"
            >
              <Info size={18} />
              Más Info
            </button>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {movies.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all opacity-0 hover:opacity-100 focus:opacity-100 lg:opacity-100"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all opacity-0 hover:opacity-100 focus:opacity-100 lg:opacity-100"
          >
            <ChevronRight size={24} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {movies.slice(0, 8).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1 rounded-full transition-all ${i === current ? 'w-8 bg-red-500' : 'w-2 bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

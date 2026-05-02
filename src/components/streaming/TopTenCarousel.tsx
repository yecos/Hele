'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MovieItem } from '@/lib/tmdb';
import { usePlayerStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TopTenCarouselProps {
  title?: string;
  type?: 'all' | 'movie' | 'tv';
}

function mapItem(item: any): MovieItem {
  const isTV = !!item.name || item.media_type === 'tv';
  const date = isTV ? item.first_air_date : item.release_date;
  return {
    id: String(item.id),
    tmdbId: item.id,
    title: isTV ? (item.name || '') : (item.title || ''),
    mediaType: isTV ? 'tv' : 'movie',
    posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
    backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
    rating: item.vote_average || 0,
    year: date ? parseInt(date.substring(0, 4)) : 0,
    overview: item.overview || '',
    genreIds: item.genre_ids || [],
  };
}

function TopTenSkeleton() {
  return (
    <div className="relative group/row">
      <Skeleton className="h-7 w-56 mb-3 mx-4" />
      <div className="relative">
        <div className="flex gap-3 overflow-hidden px-4 pb-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 flex items-end gap-1" style={{ width: i === 0 ? 180 : 160 }}>
              <Skeleton className="w-10 h-16 flex-shrink-0" />
              <Skeleton className="w-[120px] h-[180px] rounded-xl flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TopTenCarousel({ title = 'Top 10 Hoy', type = 'all' }: TopTenCarouselProps) {
  const [items, setItems] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const playMovie = usePlayerStore(s => s.playMovie);
  const { openDetail } = usePlayerStore();

  useEffect(() => {
    const endpoint = type === 'movie'
      ? '/trending/movie/day'
      : type === 'tv'
        ? '/trending/tv/day'
        : '/trending/all/day';

    fetch(`/api/tmdb?endpoint=${endpoint}`)
      .then(r => r.json())
      .then(data => {
        const results = (data.results || [])
          .filter((i: any) => i.media_type === 'movie' || i.media_type === 'tv' || type !== 'all')
          .slice(0, 10)
          .map(mapItem);
        setItems(results);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [type]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (loading) return <TopTenSkeleton />;
  if (items.length === 0) return null;

  // Number sizing: 1st is huge, gradually smaller
  const getNumberSize = (index: number) => {
    if (index === 0) return 'text-8xl sm:text-9xl';
    if (index <= 2) return 'text-7xl sm:text-8xl';
    if (index <= 4) return 'text-6xl sm:text-7xl';
    if (index <= 6) return 'text-5xl sm:text-6xl';
    return 'text-4xl sm:text-5xl';
  };

  const getNumberOpacity = (index: number) => {
    if (index === 0) return 0.25;
    if (index <= 2) return 0.22;
    if (index <= 4) return 0.18;
    if (index <= 6) return 0.15;
    return 0.12;
  };

  const getPosterHeight = (index: number) => {
    if (index === 0) return 'h-[200px] sm:h-[240px]';
    if (index <= 2) return 'h-[180px] sm:h-[220px]';
    if (index <= 4) return 'h-[170px] sm:h-[200px]';
    return 'h-[160px] sm:h-[190px]';
  };

  const getPosterWidth = (index: number) => {
    if (index === 0) return 'w-[130px] sm:w-[155px]';
    if (index <= 2) return 'w-[120px] sm:w-[145px]';
    if (index <= 4) return 'w-[110px] sm:w-[135px]';
    return 'w-[100px] sm:w-[125px]';
  };

  return (
    <div className="relative group/row">
      <h2 className="text-lg sm:text-xl font-bold text-white mb-3 px-4 max-w-[1400px] mx-auto flex items-center gap-2">
        <span className="text-red-500">🔥</span> {title}
      </h2>

      <div className="relative">
        {/* Scroll buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-[#0a0a0a] to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Scroll left"
        >
          <ChevronLeft size={28} className="text-white" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-[#0a0a0a] to-transparent flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
          aria-label="Scroll right"
        >
          <ChevronRight size={28} className="text-white" />
        </button>

        {/* Cards */}
        <div
          ref={scrollRef}
          className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide px-4 pb-2 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((movie, index) => (
            <motion.div
              key={`${movie.mediaType}-${movie.id}`}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * 0.07,
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="flex-shrink-0 flex items-end cursor-pointer group/card"
              style={{ width: index === 0 ? 185 : 170 }}
              onClick={() => {
                playMovie(movie);
                setTimeout(() => openDetail(), 50);
              }}
            >
              {/* Number */}
              <motion.span
                className={`font-black leading-none select-none ${getNumberSize(index)}`}
                style={{ color: '#dc2626', opacity: getNumberOpacity(index) }}
                animate={{
                  opacity: getNumberOpacity(index),
                  y: 0,
                }}
                whileHover={{ opacity: 0.5 }}
                transition={{ duration: 0.3 }}
              >
                {index + 1}
              </motion.span>

              {/* Poster */}
              <motion.div
                className={`relative rounded-xl overflow-hidden flex-shrink-0 ${getPosterHeight(index)} ${getPosterWidth(index)}`}
                whileHover={{ y: -20, boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.3)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-poster.svg';
                  }}
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-end p-2">
                  <div>
                    <p className="text-white text-xs font-bold truncate">{movie.title}</p>
                    <p className="text-gray-400 text-[10px]">{movie.year > 0 ? movie.year : ''}</p>
                  </div>
                </div>

                {/* Media type badge */}
                <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase">
                  {movie.mediaType === 'movie' ? '🎬' : '📺'}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

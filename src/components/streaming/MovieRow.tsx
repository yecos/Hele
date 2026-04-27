'use client';

import { useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MovieCard from './MovieCard';
import { useAppStore, Movie } from '@/lib/store';

interface MovieRowProps {
  title: string;
  movies: Movie[];
  category?: string;
}

export default function MovieRow({ title, movies, category }: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const { setCurrentView, setSelectedCategory } = useAppStore();

  const checkScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    setShowLeftArrow(container.scrollLeft > 20);
    setShowRightArrow(
      container.scrollLeft + container.clientWidth < container.scrollWidth - 20
    );
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;
    const amount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const handleViewAll = () => {
    if (category) {
      setSelectedCategory(category);
      setCurrentView('category');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div className="relative group/row mb-8 sm:mb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 md:px-12 lg:px-16 mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">
          {title}
        </h2>
        {category && (
          <button
            onClick={handleViewAll}
            className="text-xs sm:text-sm text-red-500 hover:text-red-400 font-medium transition-colors flex items-center gap-1"
          >
            Ver Todo
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left Arrow */}
        {showLeftArrow && (
          <div className="absolute left-0 top-0 bottom-0 z-20 hidden md:flex items-center">
            <div className="bg-gradient-to-r from-black/90 to-transparent pl-2 pr-8 py-4 flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scroll('left')}
                className="text-white hover:bg-white/20 h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm shadow-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Movies Scroll */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-2 sm:gap-3 overflow-x-auto px-4 sm:px-8 md:px-12 lg:px-16 pb-2 scrollbar-hide scroll-smooth"
        >
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] md:w-[calc(25%-9px)] lg:w-[calc(20%-9.6px)] xl:w-[calc(16.666%-10px)] flex-shrink-0"
            >
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <div className="absolute right-0 top-0 bottom-0 z-20 hidden md:flex items-center">
            <div className="bg-gradient-to-l from-black/90 to-transparent pr-2 pl-8 py-4 flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => scroll('right')}
                className="text-white hover:bg-white/20 h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm shadow-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const COUNTRIES = [
  { id: 'co', name: 'Colombia', flag: '🇨🇴' },
  { id: 'mx', name: 'México', flag: '🇲🇽' },
  { id: 'ar', name: 'Argentina', flag: '🇦🇷' },
  { id: 'es', name: 'España', flag: '🇪🇸' },
  { id: 'cl', name: 'Chile', flag: '🇨🇱' },
  { id: 'pe', name: 'Perú', flag: '🇵🇪' },
  { id: 've', name: 'Venezuela', flag: '🇻🇪' },
  { id: 'ec', name: 'Ecuador', flag: '🇪🇨' },
  { id: 'gt', name: 'Guatemala', flag: '🇬🇹' },
  { id: 'do', name: 'Rep. Dominicana', flag: '🇩🇴' },
  { id: 'cu', name: 'Cuba', flag: '🇨🇺' },
  { id: 'bo', name: 'Bolivia', flag: '🇧🇴' },
  { id: 'hn', name: 'Honduras', flag: '🇭🇳' },
  { id: 'sv', name: 'El Salvador', flag: '🇸🇻' },
  { id: 'ni', name: 'Nicaragua', flag: '🇳🇮' },
  { id: 'cr', name: 'Costa Rica', flag: '🇨🇷' },
  { id: 'pa', name: 'Panamá', flag: '🇵🇦' },
  { id: 'uy', name: 'Uruguay', flag: '🇺🇾' },
  { id: 'py', name: 'Paraguay', flag: '🇵🇾' },
];

interface CountryCarouselProps {
  selectedCountry: string;
  onSelect: (countryId: string) => void;
}

export function CountryCarousel({ selectedCountry, onSelect }: CountryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/carousel">
      {/* Section title */}
      <div className="flex items-center gap-2 px-4 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Países</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* Gradient fade edges */}
      <div className="relative">
        {/* Left gradient fade */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-gray-950 to-transparent z-10 pointer-events-none" />
        {/* Right gradient fade */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-gray-950 to-transparent z-10 pointer-events-none" />

        {/* Scroll buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-white/10 opacity-0 group-hover/carousel:opacity-100 hover:bg-white/20 text-white transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-white/10 opacity-0 group-hover/carousel:opacity-100 hover:bg-white/20 text-white transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight size={14} />
        </button>

        {/* Cards container */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto px-2 pb-1 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {COUNTRIES.map((country, index) => {
            const isSelected = selectedCountry === country.id;

            return (
              <motion.button
                key={country.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.03,
                  duration: 0.3,
                  ease: 'easeOut',
                }}
                whileHover={{ scale: 1.05, filter: 'brightness(1.2)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(country.id)}
                className={`
                  relative flex-shrink-0 flex flex-col items-center gap-1 px-2 py-2 rounded-xl
                  transition-colors duration-200 min-w-[72px]
                  ${isSelected
                    ? 'bg-white/10'
                    : 'bg-white/[0.03] hover:bg-white/[0.06]'
                  }
                `}
              >
                {/* Selected border glow */}
                <motion.div
                  className={`absolute inset-0 rounded-xl pointer-events-none ${
                    isSelected ? 'border-2 border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.4)]' : ''
                  }`}
                  layoutId="country-glow"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />

                {/* Selected bottom border accent */}
                <motion.div
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] rounded-full ${
                    isSelected ? 'bg-red-600 w-8' : 'w-0'
                  }`}
                  layoutId="country-bottom"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />

                {/* Flag */}
                <motion.span
                  className="text-2xl leading-none"
                  animate={isSelected ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {country.flag}
                </motion.span>

                {/* Name */}
                <span className={`text-[10px] font-medium leading-tight text-center truncate w-full ${
                  isSelected ? 'text-white' : 'text-gray-400'
                }`}>
                  {country.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

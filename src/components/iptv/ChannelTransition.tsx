'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Signal } from 'lucide-react';

interface ChannelTransitionProps {
  channel: {
    name: string;
    logo: string;
    group: string;
    country: string;
    quality: string;
    url: string;
  } | null;
  isVisible: boolean;
}

// Map group names to colors
const GROUP_COLORS: Record<string, string> = {
  deportes: 'bg-green-500/20 text-green-400 border-green-500/30',
  sports: 'bg-green-500/20 text-green-400 border-green-500/30',
  noticias: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  news: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  música: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  music: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  infantil: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  kids: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  películas: 'bg-red-500/20 text-red-400 border-red-500/30',
  movies: 'bg-red-500/20 text-red-400 border-red-500/30',
  documentales: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  documentary: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  religiosos: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  religious: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  entretenimiento: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  entertainment: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

function getGroupColor(group: string): string {
  const lower = group.toLowerCase();
  for (const [key, color] of Object.entries(GROUP_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return 'bg-white/10 text-gray-400 border-white/20';
}

// Quality badge color
function getQualityStyle(quality: string): string {
  switch (quality.toUpperCase()) {
    case 'HD': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'FHD': case 'FULL HD': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case '4K': case 'UHD': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    default: return 'bg-white/10 text-gray-500 border-white/20';
  }
}

export function ChannelTransition({ channel, isVisible }: ChannelTransitionProps) {
  return (
    <AnimatePresence>
      {isVisible && channel && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          />

          {/* Card */}
          <motion.div
            className="relative z-10 max-w-sm w-full mx-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 p-6 shadow-2xl shadow-black/50"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
              duration: 0.3,
            }}
          >
            <div className="flex items-start gap-4">
              {/* Channel Logo */}
              <motion.div
                className="flex-shrink-0"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
              >
                {channel.logo ? (
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    className="w-16 h-16 rounded-xl border border-white/10 object-contain bg-white/5 p-1"
                    onError={(e) => {
                      const el = e.target as HTMLImageElement;
                      el.style.display = 'none';
                      if (el.nextElementSibling) (el.nextElementSibling as HTMLElement).style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-16 h-16 rounded-xl border border-white/10 bg-gradient-to-br from-red-600/30 to-red-900/30 flex items-center justify-center ${channel.logo ? 'hidden' : 'flex'}`}
                >
                  <span className="text-2xl font-bold text-white/80">
                    {channel.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </motion.div>

              {/* Channel Info */}
              <div className="flex-1 min-w-0 pt-0.5">
                {/* Live indicator */}
                <motion.div
                  className="flex items-center gap-1.5 mb-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <Signal size={12} className="text-green-400" />
                  <span className="text-green-400 text-[10px] font-semibold uppercase tracking-wider">
                    EN VIVO
                  </span>
                </motion.div>

                {/* Channel Name */}
                <motion.h2
                  className="text-white text-xl font-bold truncate leading-tight"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.25 }}
                >
                  {channel.name}
                </motion.h2>

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {/* Group Badge */}
                  {channel.group && (
                    <motion.span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getGroupColor(channel.group)}`}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      {channel.group}
                    </motion.span>
                  )}

                  {/* Country Badge */}
                  {channel.country && (
                    <motion.span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-gray-300 border border-white/20"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      {channel.country}
                    </motion.span>
                  )}

                  {/* Quality Badge */}
                  {channel.quality && channel.quality !== 'SD' && (
                    <motion.span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getQualityStyle(channel.quality)}`}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45, type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      {channel.quality}
                    </motion.span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom accent line */}
            <motion.div
              className="mt-4 h-0.5 rounded-full bg-gradient-to-r from-green-500/60 via-green-400/40 to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              style={{ transformOrigin: 'left' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

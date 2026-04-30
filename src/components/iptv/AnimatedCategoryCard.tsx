'use client';

import { motion } from 'framer-motion';
import {
  Trophy,
  Newspaper,
  Music,
  Film,
  Baby,
  BookOpen,
  Church,
  Tv,
  Globe,
  Radio,
  MonitorPlay,
  Wifi,
  Clapperboard,
  Laugh,
  Home,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';

interface CategoryConfig {
  icon: LucideIcon;
  color: string;
  animation: 'bounce' | 'ticker' | 'pulse' | 'wiggle' | 'float';
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  // Categorías section
  news: { icon: Newspaper, color: '#3b82f6', animation: 'ticker' },
  sports: { icon: Trophy, color: '#22c55e', animation: 'bounce' },
  entertainment: { icon: Clapperboard, color: '#ec4899', animation: 'float' },
  music: { icon: Music, color: '#a855f7', animation: 'pulse' },
  movies: { icon: Film, color: '#ef4444', animation: 'float' },
  kids: { icon: Baby, color: '#f59e0b', animation: 'wiggle' },
  documentary: { icon: BookOpen, color: '#06b6d4', animation: 'float' },
  education: { icon: GraduationCap, color: '#8b5cf6', animation: 'float' },
  comedy: { icon: Laugh, color: '#f97316', animation: 'pulse' },
  lifestyle: { icon: Home, color: '#14b8a6', animation: 'float' },
  religious: { icon: Church, color: '#8b5cf6', animation: 'float' },
  general: { icon: Tv, color: '#6b7280', animation: 'float' },
  // Mundo section
  spa: { icon: Globe, color: '#22c55e', animation: 'float' },
  latam: { icon: Globe, color: '#3b82f6', animation: 'float' },
  // España TDT
  tdt: { icon: MonitorPlay, color: '#ef4444', animation: 'float' },
  tdt8: { icon: MonitorPlay, color: '#ef4444', animation: 'float' },
  'tdt-radio': { icon: Radio, color: '#f59e0b', animation: 'ticker' },
  'tdt-radio8': { icon: Radio, color: '#f59e0b', animation: 'ticker' },
  'tdt-all': { icon: MonitorPlay, color: '#ef4444', animation: 'float' },
  // Más Fuentes
  'free-tv': { icon: Globe, color: '#22c55e', animation: 'float' },
  'free-tv-es': { icon: Globe, color: '#ef4444', animation: 'float' },
  'free-tv-mx': { icon: Globe, color: '#22c55e', animation: 'float' },
  'free-tv-ar': { icon: Globe, color: '#60a5fa', animation: 'float' },
  'free-tv-cl': { icon: Globe, color: '#ef4444', animation: 'float' },
  'free-tv-co': { icon: Globe, color: '#fbbf24', animation: 'float' },
  'free-tv-pe': { icon: Globe, color: '#ef4444', animation: 'float' },
  'free-tv-ve': { icon: Globe, color: '#ef4444', animation: 'float' },
  'm3ucl-total': { icon: Globe, color: '#22c55e', animation: 'float' },
  'm3ucl-music': { icon: Music, color: '#a855f7', animation: 'pulse' },
  telechancho: { icon: Tv, color: '#6b7280', animation: 'float' },
  // País codes
  co: { icon: Globe, color: '#fbbf24', animation: 'float' },
  mx: { icon: Globe, color: '#22c55e', animation: 'float' },
  ar: { icon: Globe, color: '#60a5fa', animation: 'float' },
  es: { icon: Globe, color: '#ef4444', animation: 'float' },
  cl: { icon: Globe, color: '#ef4444', animation: 'float' },
  ve: { icon: Globe, color: '#ef4444', animation: 'float' },
  pe: { icon: Globe, color: '#ef4444', animation: 'float' },
  bo: { icon: Globe, color: '#22c55e', animation: 'float' },
  ec: { icon: Globe, color: '#fbbf24', animation: 'float' },
  cu: { icon: Globe, color: '#ef4444', animation: 'float' },
  do: { icon: Globe, color: '#60a5fa', animation: 'float' },
  gt: { icon: Globe, color: '#60a5fa', animation: 'float' },
  hn: { icon: Globe, color: '#60a5fa', animation: 'float' },
  sv: { icon: Globe, color: '#60a5fa', animation: 'float' },
  ni: { icon: Globe, color: '#60a5fa', animation: 'float' },
  cr: { icon: Globe, color: '#22c55e', animation: 'float' },
  pa: { icon: Globe, color: '#60a5fa', animation: 'float' },
  py: { icon: Globe, color: '#ef4444', animation: 'float' },
  uy: { icon: Globe, color: '#60a5fa', animation: 'float' },
  pr: { icon: Globe, color: '#60a5fa', animation: 'float' },
};

const DEFAULT_CONFIG: CategoryConfig = {
  icon: Tv,
  color: '#6b7280',
  animation: 'float',
};

// Per-animation keyframes for the icon
const iconAnimations: Record<string, { y?: number[]; x?: number[]; rotate?: number[]; scale?: number[] }> = {
  bounce: { y: [-2, 2, -2] },
  ticker: { x: [-3, 3, -3] },
  pulse: { scale: [1, 1.15, 1] },
  wiggle: { rotate: [-3, 3, -3] },
  float: { y: [-1.5, 1.5, -1.5] },
};

const animationDurations: Record<string, number> = {
  bounce: 1.5,
  ticker: 2,
  pulse: 1.2,
  wiggle: 1.8,
  float: 2.5,
};

interface AnimatedCategoryCardProps {
  id: string;
  name: string;
  flag: string;
  isSelected: boolean;
  onClick: () => void;
}

export function AnimatedCategoryCard({ id, name, flag, isSelected, onClick }: AnimatedCategoryCardProps) {
  const config = CATEGORY_CONFIG[id] || DEFAULT_CONFIG;
  const Icon = config.icon;
  const anim = iconAnimations[config.animation] || iconAnimations.float;
  const duration = animationDurations[config.animation] || 2.5;

  return (
    <motion.button
      onClick={onClick}
      className={`
        relative flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium
        transition-all cursor-pointer border
        ${
          isSelected
            ? 'bg-green-600/20 text-green-400 border-green-500/40 shadow-lg shadow-green-600/10'
            : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/10'
        }
      `}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
      whileHover={{
        scale: 1.05,
        transition: { type: 'spring', stiffness: 400, damping: 20 },
      }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Glow effect on hover (via pseudo-style box-shadow applied via style prop) */}
      <motion.span
        className="flex-shrink-0"
        animate={anim}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ color: isSelected ? undefined : config.color }}
      >
        <Icon size={14} strokeWidth={isSelected ? 2.5 : 2} />
      </motion.span>
      <span className="truncate">
        {flag} {name}
      </span>

      {/* Subtle glow on selected */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: `0 0 12px ${config.color}30, inset 0 0 12px ${config.color}10`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.button>
  );
}

export function getCategoryConfig(id: string): CategoryConfig {
  return CATEGORY_CONFIG[id] || DEFAULT_CONFIG;
}

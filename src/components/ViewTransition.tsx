'use client';

import { type ReactNode } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { ViewType } from '@/lib/store';

interface ViewTransitionProps {
  view: ViewType;
  children: ReactNode;
}

// Per-view animation variants
const viewVariants: Record<ViewType, Variants> = {
  home: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  },
  movies: {
    initial: { x: 60, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -60, opacity: 0 },
  },
  series: {
    initial: { x: 40, y: 10, opacity: 0 },
    animate: { x: 0, y: 0, opacity: 1 },
    exit: { x: -40, y: -10, opacity: 0 },
  },
  iptv: {
    // "zap" effect — fast scale from center like turning on a TV
    initial: { scale: 0.3, opacity: 0, filter: 'brightness(3)' },
    animate: { scale: 1, opacity: 1, filter: 'brightness(1)' },
    exit: { scale: 1.5, opacity: 0, filter: 'brightness(0)' },
  },
  search: {
    initial: { y: -40, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -40, opacity: 0 },
  },
  favorites: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  history: {
    initial: { x: -60, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 60, opacity: 0 },
  },
  settings: {
    initial: { y: 40, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
  },
};

// Per-view transition configs
const viewTransitions: Record<ViewType, object> = {
  home: { type: 'tween', duration: 0.3, ease: 'easeOut' },
  movies: { type: 'tween', duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  series: { type: 'tween', duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  iptv: { type: 'spring', stiffness: 400, damping: 25 },
  search: { type: 'tween', duration: 0.25, ease: 'easeOut' },
  favorites: { type: 'tween', duration: 0.35, ease: 'easeOut' },
  history: { type: 'tween', duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  settings: { type: 'tween', duration: 0.3, ease: 'easeOut' },
};

export function ViewTransition({ view, children }: ViewTransitionProps) {
  const variants = viewVariants[view];
  const transition = viewTransitions[view];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Subtle floating hearts component for favorites view
export function FavoritesHearts() {
  const hearts = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    x: 10 + i * 20,
    delay: i * 0.3,
    size: 12 + i * 2,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          className="absolute text-[#dc2626]/20 select-none"
          style={{ left: `${h.x}%`, bottom: -20, fontSize: h.size }}
          animate={{
            y: [0, -window.innerHeight - 50],
            opacity: [0, 0.6, 0],
            rotate: [0, 15, -10],
          }}
          transition={{
            duration: 4 + h.delay,
            delay: h.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        >
          ♥
        </motion.div>
      ))}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const brandLetters = 'XuperStream'.split('');

export function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem('xs-splash-done') !== '1';
    } catch {
      return true;
    }
  });
  const [hiding, setHiding] = useState(false);
  const [barProgress, setBarProgress] = useState(0);

  const hide = useCallback(() => {
    if (hiding) return;
    setHiding(true);
  }, [hiding]);

  useEffect(() => {
    if (!visible) return;

    // Mark session so splash doesn't show again on refresh
    try {
      sessionStorage.setItem('xs-splash-done', '1');
    } catch {}

    // Animate the loading bar
    let startTime: number | null = null;
    let rafId: number;

    const animateBar = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      // Slow at start, then fast at end
      const progress = Math.min((elapsed / 3200) * 100, 100);
      setBarProgress(progress);
      if (progress < 100) {
        rafId = requestAnimationFrame(animateBar);
      }
    };

    rafId = requestAnimationFrame(animateBar);

    // Hide after app loads
    const onReady = () => {
      setTimeout(hide, 600);
    };

    if (document.readyState === 'complete') {
      onReady();
    } else {
      window.addEventListener('load', onReady);
    }

    // Safety: hide after 4s max
    const safetyTimer = setTimeout(hide, 4000);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('load', onReady);
      clearTimeout(safetyTimer);
    };
  }, [hide]);

  useEffect(() => {
    if (hiding) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [hiding]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {!hiding ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0a]"
          exit="exit"
        >
          {/* Pulse ring */}
          <motion.div
            className="absolute"
            style={{ width: 120, height: 120, borderRadius: 24, border: '2px solid rgba(220,38,38,0.3)' }}
            animate={{ scale: [0.95, 1.15, 0.95], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Logo */}
          <motion.div
            className="relative"
            style={{ width: 80, height: 80, borderRadius: 18, overflow: 'hidden' }}
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            exit={{ scale: 1.2, opacity: 0 }}
          >
            {/* Glow */}
            <motion.div
              className="absolute inset-0"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(220,38,38,0.3), 0 0 60px rgba(220,38,38,0.1)',
                  '0 0 30px rgba(220,38,38,0.5), 0 0 80px rgba(220,38,38,0.2)',
                  '0 0 20px rgba(220,38,38,0.3), 0 0 60px rgba(220,38,38,0.1)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ borderRadius: 18 }}
            />
            <img src="/logo.svg" alt="" className="relative w-full h-full" />
          </motion.div>

          {/* Brand text — staggered letters */}
          <div className="mt-5 flex items-baseline justify-center overflow-hidden">
            {brandLetters.map((letter, i) => {
              const isAccent = i >= 5; // "Stream" part
              return (
                <motion.span
                  key={i}
                  className={`text-2xl font-bold ${isAccent ? 'text-[#dc2626]' : 'text-white'}`}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.4 + i * 0.06,
                    type: 'spring',
                    stiffness: 200,
                    damping: 18,
                  }}
                >
                  {letter}
                </motion.span>
              );
            })}
          </div>

          {/* Loading bar */}
          <div
            className="mt-8 overflow-hidden rounded-full"
            style={{ width: 160, height: 3, background: 'rgba(255,255,255,0.08)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #dc2626, #ef4444)' }}
              initial={{ width: '0%' }}
              animate={{ width: `${barProgress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="splash-exit"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0a]"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Keep content visible during fade */}
          <div style={{ width: 80, height: 80, borderRadius: 18, overflow: 'hidden' }}>
            <img src="/logo.svg" alt="" className="w-full h-full" />
          </div>
          <div className="mt-5 text-2xl font-bold text-white">
            Xuper<span className="text-[#dc2626]">Stream</span>
          </div>
          <div
            className="mt-8 overflow-hidden rounded-full"
            style={{ width: 160, height: 3, background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: '100%', background: 'linear-gradient(90deg, #dc2626, #ef4444)' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

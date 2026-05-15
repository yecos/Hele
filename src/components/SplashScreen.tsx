'use client';

import { useState, useEffect } from 'react';

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
      const progress = Math.min((elapsed / 2500) * 100, 100);
      setBarProgress(progress);
      if (progress < 100) {
        rafId = requestAnimationFrame(animateBar);
      }
    };

    rafId = requestAnimationFrame(animateBar);

    // Hide after app loads
    const hideSplash = () => {
      setHiding(true);
    };

    const onReady = () => {
      setTimeout(hideSplash, 400);
    };

    if (document.readyState === 'complete') {
      onReady();
    } else {
      window.addEventListener('load', onReady);
    }

    // Safety: hide after 3s max — this MUST always fire
    const safetyTimer = setTimeout(hideSplash, 3000);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('load', onReady);
      clearTimeout(safetyTimer);
    };
  }, [visible]);

  // When hiding starts, wait then set visible to false
  useEffect(() => {
    if (hiding) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hiding]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0a] transition-opacity duration-500"
      style={{ opacity: hiding ? 0 : 1 }}
    >
      {/* Pulse ring */}
      <div
        className="absolute animate-pulse"
        style={{
          width: 120,
          height: 120,
          borderRadius: 24,
          border: '2px solid rgba(220,38,38,0.3)',
        }}
      />

      {/* Logo */}
      <div
        className="relative"
        style={{ width: 80, height: 80, borderRadius: 18, overflow: 'hidden' }}
      >
        {/* Glow */}
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            borderRadius: 18,
            boxShadow: '0 0 25px rgba(220,38,38,0.4), 0 0 60px rgba(220,38,38,0.15)',
          }}
        />
        <img src="/logo.svg" alt="" className="relative w-full h-full" />
      </div>

      {/* Brand text */}
      <div className="mt-5 flex items-baseline justify-center">
        {brandLetters.map((letter, i) => {
          const isAccent = i >= 5;
          return (
            <span
              key={i}
              className={`text-2xl font-bold ${isAccent ? 'text-[#dc2626]' : 'text-white'}`}
              style={{
                animation: `fadeSlideIn 0.5s ease forwards`,
                animationDelay: `${0.3 + i * 0.05}s`,
                opacity: 0,
              }}
            >
              {letter}
            </span>
          );
        })}
      </div>

      {/* Loading bar */}
      <div
        className="mt-8 overflow-hidden rounded-full"
        style={{ width: 160, height: 3, background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${barProgress}%`,
            background: 'linear-gradient(90deg, #dc2626, #ef4444)',
          }}
        />
      </div>
    </div>
  );
}

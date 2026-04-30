'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Tv, Heart, Sparkles } from 'lucide-react';

const TOTAL_STEPS = 5;
const STORAGE_KEY = 'xs-onboarding-done';
const PROGRESS_KEY = 'xs-onboarding-step';

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  bgAccent?: string;
}

const steps: Step[] = [
  {
    title: 'Bienvenido a XuperStream',
    description: 'Tu plataforma personal de streaming. Películas, series y TV en vivo en español latino, HD.',
    icon: (
      <div className="relative">
        <motion.div
          animate={{
            boxShadow: [
              '0 0 20px rgba(220,38,38,0.3), 0 0 60px rgba(220,38,38,0.1)',
              '0 0 35px rgba(220,38,38,0.6), 0 0 90px rgba(220,38,38,0.25)',
              '0 0 20px rgba(220,38,38,0.3), 0 0 60px rgba(220,38,38,0.1)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-2xl overflow-hidden bg-[#111] flex items-center justify-center"
        >
          <img src="/logo.svg" alt="XuperStream" className="w-12 h-12" />
        </motion.div>
      </div>
    ),
  },
  {
    title: 'Miles de películas y series',
    description: 'Explora un catálogo enorme de películas y series, actualizado constantemente con lo último en entretenimiento.',
    icon: (
      <div className="relative flex items-center gap-3">
        <div className="w-14 h-20 rounded-xl bg-gradient-to-br from-[#dc2626] to-[#991b1b] flex items-center justify-center shadow-lg shadow-red-900/30">
          <Film className="w-7 h-7 text-white" />
        </div>
        <div className="w-14 h-20 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] flex items-center justify-center -ml-4 z-10 shadow-lg shadow-purple-900/30">
          <Tv className="w-7 h-7 text-white" />
        </div>
      </div>
    ),
    bgAccent: 'from-red-950/20 to-transparent',
  },
  {
    title: 'TV en vivo con IPTV',
    description: 'Disfruta de cientos de canales en vivo de Latinoamérica y el mundo, directamente en tu dispositivo.',
    icon: (
      <div className="relative">
        <div className="w-24 h-16 rounded-2xl bg-gradient-to-br from-[#0ea5e9] to-[#0369a1] flex items-center justify-center shadow-lg shadow-sky-900/30">
          <Tv className="w-10 h-10 text-white" />
        </div>
        <motion.div
          className="absolute -top-1 -right-1 bg-[#dc2626] text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          LIVE
        </motion.div>
      </div>
    ),
    bgAccent: 'from-sky-950/20 to-transparent',
  },
  {
    title: 'Guarda tus favoritos',
    description: 'Añade películas, series y canales a tu lista de favoritos para acceder rápidamente a tu contenido preferido.',
    icon: (
      <div className="relative">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Heart className="w-16 h-16 text-[#dc2626] fill-[#dc2626]" />
        </motion.div>
        <motion.div
          className="absolute -top-2 -right-2"
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-5 h-5 text-yellow-400" />
        </motion.div>
      </div>
    ),
    bgAccent: 'from-pink-950/20 to-transparent',
  },
  {
    title: '¡Disfruta!',
    description: 'Todo está listo. Comienza a explorar tu contenido favorito ahora mismo.',
    icon: (
      <motion.div
        className="w-20 h-20 rounded-full bg-[#dc2626] flex items-center justify-center shadow-lg shadow-red-900/40"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-3xl">🚀</span>
      </motion.div>
    ),
  },
];

// Slide direction
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

export function OnboardingTutorial({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem(PROGRESS_KEY) || '0', 10);
      return saved > 0 && saved < TOTAL_STEPS ? saved : 0;
    } catch {
      return 0;
    }
  });
  const [direction, setDirection] = useState(1);
  const [visible, setVisible] = useState(false);

  // Show after mount to allow Framer Motion entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
      localStorage.removeItem(PROGRESS_KEY);
    } catch {}
    onComplete();
  }, [onComplete]);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      const next = step + 1;
      setStep(next);
      try { localStorage.setItem(PROGRESS_KEY, String(next)); } catch {}
    } else {
      finish();
    }
  }, [step, finish]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const current = steps[step];
  const isLastStep = step === TOTAL_STEPS - 1;

  if (!visible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[9000] flex flex-col bg-[#0a0a0a]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Skip button */}
      <div className="flex justify-end p-4 sm:p-6">
        <button
          onClick={skip}
          className="text-sm text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Saltar
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10">
        {/* Background gradient accent */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute inset-0 bg-gradient-to-b ${current.bgAccent || ''}`} />
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex flex-col items-center text-center max-w-md relative z-10"
          >
            {/* Icon */}
            <div className="mb-8 sm:mb-10">
              {current.icon}
            </div>

            {/* Title */}
            <motion.h2
              className="text-2xl sm:text-3xl font-bold text-white mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {current.title}
            </motion.h2>

            {/* Description */}
            <motion.p
              className="text-base sm:text-lg text-white/60 leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {current.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="pb-8 pt-4 px-6 sm:px-10 flex flex-col items-center gap-5 relative z-10">
        {/* Dots indicator */}
        <div className="flex items-center gap-2">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              animate={{
                width: i === step ? 24 : 8,
                height: 8,
                backgroundColor: i === step ? '#dc2626' : 'rgba(255,255,255,0.15)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          ))}
        </div>

        {/* Action button */}
        <motion.button
          onClick={goNext}
          className="w-full max-w-xs py-3.5 rounded-2xl bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white font-semibold text-base transition-colors shadow-lg shadow-red-900/30"
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.02 }}
        >
          {isLastStep ? 'Comenzar' : 'Siguiente'}
        </motion.button>
      </div>
    </motion.div>
  );
}

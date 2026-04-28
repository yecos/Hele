'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cast,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCastStore } from '@/lib/cast-store';

export default function MiniCastControls() {
  const {
    casting,
    connected,
    loading,
    currentMedia,
    deviceName,
    isPaused,
    volumeLevel,
    isMuted,
    togglePlayPause,
    stopCasting,
    toggleMute,
    setVolume,
  } = useCastStore();

  const [collapsed, setCollapsed] = useState(false);
  const [showVolume, setShowVolume] = useState(false);

  // Only show when actively casting
  if (!casting && !connected) return null;

  return (
    <AnimatePresence>
      {!collapsed ? (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] w-[calc(100%-2rem)] max-w-lg"
        >
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 px-4 py-3">
            {/* Top row: media info + controls */}
            <div className="flex items-center gap-3">
              {/* Cast icon + device name */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Cast className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {currentMedia?.title || 'Conectando...'}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {deviceName || 'Dispositivo'}
                  </p>
                </div>
              </div>

              {/* Center controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Play / Pause */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlayPause}
                  disabled={loading}
                  className="h-8 w-8 p-0 rounded-full text-white hover:bg-white/10"
                  title={isPaused ? 'Reproducir' : 'Pausar'}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPaused ? (
                    <Play className="h-4 w-4 fill-white" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </Button>

                {/* Stop */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={stopCasting}
                  className="h-8 w-8 p-0 rounded-full text-white hover:bg-red-500/20 hover:text-red-400"
                  title="Detener cast"
                >
                  <Square className="h-3.5 w-3.5 fill-white" />
                </Button>

                {/* Volume */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { toggleMute(); setShowVolume(!showVolume); }}
                    className="h-8 w-8 p-0 rounded-full text-white hover:bg-white/10"
                    title={isMuted ? 'Activar sonido' : 'Silenciar'}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>

                  {/* Volume slider popup */}
                  <AnimatePresence>
                    {showVolume && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 5 }}
                        className="absolute bottom-full right-0 mb-2 bg-gray-800 rounded-lg p-3 shadow-xl"
                      >
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volumeLevel}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-24 h-1 accent-blue-500"
                        />
                        <p className="text-[10px] text-gray-400 text-center mt-1">
                          {Math.round((isMuted ? 0 : volumeLevel) * 100)}%
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Collapse */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(true)}
                className="h-8 w-8 p-0 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
                title="Minimizar"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Collapsed pill — tap to expand */
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] cursor-pointer"
          onClick={() => setCollapsed(false)}
        >
          <div className="flex items-center gap-2 bg-blue-600/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
            <Cast className="h-3.5 w-3.5 text-white" />
            <span className="text-xs font-medium text-white max-w-[200px] truncate">
              {currentMedia?.title || 'Casting...'}
            </span>
            <span className="text-[10px] text-blue-200">
              {deviceName}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

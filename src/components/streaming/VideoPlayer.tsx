'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ArrowLeft,
  X,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export default function VideoPlayer() {
  const { selectedMovie, currentView, goBack } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Manage body overflow via effect
  useEffect(() => {
    if (currentView === 'player') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [currentView]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  }, []);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (!video) return;
      const time = parseFloat(e.target.value);
      video.currentTime = time;
      setCurrentTime(time);
    },
    []
  );

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    video.volume = vol;
    setIsMuted(vol === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.volume = volume || 0.5;
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const resetHideControls = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  const handleMouseMove = useCallback(() => {
    resetHideControls();
  }, [resetHideControls]);

  const handleClose = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      // Let the onPause event handler set isPlaying to false
    }
    goBack();
  }, [goBack]);

  const handleSkipBack = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
  }, []);

  const handleSkipForward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
  }, []);

  if (currentView !== 'player') return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
    >
      {/* Video Element */}
      {selectedMovie?.videoUrl && !imgError ? (
        <video
          ref={videoRef}
          src={selectedMovie.videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          onError={() => setImgError(true)}
          playsInline
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 text-center px-8">
          <div className="relative w-64 h-40 rounded-lg overflow-hidden bg-gray-900">
            {selectedMovie && !imgError && (
              <img
                src={selectedMovie.backdropUrl}
                alt={selectedMovie.title}
                className="w-full h-full object-cover opacity-50"
                onError={() => setImgError(true)}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <X className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 text-lg font-medium">Contenido no disponible</p>
                <p className="text-gray-600 text-sm mt-1">
                  El video no está disponible en este momento
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buffering Indicator */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-12 h-12 border-3 border-white/30 border-t-red-600 rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm rounded-full h-9 w-9 p-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-sm sm:text-base font-medium text-white truncate max-w-[60%]">
              {selectedMovie?.title || 'Reproductor'}
            </h2>
            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm rounded-full h-9 w-9 p-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Seek Bar */}
            <div className="mb-3 sm:mb-4 group/seek">
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-red-600
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:group-hover/seek:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                style={{
                  background: `linear-gradient(to right, #dc2626 ${
                    duration ? (currentTime / duration) * 100 : 0
                  }%, #4b5563 ${duration ? (currentTime / duration) * 100 : 0}%)`,
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">{formatTime(currentTime)}</span>
                <span className="text-xs text-gray-400">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Skip Back */}
                <Button
                  variant="ghost"
                  onClick={handleSkipBack}
                  className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                {/* Play/Pause */}
                <Button
                  variant="ghost"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20 h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-full bg-white/10"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5 fill-white" />
                  )}
                </Button>

                {/* Skip Forward */}
                <Button
                  variant="ghost"
                  onClick={handleSkipForward}
                  className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>

                {/* Volume */}
                <div className="flex items-center gap-1 ml-1 sm:ml-2">
                  <Button
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="hidden sm:block w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer accent-red-600
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    style={{
                      background: `linear-gradient(to right, #dc2626 ${
                        (isMuted ? 0 : volume) * 100
                      }%, #4b5563 ${(isMuted ? 0 : volume) * 100}%)`,
                    }}
                  />
                </div>
              </div>

              {/* Fullscreen */}
              <Button
                variant="ghost"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 h-9 w-9 p-0 rounded-full"
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

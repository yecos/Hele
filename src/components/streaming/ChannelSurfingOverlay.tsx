'use client';

// ═══════════════════════════════════════════════════════════════════════
// XuperStream - Channel Surfing Overlay
// Overlay de zapping tipo TV que se muestra sobre el VideoPlayer
// cuando se navega canales IPTV con flechas/arrows
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  Radio,
  Tv,
  Zap,
  MonitorPlay,
  Clock,
  Info,
  X,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useChannelSurfing } from '@/hooks/useChannelSurfing';
import type { M3UChannel } from '@/lib/m3uParser';

// ─── Props ──────────────────────────────────────────────────

interface ChannelSurfingOverlayProps {
  channels: M3UChannel[];
  isActive: boolean;
  onClose: () => void;
  onChannelSelect: (channel: M3UChannel) => void;
}

// ─── Component ───────────────────────────────────────────────

export default function ChannelSurfingOverlay({
  channels,
  isActive,
  onClose,
  onChannelSelect,
}: ChannelSurfingOverlayProps) {
  const surfing = useChannelSurfing({
    channels,
    overlayDuration: 4000,
    wrapAround: true,
    onChannelChange: (channel) => {
      // Auto-play the newly selected channel
      onChannelSelect(channel);
    },
  });

  const { isSurfing, showOverlay, currentChannel, channelInfo, currentIndex, totalChannels } = surfing;

  // Start surfing when activated
  useEffect(() => {
    if (isActive && channels.length > 0 && !isSurfing) {
      surfing.startSurfing();
    }
    if (!isActive && isSurfing) {
      surfing.stopSurfing();
    }
  }, [isActive, channels.length]);

  // Update channels when they change
  useEffect(() => {
    if (channels.length > 0) {
      surfing.setChannels(channels);
    }
  }, [channels]);

  // Keyboard handling (outside the hook's own handler)
  useEffect(() => {
    if (!isSurfing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isSurfing, onClose]);

  // Touch/swipe support
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      if (!start) return;

      const endY = e.changedTouches[0].clientY;
      const deltaY = endY - start.y;
      const deltaTime = Date.now() - start.time;

      // Swipe detection: > 50px in < 300ms
      if (Math.abs(deltaY) > 50 && deltaTime < 300) {
        surfing.navigate(deltaY < 0 ? 'up' : 'down');
      }
    },
    [surfing]
  );

  // Get adjacent channels for preview
  const prevChannel = useMemo(() => {
    const prevIdx = (currentIndex - 1 + channels.length) % channels.length;
    return channels[prevIdx];
  }, [currentIndex, channels]);

  const nextChannel = useMemo(() => {
    const nextIdx = (currentIndex + 1) % channels.length;
    return channels[nextIdx];
  }, [currentIndex, channels]);

  if (!isSurfing || !currentChannel || !channelInfo) return null;

  return (
    <div
      className="absolute inset-0 z-[100]"
      onMouseMove={() => surfing.showOverlayBriefly()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ─── Channel Info Overlay (auto-hides) ────────────────── */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute right-0 top-0 bottom-0 w-[380px] bg-gradient-to-l from-black/95 via-black/80 to-transparent pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col justify-center p-6">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>

              {/* Channel Number */}
              <div className="mb-4">
                <span className="text-6xl font-black text-white/20 tabular-nums">
                  {String(currentIndex + 1).padStart(3, '0')}
                </span>
                <span className="text-lg text-white/30 font-light">/{totalChannels}</span>
              </div>

              {/* Channel Logo */}
              <div className="w-16 h-16 rounded-xl bg-gray-800/80 flex items-center justify-center overflow-hidden mb-4 border border-white/10">
                {currentChannel.logo ? (
                  <img
                    src={currentChannel.logo}
                    alt={currentChannel.name}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Tv className="h-8 w-8 text-gray-600" />
                )}
              </div>

              {/* Channel Name */}
              <h2 className="text-2xl font-bold text-white mb-1 truncate">{currentChannel.name}</h2>

              {/* Group */}
              <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                {channelInfo.countryFlag} {currentChannel.groupTitle}
              </p>

              {/* Quality Badge */}
              {channelInfo.displayQuality && (
                <div className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-full mb-3 w-fit">
                  <MonitorPlay className="h-3 w-3" />
                  {channelInfo.displayQuality}
                </div>
              )}

              {/* Stream Type Badge */}
              <div className="inline-flex items-center gap-1 bg-gray-800 text-gray-400 text-xs font-medium px-2.5 py-1 rounded-full mb-4 w-fit">
                {channelInfo.streamType === 'hls' ? 'HLS' : channelInfo.streamType === 'mpegts' ? 'MPEG-TS' : channelInfo.streamType.toUpperCase()}
              </div>

              {/* Genre */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Info className="h-3 w-3" />
                {channelInfo.genre}
                {channelInfo.languageLabel && ` · ${channelInfo.languageLabel}`}
              </div>

              {/* EPG - Now Playing */}
              {channelInfo.epgNow && (
                <div className="mt-4 bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Radio className="h-3 w-3 text-red-500 animate-pulse" />
                    <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">
                      Ahora
                    </span>
                  </div>
                  <p className="text-sm text-white font-medium">{channelInfo.epgNow.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{channelInfo.epgNow.start} - {channelInfo.epgNow.end}</p>
                </div>
              )}

              {/* EPG - Next */}
              {channelInfo.epgNext && (
                <div className="mt-2 bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Siguiente
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 font-medium">{channelInfo.epgNext.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{channelInfo.epgNext.start} - {channelInfo.epgNext.end}</p>
                </div>
              )}

              {/* Navigation Hints */}
              <div className="mt-6 flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <ChevronUp className="h-3 w-3" />
                  <span>Anterior</span>
                </div>
                <div className="flex items-center gap-1">
                  <ChevronDown className="h-3 w-3" />
                  <span>Siguiente</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded">ESC</span>
                  <span>Salir</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Mini Channel Indicator (always visible while surfing) ── */}
      {!showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-8 right-8 pointer-events-none"
        >
          <div className="bg-black/80 backdrop-blur-md rounded-lg px-4 py-2.5 border border-white/10 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center overflow-hidden">
                {currentChannel.logo ? (
                  <img src={currentChannel.logo} alt="" className="w-full h-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <Tv className="h-4 w-4 text-gray-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{currentChannel.name}</p>
                <p className="text-[10px] text-gray-400">
                  {currentIndex + 1}/{totalChannels}
                </p>
              </div>
              <Zap className="h-3.5 w-3.5 text-yellow-500 ml-2" />
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Quick Up/Down Navigation Buttons ─────────────────── */}
      <div className="absolute left-1/2 top-4 -translate-x-1/2 flex flex-col gap-2 z-[101]">
        <button
          onClick={() => surfing.navigate('prev')}
          className="group w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 backdrop-blur-sm flex items-center justify-center transition-all border border-white/10"
        >
          <ChevronUp className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={() => surfing.navigate('next')}
          className="group w-10 h-10 rounded-full bg-white/5 hover:bg-white/15 backdrop-blur-sm flex items-center justify-center transition-all border border-white/10"
        >
          <ChevronDown className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* ─── Prev/Next Channel Preview Strips (subtle) ──────────── */}
      {showOverlay && prevChannel && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 0.5, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-16 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/5 pointer-events-none"
        >
          <p className="text-[10px] text-gray-500 flex items-center gap-1">
            <ChevronUp className="h-2.5 w-2.5" />
            {prevChannel.name}
          </p>
        </motion.div>
      )}
      {showOverlay && nextChannel && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 0.5, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-16 left-4 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/5 pointer-events-none"
        >
          <p className="text-[10px] text-gray-500 flex items-center gap-1">
            <ChevronDown className="h-2.5 w-2.5" />
            {nextChannel.name}
          </p>
        </motion.div>
      )}
    </div>
  );
}

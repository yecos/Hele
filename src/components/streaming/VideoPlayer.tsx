'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Hls from 'hls.js';
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
  Server,
  Loader2,
  Tv,
  List,
  ChevronDown,
  MonitorPlay,
  ExternalLink,
  Radio,
  RefreshCw,
  Cast,
  Podcast,
  Music,
  Unplug,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { useCastStore } from '@/lib/cast-store';
import AudioManager from './AudioManager';

// ─── Types for resolved sources ───────────────────────────────────────────

interface ResolvedNativeSource {
  url: string;
  type: 'hls' | 'direct';
  quality: string;
  server: string;
  label: string;
}

interface FallbackSource {
  url: string;
  type: 'embed';
  server: string;
  label: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export default function VideoPlayer() {
  const {
    selectedMovie,
    currentView,
    playerState,
    goBack,
    switchSource,
    switchEpisode,
    setPlayerState,
  } = useAppStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [episodes, setEpisodes] = useState<
    { episode_number: number; name: string; overview: string; still_path: string | null; runtime: number }[]
  >([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [useProxy, setUseProxy] = useState(false);

  const [showAudioManager, setShowAudioManager] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedSources, setExtractedSources] = useState<{ url: string; type: 'hls' | 'direct'; quality: string; label: string }[]>([]);

  // ─── NEW: Native-first resolution state ────────────────────────────────
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedNativeSources, setResolvedNativeSources] = useState<ResolvedNativeSource[]>([]);
  const [fallbackSources, setFallbackSources] = useState<FallbackSource[]>([]);
  const [autoResolved, setAutoResolved] = useState(false);
  const [hlsError, setHlsError] = useState(false);

  // Chromecast (global store)
  const {
    available: castAvailable,
    connected: castConnected,
    deviceName: castDeviceName,
    casting: isCasting,
    loading: castLoading,
    castMedia,
    castEmbed,
    stopCasting,
  } = useCastStore();

  const currentSource = playerState.currentSource;
  const isEmbed = currentSource?.type === 'embed';
  const isHLS = currentSource?.type === 'hls' || currentSource?.url?.includes('.m3u8');
  const isLiveTV = currentSource?.type === 'live';
  const isTVShow = playerState.isTVShow;

  // ─── Auto-cast to Chromecast when connected ──────────────────────────
  // When user is connected to Chromecast and a new source is resolved,
  // automatically send the media to the TV instead of playing locally.
  const autoCastDoneRef = useRef(false);

  useEffect(() => {
    if (!castConnected || !currentSource?.url || !selectedMovie) return;
    if (!autoResolved || autoCastDoneRef.current) return;

    // Don't auto-cast if already casting this exact URL
    const castStore = useCastStore.getState();
    if (castStore.currentMedia?.url === currentSource.url) return;

    autoCastDoneRef.current = true;
    console.log('[AutoCast] Sending to Chromecast:', selectedMovie.title);

    if (isEmbed) {
      castEmbed(currentSource.url, selectedMovie.title);
    } else {
      castMedia(currentSource.url, selectedMovie.title, selectedMovie.backdropUrl);
    }
  }, [autoResolved, castConnected, currentSource?.url, selectedMovie, isEmbed, castMedia, castEmbed]);

  // Reset auto-cast flag when content changes
  useEffect(() => {
    autoCastDoneRef.current = false;
  }, [selectedMovie?.id, playerState.selectedSeason, playerState.selectedEpisode]);

  // ─── Auto-pause local video when Chromecast connects ─────────────────────
  useEffect(() => {
    if (castConnected && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [castConnected]);

  // ─── Cleanup HLS on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // ─── Reset auto-resolve flag when content changes ──────────────────────
  useEffect(() => {
    setAutoResolved(false);
    setResolvedNativeSources([]);
    setFallbackSources([]);
    setHlsError(false);
  }, [selectedMovie?.id, playerState.selectedSeason, playerState.selectedEpisode]);

  // ─── Auto-Resolve Effect: Call /api/sources/resolve when player opens ──
  useEffect(() => {
    if (currentView !== 'player') return;
    if (!selectedMovie) return;

    const tmdbId = parseInt(selectedMovie.id);
    if (isNaN(tmdbId)) return;
    if (autoResolved) return; // Already resolved for this content

    const mediaType = playerState.isTVShow ? 'tv' : 'movie';
    const seasonParam = playerState.isTVShow
      ? `&season=${playerState.selectedSeason}&episode=${playerState.selectedEpisode}`
      : '';
    const resolveUrl = `/api/sources/resolve?type=${mediaType}&id=${tmdbId}${seasonParam}`;

    setIsResolving(true);
    fetch(resolveUrl)
      .then((res) => res.json())
      .then((data) => {
        const sources: ResolvedNativeSource[] = data.sources || [];
        const fallbacks: FallbackSource[] = data.fallback || [];
        setResolvedNativeSources(sources);
        setFallbackSources(fallbacks);
        setAutoResolved(true);

        // Auto-play first native source
        if (sources.length > 0) {
          const first = sources[0];
          const nativeSource = {
            id: `native-${first.server}`,
            name: first.label,
            type: first.type as 'hls' | 'direct',
            mode: 'native' as const,
            url: first.url,
            quality: first.quality,
            server: first.server,
            isNative: true,
          };
          switchSource(nativeSource);
        } else if (fallbacks.length > 0) {
          // No native sources, use first fallback embed
          const fb = fallbacks[0];
          const embedSource = {
            id: `fallback-${fb.server}`,
            name: fb.label,
            type: 'embed' as const,
            mode: 'embed' as const,
            url: fb.url,
            quality: 'Auto',
            server: fb.server,
            isNative: false,
          };
          switchSource(embedSource);
        }
        // If neither, the store's existing source will remain active
      })
      .catch((err) => {
        console.error('Resolve error:', err);
        // Fall back to whatever source was set by store
        setAutoResolved(true);
      })
      .finally(() => setIsResolving(false));
  }, [currentView, selectedMovie?.id, playerState.selectedSeason, playerState.selectedEpisode, playerState.isTVShow, autoResolved, switchSource]);

  // ─── Pop-up & Ad Blocker ───────────────────────────────────────────────
  // Block unwanted pop-ups, new tabs, and redirects while player is open
  useEffect(() => {
    if (currentView !== 'player') return;

    // Block window.open pop-ups from the embed
    const originalOpen = window.open.bind(window);
    const allowedHosts = ['xuperstream', 'localhost', '127.0.0.1'];

    window.open = (...args: Parameters<typeof window.open>) => {
      const url = typeof args[0] === 'string' ? args[0] : '';
      // Allow our own domain, block everything else (ad pop-ups)
      const isAllowed = allowedHosts.some(h => url.includes(h)) || url === '' || url === '_blank';
      if (!isAllowed) {
        console.log('[AdBlocker] Blocked pop-up:', url);
        return null;
      }
      return originalOpen(...args);
    };

    // Block beforeunload / page navigation attempts from iframe
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (e.defaultPrevented) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Intercept and block clicks that try to navigate away
    const handleClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check for links that navigate outside
      const link = target.closest('a[href]') as HTMLAnchorElement | null;
      if (link) {
        const href = link.getAttribute('href') || '';
        const isExternal = href.startsWith('http') && !allowedHosts.some(h => href.includes(h));
        if (isExternal) {
          e.preventDefault();
          e.stopPropagation();
          console.log('[AdBlocker] Blocked external link:', href);
        }
      }
    };
    document.addEventListener('click', handleClickCapture, true);

    // Restore original window.open on cleanup
    return () => {
      window.open = originalOpen;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClickCapture, true);
    };
  }, [currentView]);

  // Manage body overflow
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

  // Reset iframe error when source changes - try direct first
  useEffect(() => {
    setIframeError(false);
    setUseProxy(false);
    setHlsError(false);
  }, [currentSource?.url]);

  // ─── Load episodes for TV shows ────────────────────────────────────────
  useEffect(() => {
    if (!isTVShow || !selectedMovie) return;

    const loadEpisodes = async () => {
      setLoadingEpisodes(true);
      try {
        const res = await fetch(
          `/api/tv?id=${selectedMovie.id}&season=${playerState.selectedSeason}`
        );
        if (res.ok) {
          const data = await res.json();
          setEpisodes(data.episodes || []);
          setPlayerState({
            tvDetails: {
              numberOfSeasons: data.tvShow?.number_of_seasons || 1,
              numberOfEpisodes: data.tvShow?.number_of_episodes || 0,
            },
            seasons: (data.tvShow?.number_of_seasons || 1) >= 1
              ? Array.from(
                  { length: (data.tvShow?.number_of_seasons || 1) },
                  (_, i) => ({
                    season_number: i + 1,
                    name: `Temporada ${i + 1}`,
                    episode_count: 0,
                  })
                )
              : [],
          });
        }
      } catch {
        console.error('Error loading episodes');
      } finally {
        setLoadingEpisodes(false);
      }
    };

    loadEpisodes();
  }, [isTVShow, selectedMovie?.id, playerState.selectedSeason, setPlayerState]);

  // ─── "Try Next Source" Logic ───────────────────────────────────────────
  const tryNextSource = useCallback(() => {
    if (!currentSource) return;

    const currentIdx = resolvedNativeSources.findIndex(s => s.url === currentSource.url);
    if (currentIdx >= 0 && currentIdx < resolvedNativeSources.length - 1) {
      // Try next native source
      const next = resolvedNativeSources[currentIdx + 1];
      const nextSource = {
        id: `native-${next.server}`,
        name: next.label,
        type: next.type,
        mode: 'native' as const,
        url: next.url,
        quality: next.quality,
        server: next.server,
        isNative: true,
      };
      switchSource(nextSource);
      setHlsError(false);
    } else if (fallbackSources.length > 0) {
      // Fall back to iframe
      const fb = fallbackSources[0];
      const embedSource = {
        id: `fallback-${fb.server}`,
        name: fb.label,
        type: 'embed' as const,
        mode: 'embed' as const,
        url: fb.url,
        quality: 'Auto',
        server: fb.server,
        isNative: false,
      };
      switchSource(embedSource);
      setHlsError(false);
    }
  }, [resolvedNativeSources, currentSource, fallbackSources, switchSource]);

  // ─── Handle HLS / direct video / live TV playback ──────────────────────
  useEffect(() => {
    if (isEmbed) return;

    const video = videoRef.current;
    if (!video || !currentSource) return;

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const url = currentSource.url;

    if (isHLS || url.includes('.m3u8')) {
      // HLS stream (native resolved or live TV)
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 6,
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error('HLS fatal error:', data);
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              // Try to recover from network errors once
              setTimeout(() => hls.startLoad(), 3000);
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              // Other fatal errors: trigger fallback
              setHlsError(true);
            }
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('error', () => {
          setHlsError(true);
        }, { once: true });
        video.play().catch(() => {});
      }
    } else {
      // Direct video URL
      video.src = url;
      video.play().catch(() => {});
    }
  }, [currentSource, isEmbed, isHLS]);

  // ─── Auto-fallback when HLS error occurs ───────────────────────────────
  useEffect(() => {
    if (hlsError) {
      tryNextSource();
    }
  }, [hlsError, tryNextSource]);

  const togglePlay = useCallback(() => {
    if (isEmbed || isLiveTV) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isEmbed, isLiveTV]);

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
      if (isLiveTV) return; // No seeking on live TV
      const video = videoRef.current;
      if (!video) return;
      const time = parseFloat(e.target.value);
      video.currentTime = time;
      setCurrentTime(time);
    },
    [isLiveTV]
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const video = videoRef.current;
      if (!video) return;
      const vol = parseFloat(e.target.value);
      setVolume(vol);
      video.volume = vol;
      setIsMuted(vol === 0);
    },
    []
  );

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
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const resetHideControls = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying || isEmbed || isLiveTV) setShowControls(false);
    }, 3000);
  }, [isPlaying, isEmbed, isLiveTV]);

  const handleMouseMove = useCallback(() => {
    resetHideControls();
  }, [resetHideControls]);

  const handleClose = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setPlayerState({
      sources: [],
      currentSource: null,
      episodes: [],
      seasons: [],
      tvDetails: null,
      isTVShow: false,
    });
    goBack();
  }, [goBack, setPlayerState]);

  const handleSkipBack = useCallback(() => {
    if (isLiveTV) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
  }, [isLiveTV]);

  const handleSkipForward = useCallback(() => {
    if (isLiveTV) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
  }, [isLiveTV]);

  const handleSourceSwitch = useCallback(
    (sourceIndex: number, sourceItemIndex: number) => {
      const group = playerState.sources[sourceIndex];
      if (group && group.sources[sourceItemIndex]) {
        switchSource(group.sources[sourceItemIndex]);
        setShowSourceMenu(false);
      }
    },
    [playerState.sources, switchSource]
  );

  const handleEpisodeSelect = useCallback(
    (episodeNumber: number) => {
      switchEpisode(playerState.selectedSeason, episodeNumber);
      setShowEpisodeList(false);
    },
    [playerState.selectedSeason, switchEpisode]
  );

  const handleSeasonChange = useCallback(
    (seasonNumber: number) => {
      setPlayerState({ selectedSeason: seasonNumber });
      switchEpisode(seasonNumber, 1);
      setShowEpisodeList(false);
    },
    [setPlayerState, switchEpisode]
  );

  // Open embed URL in new tab as fallback
  const openInNewTab = useCallback(() => {
    if (currentSource?.url) {
      window.open(currentSource.url, '_blank');
    }
  }, [currentSource?.url]);

  // Retry with proxy (fallback)
  const retryWithProxy = useCallback(() => {
    setUseProxy(true);
    setIframeError(false);
  }, []);

  // Retry without proxy
  const retryWithoutProxy = useCallback(() => {
    setUseProxy(false);
    setIframeError(false);
  }, []);

  // Cast handler
  const handleCast = useCallback(async () => {
    if (!currentSource || !selectedMovie) return;
    if (isCasting) {
      stopCasting();
    } else if (isEmbed) {
      await castEmbed(currentSource.url, selectedMovie.title);
    } else {
      await castMedia(currentSource.url, selectedMovie.title, selectedMovie.backdropUrl);
    }
  }, [currentSource, selectedMovie, isEmbed, isCasting, castMedia, castEmbed, stopCasting]);

  // Get iframe src - try direct embed first, proxy as fallback
  const getIframeSrc = useCallback(() => {
    if (!currentSource?.url) return '';
    if (useProxy) {
      return `/api/proxy?url=${encodeURIComponent(currentSource.url)}`;
    }
    return currentSource.url;
  }, [currentSource?.url, useProxy]);

  // Extract direct video source from embed URL
  const handleExtractSource = useCallback(async () => {
    if (!currentSource?.url || !isEmbed) return;
    setExtracting(true);
    setExtractedSources([]);
    try {
      const res = await fetch(`/api/sources/extract?url=${encodeURIComponent(currentSource.url)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.sources && data.sources.length > 0) {
          setExtractedSources(data.sources);
        }
      }
    } catch (err) {
      console.error('Extract error:', err);
    } finally {
      setExtracting(false);
    }
  }, [currentSource?.url, isEmbed]);

  // Play an extracted source directly in our <video> element
  const handlePlayExtracted = useCallback((source: { url: string; type: 'hls' | 'direct'; quality: string; label: string }) => {
    if (!currentSource) return;
    // Switch to a direct source type to bypass the iframe
    const directSource = {
      ...currentSource,
      type: source.type,
      url: source.url,
      name: `Directo - ${source.label}`,
      id: `extracted-${source.label}`,
    };
    switchSource(directSource);
    setExtractedSources([]);
  }, [currentSource, switchSource]);

  // ─── Switch to a specific resolved native source ───────────────────────
  const handleResolvedNativeSwitch = useCallback((source: ResolvedNativeSource) => {
    const nativeSource = {
      id: `native-${source.server}`,
      name: source.label,
      type: source.type,
      mode: 'native' as const,
      url: source.url,
      quality: source.quality,
      server: source.server,
      isNative: true,
    };
    switchSource(nativeSource);
    setShowSourceMenu(false);
    setHlsError(false);
  }, [switchSource]);

  // ─── Switch to a specific fallback embed source ────────────────────────
  const handleFallbackSwitch = useCallback((source: FallbackSource) => {
    const embedSource = {
      id: `fallback-${source.server}`,
      name: source.label,
      type: 'embed' as const,
      mode: 'embed' as const,
      url: source.url,
      quality: 'Auto',
      server: source.server,
      isNative: false,
    };
    switchSource(embedSource);
    setShowSourceMenu(false);
    setHlsError(false);
  }, [switchSource]);

  if (currentView !== 'player') return null;

  // ─── Determine if source menu should show ──────────────────────────────
  const hasSourceMenuItems = (
    playerState.sources.length > 0 ||
    resolvedNativeSources.length > 0 ||
    fallbackSources.length > 0
  );

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
      onMouseMove={handleMouseMove}
    >
      {/* ─── Resolving Loading Overlay ────────────────────────────────── */}
      {isResolving && (
        <div className="absolute inset-0 z-[15] bg-black flex flex-col items-center justify-center">
          {selectedMovie?.backdropUrl && (
            <div className="absolute inset-0">
              <img
                src={selectedMovie.backdropUrl}
                alt=""
                className="w-full h-full object-cover opacity-20 blur-sm"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/80" />
            </div>
          )}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-white/20 border-t-red-600 rounded-full animate-spin mb-4" />
            <p className="text-white text-sm font-medium">Obteniendo fuente directa...</p>
            <p className="text-gray-500 text-xs mt-1">Buscando la mejor calidad</p>
          </div>
        </div>
      )}

      {/* ─── Native Video Player (HLS / Direct) ──────────────────────── */}
      {!isEmbed && currentSource && !isResolving && !hlsError ? (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          playsInline
        />
      ) : isEmbed && currentSource && !iframeError ? (
        /* ─── Embed Player (iframe with proxy) — FALLBACK ONLY ────────── */
        <>
          <iframe
            ref={iframeRef}
            src={getIframeSrc()}
            className="w-full h-full border-0 absolute inset-0"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="no-referrer"
            onError={() => setIframeError(true)}
            title={`Reproduciendo ${selectedMovie?.title || 'video'}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
          />
          {/* Ad-blocking overlay: catches clicks on the iframe area.
              When controls are hidden, it blocks ALL clicks to prevent ad pop-ups.
              When controls are visible, passes through to the iframe for player interaction. */}
          <div
            className="absolute inset-0 z-[25]"
            style={{ pointerEvents: showControls ? 'none' : 'auto' }}
            onMouseMove={handleMouseMove}
            onClick={handleMouseMove}
            onContextMenu={(e) => e.preventDefault()}
          />
          {/* Anti-ad click shield: thin border zones that absorb stray ad clicks */}
          {!showControls && (
            <>
              <div className="absolute top-0 left-0 right-0 h-12 z-[26]" />
              <div className="absolute bottom-0 left-0 right-0 h-12 z-[26]" />
              <div className="absolute top-0 left-0 bottom-0 w-12 z-[26]" />
              <div className="absolute top-0 right-0 bottom-0 w-12 z-[26]" />
            </>
          )}
        </>
      ) : !isResolving ? (
        /* ─── No Source Available / Embed Error / HLS Error ──────────── */
        <div className="flex flex-col items-center justify-center gap-4 text-center px-8">
          <div className="relative w-72 h-44 rounded-lg overflow-hidden bg-gray-900">
            {selectedMovie && (
              <img
                src={selectedMovie.backdropUrl}
                alt={selectedMovie.title}
                className="w-full h-full object-cover opacity-50"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                {hlsError ? (
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                ) : (
                  <MonitorPlay className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                )}
                <p className="text-gray-400 text-lg font-medium">
                  {iframeError ? 'Servidor no disponible' : hlsError ? 'Error de reproduccion nativa' : 'Sin fuente de video'}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {iframeError
                    ? 'Intenta con otro servidor o abre en nueva pestaña'
                    : hlsError
                      ? 'No se pudo cargar la fuente nativa'
                      : 'Selecciona un servidor para reproducir'}
                </p>
                <div className="flex gap-2 mt-4 justify-center flex-wrap">
                  {hlsError && fallbackSources.length > 0 && (
                    <Button
                      onClick={() => handleFallbackSwitch(fallbackSources[0])}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-1.5"
                    >
                      <Unplug className="h-3.5 w-3.5 mr-1" />
                      Usar Iframe
                    </Button>
                  )}
                  {iframeError && (
                    <>
                      <Button
                        onClick={retryWithProxy}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Reintentar con proxy
                      </Button>
                      <Button
                        onClick={retryWithoutProxy}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Reintentar directo
                      </Button>
                      <Button
                        onClick={openInNewTab}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Abrir externo
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ─── Chromecast Connected Badge ───────────────────────────────── */}
      {castConnected && castDeviceName && (
        <div className="absolute top-16 right-4 z-20">
          <div className="flex items-center gap-2 bg-blue-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Cast className="h-3.5 w-3.5 text-white" />
            <span className="text-white text-xs font-bold">En {castDeviceName}</span>
          </div>
        </div>
      )}

      {/* ─── Live TV Badge ────────────────────────────────────────────── */}
      {isLiveTV && (
        <div className="absolute top-16 left-4 z-20">
          <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Radio className="h-3.5 w-3.5 text-white animate-pulse" />
            <span className="text-white text-xs font-bold uppercase tracking-wider">En Vivo</span>
          </div>
        </div>
      )}

      {/* ─── Buffering Indicator ──────────────────────────────────────── */}
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

      {/* ─── Persistent Back Button — ALWAYS visible ─────────────────── */}
      <div className="absolute top-3 left-3 z-[50]">
        <Button
          variant="ghost"
          onClick={handleClose}
          className="text-white hover:bg-white/30 bg-black/50 backdrop-blur-md rounded-full h-10 w-10 p-0 shadow-lg shadow-black/50 border border-white/10 transition-all hover:scale-110"
          title="Atras"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* ─── Top Bar (with title, Nativo/Iframe badge, shows/hides) ──── */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent pt-4 pb-8 px-16 flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Spacer for the persistent back button */}
            <div className="w-10" />

            <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
              <h2 className="text-sm sm:text-base font-medium text-white truncate max-w-[50%]">
                {selectedMovie?.title || 'Reproductor'}
              </h2>
              {/* Nativo / Iframe badge */}
              {!isEmbed && currentSource?.isNative && (
                <Badge className="bg-green-600/80 text-white text-[10px] px-2 py-0.5 border-0 shrink-0">
                  Nativo
                </Badge>
              )}
              {isEmbed && (
                <Badge className="bg-yellow-600/80 text-white text-[10px] px-2 py-0.5 border-0 shrink-0">
                  Iframe
                </Badge>
              )}
              {isLiveTV && (
                <span className="text-xs text-red-400 font-semibold animate-pulse">LIVE</span>
              )}
              {isTVShow && !isLiveTV && (
                <span className="text-xs text-gray-400 shrink-0">
                  T{playerState.selectedSeason}E{playerState.selectedEpisode}
                </span>
              )}
            </div>

            <Button
              variant="ghost"
              onClick={handleClose}
              className="text-white hover:bg-white/30 bg-black/50 backdrop-blur-md rounded-full h-10 w-10 p-0 shadow-lg shadow-black/50 border border-white/10 shrink-0"
              title="Cerrar"
            >
              <X className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Episode List Panel (for TV shows) ───────────────────────── */}
      <AnimatePresence>
        {showEpisodeList && isTVShow && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-0 right-0 bottom-0 z-40 w-80 sm:w-96 bg-black/95 backdrop-blur-md border-l border-gray-800 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Episodios
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowEpisodeList(false)}
                  className="text-gray-400 hover:text-white h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {playerState.tvDetails && playerState.tvDetails.numberOfSeasons > 1 && (
                <div className="relative">
                  <select
                    value={playerState.selectedSeason}
                    onChange={(e) => handleSeasonChange(parseInt(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 appearance-none pr-8 cursor-pointer focus:outline-none focus:border-red-600"
                  >
                    {Array.from(
                      { length: playerState.tvDetails.numberOfSeasons },
                      (_, i) => i  // FIX #5: Start from 0 to include Especiales
                    ).map((s) => (
                      <option key={s} value={s}>
                        {s === 0 ? 'Especiales' : `Temporada ${s}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

            <div className="p-2">
              {loadingEpisodes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 text-red-500 animate-spin" />
                </div>
              ) : episodes.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No hay episodios disponibles
                </p>
              ) : (
                episodes.map((ep) => (
                  <button
                    key={ep.episode_number}
                    onClick={() => handleEpisodeSelect(ep.episode_number)}
                    className={`w-full text-left px-3 py-3 rounded-lg mb-1 transition-all ${
                      playerState.selectedEpisode === ep.episode_number
                        ? 'bg-red-600/20 border border-red-600/50'
                        : 'hover:bg-gray-900 border border-transparent'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded bg-gray-800 flex items-center justify-center">
                        <span
                          className={`text-xs font-mono ${
                            playerState.selectedEpisode === ep.episode_number
                              ? 'text-red-500'
                              : 'text-gray-400'
                          }`}
                        >
                          {ep.episode_number}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            playerState.selectedEpisode === ep.episode_number
                              ? 'text-red-400'
                              : 'text-white'
                          }`}
                        >
                          {ep.name}
                        </p>
                        {ep.runtime > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {ep.runtime} min
                          </p>
                        )}
                      </div>
                      {playerState.selectedEpisode === ep.episode_number && (
                        <div className="flex-shrink-0 flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom Controls ──────────────────────────────────────────── */}
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
            {/* Progress bar (only for non-embed, non-live) */}
            {!isEmbed && !isLiveTV && (
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
                  <span className="text-xs text-gray-400">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>
            )}

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-2">
                {!isEmbed && !isLiveTV && (
                  <Button variant="ghost" onClick={handleSkipBack} className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                )}

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

                {!isEmbed && !isLiveTV && (
                  <Button variant="ghost" onClick={handleSkipForward} className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                )}

                {/* Volume (for native video, not embeds) */}
                {!isEmbed && (
                  <div className="flex items-center gap-1 ml-1 sm:ml-2">
                    <Button variant="ghost" onClick={toggleMute} className="text-white hover:bg-white/20 h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full">
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
                )}

                {/* Episode List Button (for TV shows) */}
                {isTVShow && (
                  <Button
                    variant="ghost"
                    onClick={() => { setShowEpisodeList(!showEpisodeList); setShowAudioManager(false); }}
                    className="text-white hover:bg-white/20 h-9 w-9 p-0 rounded-full ml-1 sm:ml-2"
                  >
                    <Tv className="h-4 w-4" />
                  </Button>
                )}

                {/* Audio Latino Button */}
                <Button
                  variant="ghost"
                  onClick={() => { setShowAudioManager(!showAudioManager); setShowEpisodeList(false); }}
                  className={`h-9 w-9 p-0 rounded-full ml-1 sm:ml-2 transition-all ${
                    showAudioManager ? 'text-green-400 bg-green-400/20' : 'text-white hover:bg-white/20'
                  }`}
                  title="Audio Latino - Cargar audio externo"
                >
                  <Music className="h-4 w-4" />
                </Button>
              </div>

              {/* Right Side Controls */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Chromecast Button */}
                <Button
                  variant="ghost"
                  onClick={handleCast}
                  disabled={castLoading}
                  className={`h-9 w-9 p-0 rounded-full transition-all ${
                    castConnected
                      ? 'text-blue-400 hover:bg-blue-400/20'
                      : castAvailable
                        ? 'text-white hover:bg-white/20'
                        : 'text-gray-600 hover:bg-white/10'
                  }`}
                  title={castConnected ? `Desconectar de ${castDeviceName}` : castAvailable ? 'Enviar a Chromecast' : 'No hay dispositivos Chromecast'}
                >
                  {castLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : castConnected ? (
                    <Podcast className="h-4 w-4" />
                  ) : (
                    <Cast className="h-4 w-4" />
                  )}
                </Button>

                {/* Open in new tab (for embeds) */}
                {isEmbed && (
                  <Button
                    variant="ghost"
                    onClick={openInNewTab}
                    className="text-white hover:bg-white/20 h-9 w-9 p-0 rounded-full"
                    title="Abrir en nueva pestaña"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}

                {/* Source Menu */}
                {hasSourceMenuItems && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowSourceMenu(!showSourceMenu);
                        setShowEpisodeList(false);
                        setShowAudioManager(false);
                      }}
                      className="text-white hover:bg-white/20 h-9 w-9 p-0 rounded-full"
                    >
                      <Server className="h-4 w-4" />
                    </Button>

                    <AnimatePresence>
                      {showSourceMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-12 right-0 z-50 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-xl min-w-[260px] max-h-[70vh] overflow-y-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="p-3 border-b border-gray-800">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Servidores
                            </p>
                          </div>

                          {/* ── Resolved Native Sources ── */}
                          {resolvedNativeSources.length > 0 && (
                            <>
                              <div className="px-4 py-2 bg-gray-800/50">
                                <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  Fuentes Nativas
                                </p>
                              </div>
                              {resolvedNativeSources.map((source, idx) => {
                                const isActive = currentSource?.url === source.url;
                                return (
                                  <button
                                    key={`native-${source.server}-${idx}`}
                                    onClick={() => handleResolvedNativeSwitch(source)}
                                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                                      isActive
                                        ? 'bg-green-600/15 text-green-400 border-l-2 border-green-600'
                                        : 'text-gray-300 hover:bg-gray-800 border-l-2 border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Zap className="h-3.5 w-3.5 text-green-500" />
                                      <span className="font-medium">{source.label}</span>
                                      <Badge className="text-[9px] bg-green-500/20 text-green-400 border-0 ml-auto shrink-0">
                                        Nativo
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5 ml-5">
                                      {source.quality} {source.server && `· ${source.server}`}
                                    </p>
                                  </button>
                                );
                              })}
                            </>
                          )}

                          {/* ── Fallback Embed Sources ── */}
                          {fallbackSources.length > 0 && (
                            <>
                              <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700/50">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                  <Unplug className="h-3 w-3" />
                                  Fallback Iframe
                                </p>
                              </div>
                              {fallbackSources.map((source, idx) => {
                                const isActive = currentSource?.url === source.url;
                                return (
                                  <button
                                    key={`fallback-${source.server}-${idx}`}
                                    onClick={() => handleFallbackSwitch(source)}
                                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                                      isActive
                                        ? 'bg-yellow-600/15 text-yellow-400 border-l-2 border-yellow-600'
                                        : 'text-gray-300 hover:bg-gray-800 border-l-2 border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Unplug className="h-3.5 w-3.5 text-gray-500" />
                                      <span className="font-medium">{source.label}</span>
                                      <Badge className="text-[9px] bg-gray-500/20 text-gray-400 border-0 ml-auto shrink-0">
                                        Iframe
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5 ml-5">
                                      {source.server}
                                    </p>
                                  </button>
                                );
                              })}
                            </>
                          )}

                          {/* ── Legacy Store Sources (if no resolved sources) ── */}
                          {resolvedNativeSources.length === 0 && fallbackSources.length === 0 && playerState.sources.length > 0 && (
                            <>
                              {playerState.sources.map((group, groupIdx) =>
                                group.sources.map((source, sourceIdx) => (
                                  <button
                                    key={`${groupIdx}-${sourceIdx}`}
                                    onClick={() => handleSourceSwitch(groupIdx, sourceIdx)}
                                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                                      currentSource?.id === source.id
                                        ? 'bg-red-600/20 text-red-400 border-l-2 border-red-600'
                                        : 'text-gray-300 hover:bg-gray-800 border-l-2 border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Server className="h-3.5 w-3.5" />
                                      <span className="font-medium">{source.name}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5 ml-5">
                                      {source.quality || 'Auto'}
                                    </p>
                                  </button>
                                ))
                              )}
                            </>
                          )}

                          {/* ── Try Next Source Button (on HLS error) ── */}
                          {hlsError && !isEmbed && (
                            <button
                              onClick={tryNextSource}
                              className="w-full text-left px-4 py-3 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors border-t border-gray-700/50 border-l-2 border-transparent"
                            >
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                <span className="font-medium">Probar siguiente servidor</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 ml-5">
                                Intentar con otra fuente disponible
                              </p>
                            </button>
                          )}

                          {/* ── Extract Direct Source (for embed servers) ── */}
                          {isEmbed && (
                            <>
                              <div className="border-t border-gray-800 p-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                  Herramientas
                                </p>
                              </div>
                              <button
                                onClick={handleExtractSource}
                                disabled={extracting}
                                className="w-full text-left px-4 py-3 text-sm text-green-400 hover:bg-gray-800 transition-colors border-l-2 border-transparent"
                              >
                                <div className="flex items-center gap-2">
                                  {extracting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Zap className="h-3.5 w-3.5" />
                                  )}
                                  <span className="font-medium">
                                    {extracting ? 'Extrayendo...' : 'Extraer fuente directa'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 ml-5">
                                  Obtener URL de video directa
                                </p>
                              </button>
                            </>
                          )}

                          {/* ── Extracted Sources (if any) ── */}
                          {extractedSources.length > 0 && (
                            <>
                              <div className="border-t border-gray-800 p-3">
                                <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  Fuentes directas encontradas
                                </p>
                              </div>
                              {extractedSources.map((src, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handlePlayExtracted(src)}
                                  className="w-full text-left px-4 py-3 text-sm text-yellow-300 hover:bg-yellow-500/10 transition-colors border-l-2 border-yellow-600/50"
                                >
                                  <div className="flex items-center gap-2">
                                    <Unplug className="h-3.5 w-3.5" />
                                    <span className="font-medium">{src.label}</span>
                                    <Badge className="text-[10px] bg-yellow-500/20 text-yellow-400 border-0 ml-auto">
                                      {src.quality}
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] text-gray-600 mt-0.5 ml-5 truncate">
                                    {src.url.substring(0, 60)}...
                                  </p>
                                </button>
                              ))}
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Audio Manager Panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {showAudioManager && (
          <AudioManager
            videoRef={videoRef}
            visible={showAudioManager}
            onClose={() => setShowAudioManager(false)}
            isEmbedPlayer={isEmbed}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

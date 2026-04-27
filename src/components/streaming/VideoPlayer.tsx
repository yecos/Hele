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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

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

  const currentSource = playerState.currentSource;
  const isEmbed = currentSource?.type === 'embed';
  const isHLS = currentSource?.type === 'hls' || currentSource?.url?.includes('.m3u8');
  const isLiveTV = currentSource?.type === 'live';
  const isTVShow = playerState.isTVShow;

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

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

  // Reset iframe error when source changes
  useEffect(() => {
    setIframeError(false);
    setUseProxy(true);
  }, [currentSource?.url]);

  // Load episodes for TV shows
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
  }, [isTVShow, selectedMovie?.id, playerState.selectedSeason]);

  // Handle HLS / direct video / live TV playback
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
      // HLS stream (live TV or movies)
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
              // Try to recover from network errors
              setTimeout(() => hls.startLoad(), 3000);
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            }
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play().catch(() => {});
      }
    } else {
      // Direct video URL
      video.src = url;
      video.play().catch(() => {});
    }
  }, [currentSource, isEmbed, isHLS]);

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

  // Get iframe src - try direct embed first, proxy as fallback
  const getIframeSrc = useCallback(() => {
    if (!currentSource?.url) return '';
    if (useProxy) {
      return `/api/proxy?url=${encodeURIComponent(currentSource.url)}`;
    }
    return currentSource.url;
  }, [currentSource?.url, useProxy]);

  if (currentView !== 'player') return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
      onMouseMove={handleMouseMove}
    >
      {/* Embed Player (iframe with proxy) */}
      {isEmbed && currentSource && !iframeError ? (
        <iframe
          ref={iframeRef}
          src={getIframeSrc()}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="no-referrer"
          onError={() => setIframeError(true)}
          title={`Reproduciendo ${selectedMovie?.title || 'video'}`}
        />
      ) : !isEmbed && currentSource && (isHLS || !isEmbed) ? (
        /* HLS / Direct Video Element (also for live TV) */
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
      ) : (
        /* No Source Available / Embed Error */
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
                <MonitorPlay className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 text-lg font-medium">
                  {iframeError ? 'Servidor no disponible' : 'Sin fuente de video'}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {iframeError
                    ? 'Intenta con otro servidor o abre en nueva pestaña'
                    : 'Selecciona un servidor para reproducir'}
                </p>
                {iframeError && (
                  <div className="flex gap-2 mt-4 justify-center">
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
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live TV Badge */}
      {isLiveTV && (
        <div className="absolute top-16 left-4 z-20">
          <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Radio className="h-3.5 w-3.5 text-white animate-pulse" />
            <span className="text-white text-xs font-bold uppercase tracking-wider">En Vivo</span>
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

            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-medium text-white truncate max-w-[40%]">
                {selectedMovie?.title || 'Reproductor'}
              </h2>
              {isLiveTV && (
                <span className="text-xs text-red-400 font-semibold animate-pulse">LIVE</span>
              )}
              {isTVShow && !isLiveTV && (
                <span className="text-xs text-gray-400">
                  T{playerState.selectedSeason}E{playerState.selectedEpisode}
                </span>
              )}
            </div>

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

      {/* Episode List Panel (for TV shows) */}
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
                      (_, i) => i + 1
                    ).map((s) => (
                      <option key={s} value={s}>
                        Temporada {s}
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
                    onClick={() => setShowEpisodeList(!showEpisodeList)}
                    className="text-white hover:bg-white/20 h-9 w-9 p-0 rounded-full ml-1 sm:ml-2"
                  >
                    <Tv className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Right Side Controls */}
              <div className="flex items-center gap-1 sm:gap-2">
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
                {playerState.sources.length > 0 && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowSourceMenu(!showSourceMenu);
                        setShowEpisodeList(false);
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
                          className="absolute bottom-12 right-0 z-50 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-lg shadow-xl min-w-[200px] overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="p-3 border-b border-gray-800">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              Servidores
                            </p>
                          </div>
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
    </motion.div>
  );
}

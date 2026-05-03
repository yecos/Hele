'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useViewStore, useAuthStore } from '@/lib/store';
import { Radio, Play, Pause, Volume2, VolumeX, Maximize, Minimize, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Loader2, Tv, ArrowLeft, RefreshCw, Signal, WifiOff, Cast, ShieldCheck, Activity, Shield, MoreHorizontal, List } from 'lucide-react';
import Hls from 'hls.js';
import { useChromecast } from '@/hooks/use-chromecast';
import { useT } from '@/lib/i18n';
import dynamic from 'next/dynamic';
import { ChannelTransition } from '@/components/iptv/ChannelTransition';
import { AnimatedCategoryCard } from '@/components/iptv/AnimatedCategoryCard';
import { CountryCarousel } from '@/components/iptv/CountryCarousel';
const AdminPanel = dynamic(() => import('@/components/guardian/AdminPanel'), { ssr: false });

// Mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

interface IPTVChannel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  country: string;
  quality: string;
  status: string;
  verified?: boolean;
}

interface PlaylistSection {
  title: string;
  items: { id: string; label: string; flag: string }[];
}

const PLAYLIST_SECTIONS: PlaylistSection[] = [
  {
    title: 'Cargar Canales',
    items: [
      { id: 'all-spa', label: 'Cargar Todos los Canales', flag: '⚡' },
      { id: 'spa', label: 'Todo Español', flag: '🌐' },
      { id: 'eng', label: 'Todo Inglés', flag: '🇺🇸' },
      { id: 'latam', label: 'Latinoamérica', flag: '🌎' },
    ],
  },
  // Países section replaced by CountryCarousel component
  {
    title: 'Categorías',
    items: [
      { id: 'news', label: 'Noticias', flag: '📰' },
      { id: 'sports', label: 'Deportes', flag: '⚽' },
      { id: 'entertainment', label: 'Entretenimiento', flag: '🎬' },
      { id: 'music', label: 'Música', flag: '🎵' },
      { id: 'movies', label: 'Películas', flag: '🎥' },
      { id: 'kids', label: 'Infantil', flag: '🧸' },
      { id: 'documentary', label: 'Documentales', flag: '🔬' },
      { id: 'education', label: 'Educación', flag: '📚' },
      { id: 'comedy', label: 'Comedia', flag: '😂' },
      { id: 'lifestyle', label: 'Estilo de vida', flag: '🏠' },
      { id: 'religious', label: 'Religión', flag: '⛪' },
      { id: 'general', label: 'General', flag: '📡' },
    ],
  },
  {
    title: 'España (TDT)',
    items: [
      { id: 'tdt', label: 'TDT TV', flag: '📺' },
      { id: 'tdt8', label: 'TDT TV (HLS)', flag: '📺' },
      { id: 'tdt-radio', label: 'TDT Radio', flag: '📻' },
      { id: 'tdt-radio8', label: 'TDT Radio (HLS)', flag: '📻' },
      { id: 'tdt-all', label: 'TV + Radio', flag: '📻' },
    ],
  },
  {
    title: 'Más Fuentes',
    items: [
      { id: 'free-tv', label: 'Free-TV Global', flag: '🌐' },
      { id: 'free-tv-es', label: 'Free-TV España', flag: '🇪🇸' },
      { id: 'free-tv-mx', label: 'Free-TV México', flag: '🇲🇽' },
      { id: 'free-tv-ar', label: 'Free-TV Argentina', flag: '🇦🇷' },
      { id: 'free-tv-cl', label: 'Free-TV Chile', flag: '🇨🇱' },
      { id: 'free-tv-co', label: 'Free-TV Colombia', flag: '🇨🇴' },
      { id: 'free-tv-pe', label: 'Free-TV Perú', flag: '🇵🇪' },
      { id: 'free-tv-ve', label: 'Free-TV Venezuela', flag: '🇻🇪' },
      { id: 'm3ucl-total', label: 'M3U.CL Todos', flag: '🌐' },
      { id: 'm3ucl-music', label: 'M3U.CL Música', flag: '🎵' },
      { id: 'telechancho', label: 'telechancho', flag: '📺' },
    ],
  },
  {
    title: 'HBO Premium',
    items: [
      { id: 'hbo', label: 'HBO Canales', flag: '🎬' },
    ],
  },
  {
    title: 'Premium Latino',
    items: [
      { id: 'premium', label: 'Canales Premium', flag: '⭐' },
    ],
  },
];

export function IPTVView() {
  const { setView } = useViewStore();
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<IPTVChannel[]>([]);
  const [onlineChannels, setOnlineChannels] = useState<IPTVChannel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeChannel, setActiveChannel] = useState<IPTVChannel | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [channelError, setChannelError] = useState(false);
  const [isChannelLoading, setIsChannelLoading] = useState(true);
  const [loadingPlaylist, setLoadingPlaylist] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState('all-spa');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChannelList, setShowChannelList] = useState(false);
  const [infoTimeout, setInfoTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showInfo, setShowInfo] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState({ checked: 0, total: 0 });
  const [showOnlyWorking, setShowOnlyWorking] = useState(true);
  const [verifiedUrls, setVerifiedUrls] = useState<Set<string>>(new Set());
  const verifyAbortRef = useRef<AbortController | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Admin state
  const { username } = useAuthStore();
  const isAdmin = username?.toLowerCase() === 'admin';
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Guardian state
  const [guardianStatus, setGuardianStatus] = useState<{
    totalVerified: number;
    isScanning: boolean;
    latestScan: { status: string; workingChannels: number; totalChannels: number; completedAt: string } | null;
    scheduler: { initialized: boolean; activeTasks: number };
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const cast = useChromecast();
  const { t } = useT();
  const isActivelyCasting = cast.isCasting && cast.isConnected;

  // Verify channels against the API
  const verifyChannels = useCallback(async (chs: IPTVChannel[], signal?: AbortSignal) => {
    if (chs.length === 0) return;

    setIsVerifying(true);
    setVerifyProgress({ checked: 0, total: chs.length });

    const urls = chs.map(c => c.url);

    // Split into batches of 150 to avoid timeout
    const batchSize = 150;
    const allVerified = new Set<string>();
    let totalChecked = 0;

    for (let i = 0; i < urls.length; i += batchSize) {
      if (signal?.aborted) break;

      const batch = urls.slice(i, i + batchSize);
      try {
        const res = await fetch('/api/iptv/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: batch }),
          signal,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.working && Array.isArray(data.working)) {
            data.working.forEach((url: string) => allVerified.add(url));
          }
          totalChecked += batch.length;
          setVerifyProgress({ checked: totalChecked, total: urls.length });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') break;
        console.error('Error verifying batch:', err);
        totalChecked += batch.length;
        setVerifyProgress({ checked: totalChecked, total: urls.length });
      }
    }

    setVerifiedUrls(allVerified);
    setIsVerifying(false);
    return allVerified;
  }, []);

  // Fetch channels from API
  useEffect(() => {
    const fetchChannels = async () => {
      setLoadingPlaylist(true);
      setChannels([]);
      setFilteredChannels([]);
      setOnlineChannels([]);
      setVerifiedUrls(new Set());
      setIsVerifying(false);

      // Abort previous verification
      if (verifyAbortRef.current) {
        verifyAbortRef.current.abort();
      }
      const abortController = new AbortController();
      verifyAbortRef.current = abortController;

      try {
        const res = await fetch(`/api/iptv?playlist=${selectedPlaylist}`);
        if (res.ok) {
          const data = await res.json();
          const chs: IPTVChannel[] = data.channels || [];
          setChannels(chs);

          // Show channels IMMEDIATELY - don't wait for verification
          const online = chs.filter(c => c.status !== 'offline');
          setOnlineChannels(online);
          setFilteredChannels(online);
          setLoadingPlaylist(false);

          if (online.length > 0) {
            setCurrentIndex(0);
            setActiveChannel(online[0]);
            setIsChannelLoading(true);
            setChannelError(false);
            setRetryCount(0);
          }

          // Start verification IN BACKGROUND (non-blocking)
          // This will silently update the channel list when done
          verifyChannelsInBackground(chs, abortController.signal);
        }
      } catch (err) {
        console.error('Error fetching IPTV:', err);
        setLoadingPlaylist(false);
      }
    };
    fetchChannels();

    return () => {
      if (verifyAbortRef.current) {
        verifyAbortRef.current.abort();
      }
    };
  }, [selectedPlaylist]);

  // Background verification - runs silently without blocking UI
  const verifyChannelsInBackground = useCallback(async (chs: IPTVChannel[], signal?: AbortSignal) => {
    if (chs.length === 0) return;

    setIsVerifying(true);
    setVerifyProgress({ checked: 0, total: chs.length });

    const urls = chs.map(c => c.url);
    const batchSize = 150;
    const allVerified = new Set<string>();
    let totalChecked = 0;

    for (let i = 0; i < urls.length; i += batchSize) {
      if (signal?.aborted) break;

      const batch = urls.slice(i, i + batchSize);
      try {
        const res = await fetch('/api/iptv/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: batch }),
          signal,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.working && Array.isArray(data.working)) {
            data.working.forEach((url: string) => allVerified.add(url));
          }
          totalChecked += batch.length;
          setVerifyProgress({ checked: totalChecked, total: urls.length });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') break;
        console.error('Error verifying batch:', err);
        totalChecked += batch.length;
        setVerifyProgress({ checked: totalChecked, total: urls.length });
      }
    }

    if (signal?.aborted) return;

    setVerifiedUrls(allVerified);
    setIsVerifying(false);

    // Silently update online channels with verified results
    if (allVerified.size > 0) {
      const workingChs = chs.filter(c => allVerified.has(c.url));
      setOnlineChannels(workingChs);
      // Only update filtered if no search active
      setFilteredChannels(prev => {
        // If user is searching, don't overwrite their filter
        return workingChs;
      });

      // If current channel is not working, switch to first working
      setActiveChannel(prev => {
        if (prev && allVerified.has(prev.url)) return prev;
        if (workingChs.length > 0) {
          setCurrentIndex(0);
          return workingChs[0];
        }
        return prev;
      });
    }
  }, []);

  // Fetch Guardian status
  useEffect(() => {
    const fetchGuardianStatus = async () => {
      try {
        const res = await fetch('/api/guardian/status');
        if (res.ok) {
          const data = await res.json();
          if (data.success) setGuardianStatus(data.guardian);
        }
      } catch {}
    };
    fetchGuardianStatus();
    const interval = setInterval(fetchGuardianStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter channels by search
  useEffect(() => {
    let sourceChannels = showOnlyWorking ? onlineChannels : channels;

    if (!searchQuery.trim()) {
      setFilteredChannels(sourceChannels);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredChannels(
      sourceChannels.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, channels, onlineChannels, showOnlyWorking]);

  // HLS.js instance ref
  const hlsRef = useRef<Hls | null>(null);

  // Auto-cast IPTV to Chromecast when channel changes and cast is connected
  useEffect(() => {
    if (activeChannel && cast.isConnected && activeChannel.url.includes('.m3u8')) {
      cast.castHLS(activeChannel.url, activeChannel.name, `${activeChannel.group} - ${activeChannel.country}`);
    }
  }, [activeChannel?.id, cast.isConnected]);  

  // Play channel when activeChannel changes
  useEffect(() => {
    if (!activeChannel || !videoRef.current) return;
    const video = videoRef.current;
    const url = activeChannel.url;

    setIsChannelLoading(true);
    setChannelError(false);
    setShowInfo(true);

    // Clear previous info timeout and destroy previous HLS instance
    if (infoTimeout) clearTimeout(infoTimeout);
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHLS = url.includes('.m3u8');

    if (isHLS && Hls.isSupported()) {
      // Use HLS.js for m3u8 streams on non-Safari browsers
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
        startLevel: -1, // auto quality
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          setChannelError(true);
          setIsChannelLoading(false);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setChannelError(true);
          setIsChannelLoading(false);
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        }
      });
    } else if (isHLS && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = url;
      video.load();
      video.play().catch(() => {
        setChannelError(true);
        setIsChannelLoading(false);
      });
    } else {
      // Regular video formats
      video.src = url;
      video.load();
      video.play().catch(() => {
        setChannelError(true);
        setIsChannelLoading(false);
      });
    }

    // Auto-hide info after 5 seconds
    const timeout = setTimeout(() => setShowInfo(false), 5000);
    setInfoTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeChannel?.id]);  

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showChannelList || searchQuery) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'ChannelUp':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowDown':
        case 'ChannelDown':
          e.preventDefault();
          goPrev();
          break;
        case ' ':
        case 'k':
          e.preventDefault();
          togglePause();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            document.exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showChannelList, searchQuery, isFullscreen, currentIndex, onlineChannels.length]);  

  // Show channel transition overlay helper
  const triggerTransition = useCallback(() => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    setShowTransition(true);
    transitionTimerRef.current = setTimeout(() => setShowTransition(false), 3000);
  }, []);

  // Cleanup transition timer on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const goNext = useCallback(() => {
    if (onlineChannels.length === 0) return;
    const next = (currentIndex + 1) % onlineChannels.length;
    setCurrentIndex(next);
    setActiveChannel(onlineChannels[next]);
    setRetryCount(0);
    triggerTransition();
  }, [currentIndex, onlineChannels, triggerTransition]);

  const goPrev = useCallback(() => {
    if (onlineChannels.length === 0) return;
    const prev = (currentIndex - 1 + onlineChannels.length) % onlineChannels.length;
    setCurrentIndex(prev);
    setActiveChannel(onlineChannels[prev]);
    setRetryCount(0);
    triggerTransition();
  }, [currentIndex, onlineChannels, triggerTransition]);

  const selectChannel = (channel: IPTVChannel, index: number) => {
    setActiveChannel(channel);
    // Find in online channels
    const onlineIdx = onlineChannels.findIndex(c => c.id === channel.id);
    if (onlineIdx !== -1) {
      setCurrentIndex(onlineIdx);
    } else {
      setCurrentIndex(index);
    }
    setRetryCount(0);
    setShowChannelList(false);
    triggerTransition();
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const togglePause = () => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {}
  };

  const skipChannel = () => {
    if (retryCount < 3 && activeChannel) {
      setRetryCount(prev => prev + 1);
      goNext();
    }
  };

  const handleVideoError = () => {
    setChannelError(true);
    setIsChannelLoading(false);
  };

  const handleVideoPlaying = () => {
    setIsChannelLoading(false);
    setChannelError(false);
  };

  const handleVideoCanPlay = () => {
    setIsChannelLoading(false);
  };

  // Move mouse / tap to show info
  const handleMouseMove = () => {
    setShowInfo(true);
    if (infoTimeout) clearTimeout(infoTimeout);
    const timeout = setTimeout(() => setShowInfo(false), 4000);
    setInfoTimeout(timeout);
  };

  // Touch toggle for controls overlay (tap to show/hide)
  const handleTouchToggle = useCallback(() => {
    setShowInfo(prev => {
      if (infoTimeout) clearTimeout(infoTimeout);
      if (prev) {
        // Already showing, hide immediately
        return false;
      }
      // Show and auto-hide after 4s
      const timeout = setTimeout(() => setShowInfo(false), 4000);
      setInfoTimeout(timeout);
      return true;
    });
  }, [infoTimeout]);

  // Group channels for list display
  const groupedChannels: Record<string, IPTVChannel[]> = {};
  filteredChannels.forEach(ch => {
    const group = ch.group || 'General';
    if (!groupedChannels[group]) groupedChannels[group] = [];
    groupedChannels[group].push(ch);
  });

  const workingCount = onlineChannels.length;
  const totalCount = channels.length;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col select-none"
      onMouseMove={handleMouseMove}
      onClick={isMobile ? handleTouchToggle : handleMouseMove}
    >
      {/* Touch zone for toggling controls — only fires when tapping the video area, not controls */}
      {/* The top/bottom control bars have e.stopPropagation() to prevent this */}
      {/* Video player - fills entire screen */}
      <div className="flex-1 relative bg-black">
        {/* Loading playlist (initial fetch only, NOT verification) */}
        {loadingPlaylist && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-black">
            <div className="flex flex-col items-center gap-4 max-w-sm text-center px-4">
              <Loader2 size={48} className="text-red-500 animate-spin" />
              <p className="text-gray-400 text-lg">{t('iptv.loading')}</p>
              <p className="text-gray-600 text-sm">{t('iptv.loadingFrom')}</p>
            </div>
          </div>
        )}

        {/* Channel loading overlay */}
        {isChannelLoading && !loadingPlaylist && activeChannel && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={40} className="text-red-500 animate-spin" />
              <p className="text-gray-400 text-sm">{t('iptv.loadingChannel')}</p>
              <p className="text-gray-600 text-xs">{activeChannel.name}</p>
            </div>
          </div>
        )}

        {/* Channel error overlay */}
        {channelError && activeChannel && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/90">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <WifiOff size={48} className="text-red-500" />
              <p className="text-white font-semibold">{t('iptv.noSignal')}</p>
              <p className="text-gray-400 text-sm">{activeChannel.name}</p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={skipChannel}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  <ChevronDown size={16} />
                  {t('iptv.nextChannel')}
                </button>
                <button
                  onClick={() => { setRetryCount(0); setChannelError(false); setIsChannelLoading(true); if (videoRef.current && activeChannel) { const url = activeChannel.url; if (url.includes('.m3u8') && Hls.isSupported()) { if (hlsRef.current) hlsRef.current.destroy(); const hls = new Hls({ enableWorker: true, lowLatencyMode: true }); hlsRef.current = hls; hls.loadSource(url); hls.attachMedia(videoRef.current); hls.on(Hls.Events.MANIFEST_PARSED, () => { videoRef.current?.play().catch(() => {}); }); } else { videoRef.current.load(); videoRef.current.play().catch(() => {}); } } }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
                >
                  <RefreshCw size={16} />
                  {t('iptv.retry')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video element */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          autoPlay
          playsInline
          muted={isMuted}
          onError={handleVideoError}
          onPlaying={handleVideoPlaying}
          onCanPlay={handleVideoCanPlay}
          onLoadedData={handleVideoCanPlay}
          onWaiting={() => setIsChannelLoading(true)}
        />
      </div>

      {/* ===== BOTTOM INFO BAR (TV style) ===== */}
      {activeChannel && showInfo && !loadingPlaylist && (
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none"
          onClick={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          {/* Channel info gradient */}
          <div className="bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-12 sm:pt-16 pb-4 px-3 sm:px-8">
            <div className="max-w-[1400px] mx-auto flex items-center gap-3 sm:gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {activeChannel.logo ? (
                  <img
                    src={activeChannel.logo}
                    alt={activeChannel.name}
                    className="w-12 h-12 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl object-contain bg-white/5 p-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center">
                    <Tv size={24} className="text-gray-500 sm:hidden" />
                    <Tv size={32} className="text-gray-500 hidden sm:block" />
                  </div>
                )}
              </div>

              {/* Channel details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Signal size={14} className="text-green-400" />
                  <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">{t('iptv.live')}</span>
                  <span className="text-gray-600 text-xs">|</span>
                  <span className="text-gray-400 text-xs">{activeChannel.group}</span>
                  {activeChannel.country && (
                    <>
                      <span className="text-gray-600 text-xs">|</span>
                      <span className="text-gray-400 text-xs">{activeChannel.country}</span>
                    </>
                  )}
                  {activeChannel.quality !== 'SD' && (
                    <>
                      <span className="text-gray-600 text-xs">|</span>
                      <span className={`text-xs font-bold ${activeChannel.quality === 'HD' ? 'text-blue-400' : 'text-gray-400'}`}>
                        {activeChannel.quality}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="text-white text-base sm:text-2xl font-bold truncate">{activeChannel.name}</h2>
                <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5">
                  {t('iptv.channel')} {currentIndex + 1} {t('iptv.of')} {onlineChannels.length}
                  {isActivelyCasting && (
                    <span className="text-green-400 ml-2">{t('iptv.castingOn', { device: cast.device?.friendlyName || '' })}</span>
                  )}
                </p>
              </div>

              {/* Controls hint — desktop only */}
              <div className="hidden sm:flex flex-col items-end gap-1 text-gray-600 text-[10px] shrink-0">
                <span>{t('iptv.controls.changeChannel')}</span>
                <span>{t('iptv.controls.mute')}</span>
                <span>{t('iptv.controls.pause')}</span>
              </div>
              {/* Tap hint — mobile only */}
              <div className="sm:hidden text-gray-600 text-[10px] shrink-0">
                Toca para controles
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TOP CONTROL BAR ===== */}
      {showInfo && !loadingPlaylist && (
        <div
          className="absolute top-0 left-0 right-0 z-20"
          onClick={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onMouseMove={e => e.stopPropagation()}
        >
          <div className="bg-gradient-to-b from-black/80 via-black/40 to-transparent pb-8 px-3 sm:px-4" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
            {/* Safe area top padding for iOS notch */}
            <div className="max-w-[1400px] mx-auto flex items-center justify-between">
              {/* Left: Back button + logo */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => setView('home')}
                  className="pointer-events-auto p-2 sm:p-2 rounded-full bg-white/10 active:bg-white/30 hover:bg-white/20 text-white transition-all"
                  style={{ touchAction: 'manipulation' }}
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Radio size={18} className="text-green-500 flex-shrink-0" />
                  <span className="text-white font-bold text-sm sm:text-base">IPTV</span>
                  {/* Admin badge — hide on very small screens */}
                  {isAdmin ? (
                    <button
                      onClick={() => setShowAdminPanel(true)}
                      className="pointer-events-auto hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 ml-1 hover:bg-emerald-500/30 cursor-pointer transition-colors"
                      title="Abrir Panel Admin"
                    >
                      <Shield size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 text-[11px] font-bold">Admin</span>
                    </button>
                  ) : isVerifying ? (
                    <span className="pointer-events-auto hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 ml-1">
                      <Loader2 size={10} className="text-yellow-400 animate-spin" />
                      <span className="text-yellow-400 text-[10px] font-medium">
                        Verificando {verifyProgress.checked}/{verifyProgress.total}
                      </span>
                    </span>
                  ) : verifiedUrls.size > 0 ? (
                    <span className="pointer-events-auto hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 ml-1">
                      <ShieldCheck size={10} className="text-green-400" />
                      <span className="text-green-400 text-[10px] font-medium">
                        {onlineChannels.length} OK
                      </span>
                    </span>
                  ) : guardianStatus && guardianStatus.scheduler.initialized ? (
                    <span className="pointer-events-auto hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 ml-1">
                      {guardianStatus.isScanning ? (
                        <Activity size={10} className="text-green-400 animate-pulse" />
                      ) : (
                        <ShieldCheck size={10} className="text-green-400" />
                      )}
                      <span className="text-green-400 text-[10px] font-medium">
                        {guardianStatus.isScanning ? 'Escaneando...' : guardianStatus.totalVerified > 0 ? `${guardianStatus.totalVerified} OK` : 'Guardian'}
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Center + Right: Controls — responsive layout */}
              <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
                {/* Prev channel — horizontal arrows on mobile, vertical on desktop */}
                <button
                  onClick={goPrev}
                  className="p-2.5 rounded-full bg-white/10 active:bg-white/30 hover:bg-white/20 text-white transition-all"
                  title={t('iptv.prevChannel')}
                  style={{ touchAction: 'manipulation' }}
                >
                  <ChevronLeft size={18} className="sm:hidden" />
                  <ChevronUp size={18} className="hidden sm:block" />
                </button>

                {/* Play/Pause — always visible, larger on mobile */}
                <button
                  onClick={togglePause}
                  className="p-3 sm:p-2.5 rounded-full bg-white/10 active:bg-white/30 hover:bg-white/20 text-white transition-all"
                  title={isPaused ? t('iptv.resume') : t('iptv.pause')}
                  style={{ touchAction: 'manipulation' }}
                >
                  {isPaused ? <Play size={20} fill="white" className="sm:size-[18px]" /> : <Pause size={20} className="sm:size-[18px]" />}
                </button>

                {/* Next channel */}
                <button
                  onClick={goNext}
                  className="p-2.5 rounded-full bg-white/10 active:bg-white/30 hover:bg-white/20 text-white transition-all"
                  title={t('iptv.nextChannel')}
                  style={{ touchAction: 'manipulation' }}
                >
                  <ChevronRight size={18} className="sm:hidden" />
                  <ChevronDown size={18} className="hidden sm:block" />
                </button>

                {/* Desktop: Mute + Fullscreen + Cast + Channels */}
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-px h-6 bg-white/10 mx-1" />
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                    title={isMuted ? t('iptv.unmute') : t('iptv.mute')}
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                    title={t('iptv.fullscreen')}
                  >
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                  </button>
                  {/* Chromecast button — desktop */}
                  <button
                    onClick={async () => {
                      if (isActivelyCasting) {
                        cast.disconnect();
                      } else if (activeChannel) {
                        if (!cast.isConnected) {
                          const connected = await cast.connect();
                          if (connected && activeChannel.url.includes('.m3u8')) {
                            cast.castHLS(activeChannel.url, activeChannel.name, `${activeChannel.group} - ${activeChannel.country}`);
                          }
                        } else {
                          cast.castHLS(activeChannel.url, activeChannel.name, `${activeChannel.group} - ${activeChannel.country}`);
                        }
                      } else {
                        cast.connect();
                      }
                    }}
                    className={`relative p-2 rounded-full transition-all ${
                      isActivelyCasting
                        ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                        : cast.status === 'connecting'
                        ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                    title={isActivelyCasting ? `${t('player.disconnectFrom')} ${cast.device?.friendlyName}` : t('iptv.sendToChromecast')}
                  >
                    <Cast size={18} />
                    {cast.status === 'connecting' && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
                    )}
                    {isActivelyCasting && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setShowChannelList(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-all"
                  >
                    <Tv size={16} />
                    <span>{t('iptv.channels')}</span>
                  </button>
                </div>

                {/* Mobile: More menu + Channels */}
                <div className="flex sm:hidden items-center gap-1.5">
                  <div className="w-px h-6 bg-white/10" />
                  <button
                    onClick={() => setShowChannelList(true)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-white/10 active:bg-white/30 text-white text-sm transition-all"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <List size={16} />
                    <span>{t('iptv.channels')}</span>
                  </button>
                  {/* More menu button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="p-2.5 rounded-full bg-white/10 active:bg-white/30 text-white transition-all"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <MoreHorizontal size={20} />
                    </button>
                    {/* Dropdown menu */}
                    {showMoreMenu && (
                      <div className="absolute right-0 top-full mt-2 bg-gray-900/95 backdrop-blur-lg border border-white/10 rounded-xl py-1 min-w-[160px] shadow-2xl z-50">
                        <button
                          onClick={() => { toggleMute(); setShowMoreMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white active:bg-white/15 transition-all"
                          style={{ touchAction: 'manipulation' }}
                        >
                          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                          {isMuted ? t('iptv.unmute') : t('iptv.mute')}
                        </button>
                        <button
                          onClick={() => { toggleFullscreen(); setShowMoreMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white active:bg-white/15 transition-all"
                          style={{ touchAction: 'manipulation' }}
                        >
                          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                          {t('iptv.fullscreen')}
                        </button>
                        <button
                          onClick={async () => {
                            setShowMoreMenu(false);
                            if (isActivelyCasting) {
                              cast.disconnect();
                            } else if (activeChannel) {
                              if (!cast.isConnected) {
                                const connected = await cast.connect();
                                if (connected && activeChannel.url.includes('.m3u8')) {
                                  cast.castHLS(activeChannel.url, activeChannel.name, `${activeChannel.group} - ${activeChannel.country}`);
                                }
                              } else {
                                cast.castHLS(activeChannel.url, activeChannel.name, `${activeChannel.group} - ${activeChannel.country}`);
                              }
                            } else {
                              cast.connect();
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all ${
                            isActivelyCasting ? 'text-green-400' : 'text-gray-300 hover:bg-white/10 hover:text-white active:bg-white/15'
                          }`}
                          style={{ touchAction: 'manipulation' }}
                        >
                          <Cast size={16} />
                          {isActivelyCasting ? t('player.disconnectFrom', { device: cast.device?.friendlyName || '' }) : t('iptv.sendToChromecast')}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => { setShowAdminPanel(true); setShowMoreMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-emerald-400 hover:bg-white/10 active:bg-white/15 transition-all border-t border-white/5"
                            style={{ touchAction: 'manipulation' }}
                          >
                            <Shield size={16} />
                            Admin Panel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Close more menu when tapping outside */}
      {showMoreMenu && <div className="fixed inset-0 z-[18]" onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); }} onTouchStart={e => e.stopPropagation()} />}

      {/* Quick channel up/down buttons at sides — desktop only (hover-to-show) */}
      {showInfo && !loadingPlaylist && !isMobile && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white transition-all opacity-0 hover:opacity-100"
          >
            <ChevronUp size={28} />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white transition-all opacity-0 hover:opacity-100"
          >
            <ChevronDown size={28} />
          </button>
        </>
      )}

      {/* ===== CHANNEL LIST PANEL (slide from right) ===== */}
      {showChannelList && (
        <div
          className="absolute inset-0 z-30 flex"
          onClick={() => setShowChannelList(false)}
        >
          {/* Backdrop */}
          <div className="flex-1 bg-black/60" />

          {/* Panel */}
          <div
            className="w-full max-w-md bg-gray-950 border-l border-white/10 flex flex-col overscroll-contain"
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Tv size={18} />
                {t('iptv.channels')}
                <span className="text-green-400 text-sm font-normal">
                  {workingCount}/{totalCount} {t('iptv.ok')}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {/* Toggle: working only vs all */}
                <button
                  onClick={() => setShowOnlyWorking(!showOnlyWorking)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                    showOnlyWorking
                      ? 'bg-green-600/30 text-green-400 border border-green-500/30'
                      : 'bg-white/5 text-gray-500 border border-white/10'
                  }`}
                >
                  <Signal size={10} />
                  {showOnlyWorking ? t('iptv.onlyOK') : t('iptv.all')}
                </button>
                <button
                  onClick={() => setShowChannelList(false)}
                  className="text-gray-400 hover:text-white active:text-white p-3 -mr-2"
                  style={{ touchAction: 'manipulation' }}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Country flag carousel */}
            <div className="py-3 border-b border-white/5">
              <CountryCarousel
                selectedCountry={selectedPlaylist}
                onSelect={(countryId) => { setSelectedPlaylist(countryId); setShowChannelList(false); }}
              />
            </div>

            {/* Playlist selector - organized by sections */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="max-h-[35vh] sm:max-h-[45vh] overflow-y-auto overscroll-contain space-y-3 pr-1">
                {PLAYLIST_SECTIONS.map(section => (
                  <div key={section.title}>
                    <h4 className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                      {section.title}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {section.items.map(pl => (
                        <AnimatedCategoryCard
                          key={pl.id}
                          id={pl.id}
                          name={pl.label}
                          flag={pl.flag}
                          isSelected={selectedPlaylist === pl.id}
                          onClick={() => { setSelectedPlaylist(pl.id); setShowChannelList(false); }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="mt-3 relative">
                <input
                  type="text"
                  placeholder={t('iptv.searchChannel')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-green-500/50 transition-colors placeholder:text-gray-600"
                  autoFocus
                />
              </div>
            </div>

            {/* Channel list */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {Object.entries(groupedChannels).map(([group, groupChannels]) => (
                <div key={group}>
                  <div className="sticky top-0 bg-gray-950/95 backdrop-blur-sm px-4 py-2 border-b border-white/5">
                    <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
                      {group} ({groupChannels.length})
                    </h3>
                  </div>
                  {groupChannels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => selectChannel(channel, channels.indexOf(channel))}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left border-b border-white/5 ${
                        activeChannel?.id === channel.id
                          ? 'bg-green-600/20 border-l-2 border-l-green-500'
                          : 'hover:bg-white/5'
                      } ${channel.status === 'offline' ? 'opacity-40' : ''}`}
                    >
                      {/* Logo */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                        {channel.logo ? (
                          <img src={channel.logo} alt="" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <Tv size={16} className="text-gray-600" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{channel.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {verifiedUrls.has(channel.url) ? (
                            <span className="flex items-center gap-1 text-green-400 text-[10px]">
                              <Signal size={8} />
                              {t('iptv.verified')}
                            </span>
                          ) : verifiedUrls.size > 0 ? (
                            <span className="text-red-400/60 text-[10px]">{t('iptv.noSignalShort')}</span>
                          ) : channel.status === 'offline' ? (
                            <span className="text-red-400 text-[10px]">{t('iptv.offline')}</span>
                          ) : channel.status === 'geo-blocked' ? (
                            <span className="text-yellow-400 text-[10px]">{t('iptv.geoBlocked')}</span>
                          ) : channel.status === 'partial' ? (
                            <span className="text-yellow-400 text-[10px]">{t('iptv.not24_7')}</span>
                          ) : (
                            <span className="flex items-center gap-1 text-green-400 text-[10px]">
                              <Signal size={8} />
                              {t('iptv.live')}
                            </span>
                          )}
                          {channel.quality !== 'SD' && (
                            <span className="text-gray-600 text-[10px]">{channel.quality}</span>
                          )}
                        </div>
                      </div>

                      {/* Active indicator */}
                      {activeChannel?.id === channel.id && (
                        <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              ))}

              {filteredChannels.length === 0 && (
                <div className="text-center py-12">
                  <Tv size={40} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">{t('iptv.noChannels')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Channel Transition Overlay */}
      <ChannelTransition channel={activeChannel} isVisible={showTransition} />

      {/* Admin Panel Modal */}
      {showAdminPanel && isAdmin && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}

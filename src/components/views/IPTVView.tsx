'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useViewStore, useAuthStore } from '@/lib/store';
import { Radio, Play, Pause, Volume2, VolumeX, Maximize, Minimize, ChevronUp, ChevronDown, Loader2, Tv, ArrowLeft, RefreshCw, Signal, WifiOff, Cast, ShieldCheck, Activity, Shield } from 'lucide-react';
import Hls from 'hls.js';
import { useChromecast } from '@/hooks/use-chromecast';
import { useT } from '@/lib/i18n';
import dynamic from 'next/dynamic';
const AdminPanel = dynamic(() => import('@/components/guardian/AdminPanel'), { ssr: false });

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
    title: 'Mundo',
    items: [
      { id: 'spa', label: 'Todo Español', flag: '🌐' },
      { id: 'latam', label: 'Latinoamérica', flag: '🌎' },
    ],
  },
  {
    title: 'Países',
    items: [
      { id: 'co', label: 'Colombia', flag: '🇨🇴' },
      { id: 'mx', label: 'México', flag: '🇲🇽' },
      { id: 'ar', label: 'Argentina', flag: '🇦🇷' },
      { id: 'es', label: 'España', flag: '🇪🇸' },
      { id: 'cl', label: 'Chile', flag: '🇨🇱' },
      { id: 've', label: 'Venezuela', flag: '🇻🇪' },
      { id: 'pe', label: 'Perú', flag: '🇵🇪' },
      { id: 'bo', label: 'Bolivia', flag: '🇧🇴' },
      { id: 'ec', label: 'Ecuador', flag: '🇪🇨' },
      { id: 'cu', label: 'Cuba', flag: '🇨🇺' },
      { id: 'do', label: 'Rep. Dominicana', flag: '🇩🇴' },
      { id: 'gt', label: 'Guatemala', flag: '🇬🇹' },
      { id: 'hn', label: 'Honduras', flag: '🇭🇳' },
      { id: 'sv', label: 'El Salvador', flag: '🇸🇻' },
      { id: 'ni', label: 'Nicaragua', flag: '🇳🇮' },
      { id: 'cr', label: 'Costa Rica', flag: '🇨🇷' },
      { id: 'pa', label: 'Panamá', flag: '🇵🇦' },
      { id: 'py', label: 'Paraguay', flag: '🇵🇾' },
      { id: 'uy', label: 'Uruguay', flag: '🇺🇾' },
      { id: 'pr', label: 'Puerto Rico', flag: '🇵🇷' },
    ],
  },
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
  const [selectedPlaylist, setSelectedPlaylist] = useState('co');
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

  // Admin state
  const { username } = useAuthStore();
  const isAdmin = username === 'admin';
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

          // Start verification in background
          const allVerified = await verifyChannels(chs, abortController.signal);

          if (abortController.signal.aborted) return;

          if (allVerified && allVerified.size > 0) {
            // Filter to only verified working channels
            const workingChs = chs.filter(c => allVerified.has(c.url));
            setOnlineChannels(workingChs);
            setFilteredChannels(workingChs);

            if (workingChs.length > 0) {
              setCurrentIndex(0);
              setActiveChannel(workingChs[0]);
              setIsChannelLoading(true);
              setChannelError(false);
              setRetryCount(0);
            }
          } else {
            // Fallback: use non-offline channels if verification returned nothing
            const online = chs.filter(c => c.status !== 'offline');
            setOnlineChannels(online);
            setFilteredChannels(online);

            if (online.length > 0) {
              setCurrentIndex(0);
              setActiveChannel(online[0]);
              setIsChannelLoading(true);
              setChannelError(false);
              setRetryCount(0);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching IPTV:', err);
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingPlaylist(false);
        }
      }
    };
    fetchChannels();

    return () => {
      if (verifyAbortRef.current) {
        verifyAbortRef.current.abort();
      }
    };
  }, [selectedPlaylist, verifyChannels]);

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
  }, [activeChannel?.id, cast.isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [activeChannel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [showChannelList, searchQuery, isFullscreen, currentIndex, onlineChannels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = useCallback(() => {
    if (onlineChannels.length === 0) return;
    const next = (currentIndex + 1) % onlineChannels.length;
    setCurrentIndex(next);
    setActiveChannel(onlineChannels[next]);
    setRetryCount(0);
  }, [currentIndex, onlineChannels]);

  const goPrev = useCallback(() => {
    if (onlineChannels.length === 0) return;
    const prev = (currentIndex - 1 + onlineChannels.length) % onlineChannels.length;
    setCurrentIndex(prev);
    setActiveChannel(onlineChannels[prev]);
    setRetryCount(0);
  }, [currentIndex, onlineChannels]);

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

  // Move mouse to show info
  const handleMouseMove = () => {
    setShowInfo(true);
    if (infoTimeout) clearTimeout(infoTimeout);
    const timeout = setTimeout(() => setShowInfo(false), 4000);
    setInfoTimeout(timeout);
  };

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
      onClick={handleMouseMove}
    >
      {/* Video player - fills entire screen */}
      <div className="flex-1 relative bg-black">
        {/* Loading / Verifying playlist */}
        {(loadingPlaylist || isVerifying) && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-black">
            <div className="flex flex-col items-center gap-4 max-w-sm text-center px-4">
              <Loader2 size={48} className="text-red-500 animate-spin" />
              {isVerifying ? (
                <>
                  <p className="text-gray-400 text-lg">{t('iptv.verifying')}</p>
                  <p className="text-gray-500 text-sm">
                    {t('iptv.checking', { checked: verifyProgress.checked, total: verifyProgress.total })}
                  </p>
                  {/* Progress bar */}
                  <div className="w-full max-w-xs h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${verifyProgress.total > 0 ? (verifyProgress.checked / verifyProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-gray-600 text-xs">
                    {t('iptv.onlyWorking')}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-400 text-lg">{t('iptv.loading')}</p>
                  <p className="text-gray-600 text-sm">{t('iptv.loadingFrom')}</p>
                </>
              )}
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
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          {/* Channel info gradient */}
          <div className="bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-16 pb-4 px-4 sm:px-8">
            <div className="max-w-[1400px] mx-auto flex items-center gap-4 sm:gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {activeChannel.logo ? (
                  <img
                    src={activeChannel.logo}
                    alt={activeChannel.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-contain bg-white/5 p-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/5 flex items-center justify-center">
                    <Tv size={32} className="text-gray-500" />
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
                <h2 className="text-white text-xl sm:text-2xl font-bold truncate">{activeChannel.name}</h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  {t('iptv.channel')} {currentIndex + 1} {t('iptv.of')} {onlineChannels.length}
                  {isActivelyCasting && (
                    <span className="text-green-400 ml-2">{t('iptv.castingOn', { device: cast.device?.friendlyName || '' })}</span>
                  )}
                </p>
              </div>

              {/* Controls hint */}
              <div className="hidden sm:flex flex-col items-end gap-1 text-gray-600 text-[10px] shrink-0">
                <span>{t('iptv.controls.changeChannel')}</span>
                <span>{t('iptv.controls.mute')}</span>
                <span>{t('iptv.controls.pause')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TOP CONTROL BAR ===== */}
      {showInfo && !loadingPlaylist && (
        <div className="absolute top-0 left-0 right-0 z-20">
          <div className="bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-4 pb-8 px-4">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between">
              {/* Left: Back button + logo */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView('home')}
                  className="pointer-events-auto p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <Radio size={20} className="text-green-500" />
                  <span className="text-white font-bold">IPTV</span>
                  {/* Admin: siempre visible. No-admin: solo si scheduler inicializado */}
                  {isAdmin ? (
                    <button
                      onClick={() => setShowAdminPanel(true)}
                      className="pointer-events-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 ml-1 hover:bg-emerald-500/30 cursor-pointer transition-colors"
                      title="Abrir Panel Admin"
                    >
                      <Shield size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 text-[11px] font-bold">Admin</span>
                    </button>
                  ) : guardianStatus && guardianStatus.scheduler.initialized ? (
                    <span className="pointer-events-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 ml-1">
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

              {/* Center: Playback controls */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={goPrev}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                  title={t('iptv.prevChannel')}
                >
                  <ChevronUp size={20} />
                </button>

                <button
                  onClick={togglePause}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                  title={isPaused ? t('iptv.resume') : t('iptv.pause')}
                >
                  {isPaused ? <Play size={18} fill="white" /> : <Pause size={18} />}
                </button>

                <button
                  onClick={goNext}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                  title={t('iptv.nextChannel')}
                >
                  <ChevronDown size={20} />
                </button>

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
              </div>

              {/* Right: Cast + Channel list */}
              <div className="flex items-center gap-2 pointer-events-auto">
                {/* Chromecast button */}
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
                    className={`p-2 rounded-full transition-all ${
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
                  <span className="hidden sm:inline">{t('iptv.channels')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick channel up/down buttons at sides */}
      {showInfo && !loadingPlaylist && (
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
            className="w-full max-w-md bg-gray-950 border-l border-white/10 flex flex-col"
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
                  className="text-gray-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Playlist selector - organized by sections */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="max-h-[45vh] overflow-y-auto space-y-3 pr-1">
                {PLAYLIST_SECTIONS.map(section => (
                  <div key={section.title}>
                    <h4 className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                      {section.title}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {section.items.map(pl => (
                        <button
                          key={pl.id}
                          onClick={() => { setSelectedPlaylist(pl.id); setShowChannelList(false); }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                            selectedPlaylist === pl.id
                              ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {pl.flag} {pl.label}
                        </button>
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
            <div className="flex-1 overflow-y-auto">
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
      {/* Admin Panel Modal */}
      {showAdminPanel && isAdmin && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}

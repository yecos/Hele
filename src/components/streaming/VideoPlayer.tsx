'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore, useHistoryStore, useViewStore } from '@/lib/store';
import { LANG_LABELS, SERVER_ICONS, TMDB_SERVERS, LATINO_SERVERS, SUBTITLED_SERVERS, type StreamSource, type ServerGroup, type AudioLang } from '@/lib/sources';
import { X, Loader2, MonitorPlay, AlertTriangle, Globe, Download, ChevronLeft, ChevronRight, Cast, Tv, Wifi, Settings, Check, WifiOff, Signal } from 'lucide-react';
import { useChromecast } from '@/hooks/use-chromecast';
import { useT } from '@/lib/i18n';

// Types for server probing
interface ServerProbe {
  id: string;
  available: boolean;
  latency: number;
  reason?: string;
}

function buildServerGroups(
  tmdbId: number,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): ServerGroup[] {
  const makeGroup = (lang: AudioLang, label: string, servers: typeof TMDB_SERVERS): ServerGroup => ({
    lang,
    label,
    sources: servers.map(s => ({
      id: `${s.id}-${lang}`,
      name: s.name,
      server: s.id,
      url: s.getUrl(tmdbId, type, season, episode),
      lang,
      quality: 'HD' as const,
      type: 'stream' as const,
      mode: 'embed' as const,
    })),
  });

  return [
    // Latino primero — audio en español
    makeGroup('latino', LANG_LABELS.latino, LATINO_SERVERS),
    // Subtitulado — audio original con subtítulos
    makeGroup('subtitulada', LANG_LABELS.subtitulada, SUBTITLED_SERVERS),
  ];
}

export function VideoPlayer() {
  const { t } = useT();
  const {
    isPlaying, currentMovie, currentDetail, currentSeason, currentEpisode,
    currentServerUrl, currentServerName, currentLang,
    serverGroups, isLoadingServers,
    closePlayer, selectServer, selectLang, setServerGroups, setDetail,
    playEpisode,
  } = usePlayerStore();
  const setView = useViewStore(s => s.setView);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const [availableLangs, setAvailableLangs] = useState<AudioLang[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [castBannerDismissed, setCastBannerDismissed] = useState(false);
  const [castTried, setCastTried] = useState(false);

  // Probe state
  const [isProbing, setIsProbing] = useState(false);
  const [probeResults, setProbeResults] = useState<Record<string, ServerProbe>>({});
  const [showUnavailable, setShowUnavailable] = useState(false);

  const cast = useChromecast();
  const isActivelyCasting = cast.isConnected;
  const supportsEmbedOnTV = cast.castMode === 'custom';

  // Probe servers to check availability
  const probeServers = useCallback(async (tmdbId: number, type: 'movie' | 'tv', season?: number, episode?: number) => {
    setIsProbing(true);
    setProbeResults({});

    // Set initial "checking" state for all servers
    const initial: Record<string, ServerProbe> = {};
    TMDB_SERVERS.forEach(s => {
      initial[s.id] = { id: s.id, available: false, latency: 0, reason: 'checking' };
    });
    setProbeResults(initial);

    try {
      const res = await fetch('/api/probe-servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId, type, season, episode }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.servers && Array.isArray(data.servers)) {
          const results: Record<string, ServerProbe> = {};
          data.servers.forEach((s: ServerProbe) => {
            results[s.id] = s;
          });
          setProbeResults(results);

          // Auto-switch to fastest available if current server is unavailable
          if (currentServerUrl) {
            const currentServerId = currentServerUrl.includes('vidsrc.pm') ? 'vidsrc-pm'
              : currentServerUrl.includes('vidsrc.to') ? 'vidsrc-to'
              : currentServerUrl.includes('vidsrc.io') ? 'vidsrc-io'
              : currentServerUrl.includes('vidsrc.dev') ? 'vidsrc-dev'
              : currentServerUrl.includes('vidsrc.pro') ? 'vidsrc-pro'
              : currentServerUrl.includes('vidsrc.xyz') ? 'vidsrc-xyz'
              : currentServerUrl.includes('vidlink') ? 'vidlink'
              : currentServerUrl.includes('embed.su') ? 'embed-su'
              : currentServerUrl.includes('smashystream') ? 'smashystream'
              : currentServerUrl.includes('2embed') ? '2embed'
              : currentServerUrl.includes('cinesrc') ? 'cinesrc'
              : currentServerUrl.includes('moviesapi.club') ? 'moviesapi-club'
              : currentServerUrl.includes('moviesapi') ? 'moviesapi'
              : '';

            if (currentServerId && results[currentServerId] && !results[currentServerId].available) {
              // Current server is down, find the fastest available
              const fastest = data.servers
                .filter((s: ServerProbe) => s.available)
                .sort((a: ServerProbe, b: ServerProbe) => a.latency - b.latency)[0];

              if (fastest) {
                const lang = currentLang;
                const url = TMDB_SERVERS.find(s => s.id === fastest.id)?.getUrl(tmdbId, type, season, episode);
                if (url) {
                  selectServer({
                    id: `${fastest.id}-${lang}`,
                    name: TMDB_SERVERS.find(s => s.id === fastest.id)?.name || fastest.id,
                    server: fastest.id,
                    url,
                    lang,
                    quality: 'HD',
                    type: 'stream',
                    mode: 'embed',
                  });
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error probing servers:', err);
      // On probe failure, show all servers (fallback)
      const fallback: Record<string, ServerProbe> = {};
      TMDB_SERVERS.forEach(s => {
        fallback[s.id] = { id: s.id, available: true, latency: 0 };
      });
      setProbeResults(fallback);
    } finally {
      setIsProbing(false);
    }
  }, [currentServerUrl, currentLang, selectServer]);

  // Fetch servers when movie changes
  const fetchServers = useCallback(async () => {
    if (!isPlaying || !currentMovie) return;

    setLoadingProgress(true);
    setIframeError(false);

    try {
      const type = currentMovie.mediaType as 'movie' | 'tv';

      // 1. Fetch movie detail for metadata
      try {
        const detailRes = await fetch(`/api/tmdb?endpoint=/${type}/${currentMovie.tmdbId}&append_to_response=videos,similar,credits`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setDetail(detailData);
        }
      } catch (err) {
        console.error('Error fetching detail:', err);
      }

      // 2. Build server groups from centralized sources
      const groups = buildServerGroups(
        currentMovie.tmdbId,
        type,
        type === 'tv' ? currentSeason : undefined,
        type === 'tv' ? currentEpisode : undefined
      );

      setServerGroups(groups);
      setAvailableLangs(groups.map(g => g.lang));

      // Auto-select first server of first group
      if (groups.length > 0 && groups[0].sources.length > 0) {
        const firstSource = groups[0].sources[0];
        selectServer(firstSource);
      }

      // 3. Probe servers in background
      probeServers(
        currentMovie.tmdbId,
        type,
        type === 'tv' ? currentSeason : undefined,
        type === 'tv' ? currentEpisode : undefined
      );
    } catch (err) {
      console.error('Error fetching servers:', err);
    } finally {
      setLoadingProgress(false);
    }
  }, [isPlaying, currentMovie?.id, currentSeason, currentEpisode]);  

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Change iframe when server URL changes
  useEffect(() => {
    if (currentServerUrl) {
      setIframeError(false);
      setLoadingProgress(true);
      setIframeKey(k => k + 1);
      setCastTried(false);
      setCastBannerDismissed(false);
      if (currentMovie) {
        try {
          localStorage.setItem(`xs-working-${currentMovie.id}`, currentServerUrl);
        } catch {}
      }
    }
  }, [currentServerUrl, currentMovie?.id]);

  // Auto-cast to Chromecast when connected and server URL changes
  useEffect(() => {
    if (isPlaying && currentServerUrl && cast.isConnected && !castTried && !cast.isCasting) {
      const title = currentMovie?.title || t('player.loadingServer');
      const subtitle = currentMovie?.mediaType === 'tv'
        ? `T${String(currentSeason).padStart(2,'0')}E${String(currentEpisode).padStart(2,'0')}`
        : '';

      setCastTried(true);

      if (supportsEmbedOnTV) {
        cast.castEmbed(currentServerUrl, title, subtitle).then((success) => {
          if (!success) setCastBannerDismissed(false);
        });
      } else {
        setCastBannerDismissed(false);
      }
    }
  }, [currentServerUrl, cast.isConnected, isPlaying, castTried, supportsEmbedOnTV]);  

  // Block popups from embed servers (ads/new tabs)
  useEffect(() => {
    if (!isPlaying) return;
    const originalOpen = window.open;
    window.open = (...args: Parameters<typeof window.open>) => {
      console.log('[Hele] Popup blocked:', args[0]);
      return null;
    };
    return () => { window.open = originalOpen; };
  }, [isPlaying]);

  // Track watch history when movie starts playing
  useEffect(() => {
    if (isPlaying && currentMovie && currentServerUrl) {
      const history = useHistoryStore.getState();
      history.addToHistory({
        movieId: currentMovie.id,
        title: currentMovie.title,
        posterUrl: currentMovie.posterUrl,
        mediaType: currentMovie.mediaType as 'movie' | 'tv',
        progress: 0,
        duration: 0,
      });
    }
  }, [isPlaying && currentMovie?.id && currentServerUrl]);  

  const currentGroupSources = serverGroups.find(g => g.lang === currentLang)?.sources || [];
  const hasMultipleLangs = availableLangs.length > 1;
  const showCastBanner = cast.isConnected && cast.castError && !castBannerDismissed && !cast.isCasting;

  // Filter sources by probe availability
  const filteredSources = showUnavailable
    ? currentGroupSources
    : currentGroupSources.filter(s => {
        const probe = probeResults[s.server];
        // If still probing or probe says available, show it
        return !probe || probe.available || probe.reason === 'checking';
      });

  // Count stats
  const workingCount = Object.values(probeResults).filter(p => p.available).length;
  const totalProbed = Object.values(probeResults).filter(p => p.reason !== 'checking').length;

  if (!isPlaying || !currentMovie) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={closePlayer}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X size={20} />
          </button>
          <div className="text-white">
            <h2 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-[400px]">{currentMovie.title}</h2>
            <p className="text-xs text-gray-400">
              {currentServerName || t('player.loadingServer')}
              {currentMovie.mediaType === 'tv' && ` - T${String(currentSeason).padStart(2,'0')}E${String(currentEpisode).padStart(2,'0')}`}
              {cast.isConnected && cast.isCasting && (
                <span className="text-green-400 ml-2">{cast.statusMessage}</span>
              )}
            </p>
          </div>
        </div>

        {/* Cast button */}
        <button
            onClick={async () => {
              if (isActivelyCasting) {
                cast.disconnect();
              } else if (currentServerUrl) {
                const subtitle = currentMovie.mediaType === 'tv'
                  ? `T${String(currentSeason).padStart(2,'0')}E${String(currentEpisode).padStart(2,'0')}`
                  : '';
                if (!cast.isConnected) {
                  const connected = await cast.connect();
                  if (connected && supportsEmbedOnTV) {
                    cast.castEmbed(currentServerUrl, currentMovie.title, subtitle);
                  }
                } else {
                  cast.castEmbed(currentServerUrl, currentMovie.title, subtitle).then(() => {
                    setCastBannerDismissed(false);
                  });
                }
              } else {
                cast.connect();
              }
            }}
            className={`p-2 rounded-full transition-all ${
              cast.status === 'connected'
                ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                : cast.status === 'connecting'
                ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={cast.statusMessage || (cast.isConnected ? t('player.disconnectFrom', { device: cast.device?.friendlyName }) : t('player.sendToChromecast'))}
          >
            <Cast size={20} />
          </button>
      </div>

      {/* Chromecast connection banner */}
      {cast.isConnected && !cast.isCasting && !showCastBanner && (
        <div className="absolute top-14 left-0 right-0 z-[15] bg-green-600/90 backdrop-blur-sm px-4 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white text-xs">
            <Wifi size={12} />
            <span>{t('player.connectedTo')} <b>{cast.device?.friendlyName || 'Chromecast'}</b></span>
          </div>
          <button onClick={() => cast.disconnect()} className="text-white/80 hover:text-white text-xs">
            {t('player.disconnect')}
          </button>
        </div>
      )}

      {/* Chromecast warning banner */}
      {showCastBanner && (
        <div className="absolute top-14 left-0 right-0 z-[15] bg-amber-600/95 backdrop-blur-sm px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Cast size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">
                {supportsEmbedOnTV
                  ? t('player.castErrorTitle')
                  : t('player.notCompatible', { device: cast.device?.friendlyName || 'Chromecast' })}
              </p>
              <p className="text-white/80 text-xs mt-0.5 leading-relaxed">
                {supportsEmbedOnTV
                  ? t('player.castErrorMsg')
                  : t('player.embedNotSupported')}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  onClick={() => setCastBannerDismissed(true)}
                  className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full transition-all"
                >
                  {t('player.understood')}
                </button>
                <button
                  onClick={() => { cast.disconnect(); setCastBannerDismissed(true); }}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white/80 px-3 py-1 rounded-full transition-all"
                >
                  {t('player.disconnect')}
                </button>
                {!supportsEmbedOnTV && (
                  <button
                    onClick={() => { closePlayer(); setView('settings'); }}
                    className="text-xs bg-white/10 hover:bg-white/20 text-white/80 px-3 py-1 rounded-full transition-all flex items-center gap-1"
                  >
                    <Settings size={10} />
                    {t('player.configReceiver')}
                  </button>
                )}
                <button
                  onClick={() => { closePlayer(); setView('iptv'); }}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white/80 px-3 py-1 rounded-full transition-all flex items-center gap-1"
                >
                  <Tv size={10} />
                  {t('player.tryIPTV')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Casting overlay */}
      {cast.isCasting && (
        <div className="absolute inset-0 z-[12] bg-black/95 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-600/50 flex items-center justify-center mx-auto animate-pulse">
              <Cast size={36} className="text-red-500" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">{t('player.playingOnTV')}</p>
              <p className="text-gray-400 text-sm mt-1">{cast.device?.friendlyName || 'Chromecast'}</p>
            </div>
            {currentMovie && (
              <p className="text-gray-500 text-xs max-w-xs mx-auto">
                {currentMovie.title}
                {currentMovie.mediaType === 'tv' && ` — T${String(currentSeason).padStart(2,'0')}E${String(currentEpisode).padStart(2,'0')}`}
              </p>
            )}
            <button
              onClick={() => cast.disconnect()}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-all"
            >
              {t('player.stopAndWatchPC')}
            </button>
          </div>
        </div>
      )}

      {/* Player area */}
      <div className="flex-1 relative bg-black">
        {loadingProgress && !cast.isCasting && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={40} className="text-red-500 animate-spin" />
              <p className="text-gray-400 text-sm">{t('player.loadingServer')}</p>
            </div>
          </div>
        )}

        {iframeError && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/90">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <AlertTriangle size={40} className="text-yellow-500" />
              <p className="text-white font-semibold">{t('player.serverUnavailable')}</p>
              <p className="text-gray-400 text-sm">{t('player.tryAnother')}</p>
            </div>
          </div>
        )}

        {!currentServerUrl && !loadingProgress && !cast.isCasting && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <MonitorPlay size={48} className="text-gray-600" />
              <p className="text-gray-400">{t('player.selectServer')}</p>
            </div>
          </div>
        )}

        {currentServerUrl && !cast.isCasting && (
          <div className="absolute inset-0 overflow-hidden">
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={currentServerUrl}
              className="w-[103%] h-[103%] border-0 -ml-[1.5%] -mt-[1.5%]"
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
              onLoad={() => {
                setLoadingProgress(false);
                setIframeError(false);
              }}
              onError={() => {
                setLoadingProgress(false);
                const nextAvailable = filteredSources.find(s => s.url !== currentServerUrl);
                if (nextAvailable) {
                  selectServer(nextAvailable);
                  setIframeError(false);
                } else {
                  setIframeError(true);
                }
              }}
            />
            {/* Edge overlays */}
            <div className="absolute inset-0 pointer-events-none z-10"
              style={{
                boxShadow: 'inset 0 45px 60px -30px rgba(0,0,0,0.95), inset 0 -45px 60px -30px rgba(0,0,0,0.95), inset 30px 0 60px -30px rgba(0,0,0,0.95), inset -30px 0 60px -30px rgba(0,0,0,0.95)',
              }}
            />
            {/* Click-blocker at corners */}
            <div className="absolute top-0 left-0 w-16 h-8 z-20" />
            <div className="absolute top-0 right-0 w-16 h-8 z-20" />
            <div className="absolute bottom-0 left-0 w-16 h-8 z-20" />
            <div className="absolute bottom-0 right-0 w-16 h-8 z-20" />
          </div>
        )}
      </div>

      {/* Server selection panel */}
      <div className="bg-gradient-to-t from-black to-gray-900/95 border-t border-white/5">
        {/* Language tabs */}
        {hasMultipleLangs && (
          <div className="flex items-center gap-1 px-4 pt-3 pb-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {availableLangs.map(lang => (
              <button
                key={lang}
                onClick={() => selectLang(lang)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  currentLang === lang
                    ? 'bg-red-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
        )}

        {/* Server list */}
        <div className="px-4 py-3">
          {/* Server header with probe status */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
              <Globe size={12} />
              {t('player.servers')} {LANG_LABELS[currentLang] && `(${currentLang})`}
              {isProbing && (
                <span className="flex items-center gap-1 text-yellow-400 normal-case">
                  <Loader2 size={10} className="animate-spin" />
                  Verificando...
                </span>
              )}
              {!isProbing && workingCount > 0 && (
                <span className="flex items-center gap-1 text-green-400 normal-case">
                  <Signal size={10} />
                  {workingCount}/{TMDB_SERVERS.length}
                </span>
              )}
            </h3>

            {/* Toggle to show/hide unavailable servers */}
            {!isProbing && totalProbed > 0 && (
              <button
                onClick={() => setShowUnavailable(!showUnavailable)}
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showUnavailable ? 'Ocultar caídos' : 'Ver todos'}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {filteredSources.map(source => {
              const probe = probeResults[source.server];
              const isChecking = probe?.reason === 'checking';
              const isAvailable = probe?.available;
              const isUnavailable = probe && !probe.available && probe.reason !== 'checking';
              const latency = probe?.latency;

              return (
                <button
                  key={source.id}
                  onClick={() => !isUnavailable && selectServer(source)}
                  disabled={isUnavailable}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentServerUrl === source.url
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                      : isUnavailable
                      ? 'bg-white/[0.02] text-gray-600 line-through opacity-40 cursor-not-allowed'
                      : isChecking
                      ? 'bg-white/5 text-gray-400'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                  title={isUnavailable ? `No disponible: ${probe?.reason}` : isAvailable ? `${latency}ms` : undefined}
                >
                  <span className="text-base">{SERVER_ICONS[source.server] || SERVER_ICONS.default}</span>
                  <span>{source.name}</span>

                  {/* Status indicator */}
                  {isChecking && (
                    <Loader2 size={12} className="text-yellow-400 animate-spin" />
                  )}
                  {isAvailable && !isChecking && (
                    <Check size={12} className="text-green-400" />
                  )}
                  {isUnavailable && (
                    <WifiOff size={12} className="text-red-400/50" />
                  )}

                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                    {isUnavailable ? '--' : source.quality}
                  </span>

                  {/* Latency badge for working servers */}
                  {isAvailable && !isChecking && latency && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      latency < 2000
                        ? 'bg-green-500/20 text-green-400'
                        : latency < 5000
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {latency < 1000 ? `${latency}ms` : `${(latency / 1000).toFixed(1)}s`}
                    </span>
                  )}

                  {source.type === 'download' && (
                    <Download size={12} className="ml-1" />
                  )}
                </button>
              );
            })}

            {/* Show unavailable count when hidden */}
            {!showUnavailable && !isProbing && workingCount < TMDB_SERVERS.length && (
              <div className="flex items-center gap-1 px-3 py-2 text-gray-600 text-xs">
                <WifiOff size={12} />
                +{TMDB_SERVERS.length - workingCount} no disponibles
              </div>
            )}

            {isLoadingServers && (
              <div className="flex items-center gap-2 px-3 py-2 text-gray-500 text-sm">
                <Loader2 size={14} className="animate-spin" />
                {t('player.loading')}
              </div>
            )}
          </div>
        </div>

        {/* Episode navigation for TV shows */}
        {currentMovie.mediaType === 'tv' && currentDetail && (
          <div className="flex items-center justify-center gap-3 px-4 pb-4">
            <button
              onClick={() => currentEpisode > 1 && playEpisode(currentSeason, currentEpisode - 1)}
              disabled={currentEpisode <= 1}
              className="px-4 py-2 rounded-xl bg-white/5 text-sm text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} className="inline mr-1" />
              {t('player.previous')}
            </button>
            <span className="text-white text-sm font-semibold px-4">
              T{String(currentSeason).padStart(2,'0')}E{String(currentEpisode).padStart(2,'0')}
            </span>
            <button
              onClick={() => {
                const maxEp = currentDetail.number_of_episodes || 20;
                if (currentEpisode < maxEp) playEpisode(currentSeason, currentEpisode + 1);
              }}
              className="px-4 py-2 rounded-xl bg-white/5 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-all"
            >
              {t('player.next')}
              <ChevronRight size={16} className="inline ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

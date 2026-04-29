'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore, useHistoryStore, useViewStore } from '@/lib/store';
import { LANG_LABELS, SERVER_ICONS, TMDB_SERVERS, type StreamSource, type ServerGroup, type AudioLang } from '@/lib/sources';
import { X, Loader2, MonitorPlay, AlertTriangle, Globe, Download, ChevronLeft, ChevronRight, Cast, Tv, Wifi, Settings } from 'lucide-react';
import { useChromecast } from '@/hooks/use-chromecast';
import { useT } from '@/lib/i18n';

function buildServerGroups(
  tmdbId: number,
  type: 'movie' | 'tv',
  labels: { subtitulada: string; latino: string },
  season?: number,
  episode?: number
): ServerGroup[] {
  const langSources = (lang: AudioLang, label: string): ServerGroup => ({
    lang,
    label,
    sources: TMDB_SERVERS.map(s => ({
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
    langSources('subtitulada', labels.subtitulada),
    langSources('latino', labels.latino),
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

  const cast = useChromecast();
  const isActivelyCasting = cast.isConnected;
  const supportsEmbedOnTV = cast.castMode === 'custom';

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
        { subtitulada: t('player.subtitulado'), latino: t('player.latino') },
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
    } catch (err) {
      console.error('Error fetching servers:', err);
    } finally {
      setLoadingProgress(false);
    }
  }, [isPlaying, currentMovie?.id, currentSeason, currentEpisode]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Remember working server
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
        // Custom receiver — embed URLs work on TV
        cast.castEmbed(currentServerUrl, title, subtitle).then((success) => {
          if (!success) setCastBannerDismissed(false);
        });
      } else {
        // Default receiver — embeds don't work, show warning
        setCastBannerDismissed(false);
      }
    }
  }, [currentServerUrl, cast.isConnected, isPlaying, castTried, supportsEmbedOnTV]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [isPlaying && currentMovie?.id && currentServerUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentGroupSources = serverGroups.find(g => g.lang === currentLang)?.sources || [];
  const hasMultipleLangs = availableLangs.length > 1;

  // Show cast error banner?
  const showCastBanner = cast.isConnected && cast.castError && !castBannerDismissed && !cast.isCasting;

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

      {/* Chromecast warning banner — different messages based on cast mode */}
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

      {/* Casting overlay — when content IS successfully being sent to TV */}
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
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={currentServerUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-autoplay allow-fullscreen allow-encrypted-media allow-presentation"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowTransparency
            referrerPolicy="no-referrer"
            onLoad={() => {
              setLoadingProgress(false);
              setIframeError(false);
            }}
            onError={() => {
              setLoadingProgress(false);
              // Auto-try next server
              const currentIndex = currentGroupSources.findIndex(s => s.url === currentServerUrl);
              if (currentIndex >= 0 && currentIndex < currentGroupSources.length - 1) {
                const nextSource = currentGroupSources[currentIndex + 1];
                selectServer(nextSource);
                setIframeError(false);
              } else {
                setIframeError(true);
              }
            }}
          />
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
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
            <Globe size={12} />
            {t('player.servers')} {LANG_LABELS[currentLang] && `(${currentLang})`}
          </h3>
          <div className="flex flex-wrap gap-2">
            {currentGroupSources.map(source => (
              <button
                key={source.id}
                onClick={() => selectServer(source)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  currentServerUrl === source.url
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-base">{SERVER_ICONS[source.server] || SERVER_ICONS.default}</span>
                <span>{source.name}</span>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">{source.quality}</span>
                {source.type === 'download' && (
                  <Download size={12} className="ml-1" />
                )}
              </button>
            ))}

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

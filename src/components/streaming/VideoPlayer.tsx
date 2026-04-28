'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/lib/store';
import { getTMDBFallbackSources, LANG_LABELS, SERVER_ICONS, type StreamSource, type ServerGroup } from '@/lib/sources';
import type { AudioLang } from '@/lib/sources';
import { X, Loader2, MonitorPlay, AlertTriangle, Globe, Download, ChevronLeft, ChevronRight } from 'lucide-react';

export function VideoPlayer() {
  const {
    isPlaying, currentMovie, currentDetail, currentSeason, currentEpisode,
    currentServerUrl, currentServerName, currentLang,
    serverGroups, isLoadingServers,
    closePlayer, selectServer, selectLang, setServerGroups, setDetail,
    playEpisode,
  } = usePlayerStore();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const [availableLangs, setAvailableLangs] = useState<AudioLang[]>(['latino']);
  const [loadingProgress, setLoadingProgress] = useState(true);

  // Fetch servers when movie changes
  const fetchServers = useCallback(async () => {
    if (!isPlaying || !currentMovie) return;

    setLoadingProgress(true);
    setIframeError(false);

    try {
      const type = currentMovie.mediaType as 'movie' | 'tv';

      // 1. Fetch movie detail for metadata
      let detailData: any = null;
      try {
        const detailRes = await fetch(`/api/tmdb?endpoint=/${type}/${currentMovie.tmdbId}&append_to_response=videos,similar,credits`);
        if (detailRes.ok) {
          detailData = await detailRes.json();
          setDetail(detailData);
        }
      } catch (err) {
        console.error('Error fetching detail:', err);
      }

      // 2. Build server groups with working TMDB servers
      const groups: ServerGroup[] = [];
      const seenLangs = new Set<AudioLang>();

      // Always add TMDB servers as primary source
      const fallback = getTMDBFallbackSources(
        currentMovie.tmdbId,
        type,
        type === 'tv' ? currentSeason : undefined,
        type === 'tv' ? currentEpisode : undefined
      );
      groups.push(fallback);
      seenLangs.add('latino');

      // Also add English/subbed servers
      const subbedGroup: ServerGroup = {
        lang: 'subtitulada',
        label: 'Servidores Subtitulados',
        sources: [
          {
            id: 'vidlink-sub',
            name: 'VidLink',
            server: 'vidlink',
            url: type === 'movie'
              ? `https://vidlink.pro/movie/${currentMovie.tmdbId}`
              : `https://vidlink.pro/tv/${currentMovie.tmdbId}/${currentSeason}/${currentEpisode}`,
            lang: 'subtitulada' as AudioLang,
            quality: 'Auto',
            type: 'stream' as const,
            mode: 'embed' as const,
          },
          {
            id: 'vidsrc-io-sub',
            name: 'VidSrc IO',
            server: 'vidsrc-io',
            url: type === 'movie'
              ? `https://vidsrc.io/embed/movie/${currentMovie.tmdbId}`
              : `https://vidsrc.io/embed/tv/${currentMovie.tmdbId}/${currentSeason}/${currentEpisode}`,
            lang: 'subtitulada' as AudioLang,
            quality: 'Auto',
            type: 'stream' as const,
            mode: 'embed' as const,
          },
          {
            id: 'vidsrc-pm-sub',
            name: 'VidSrc PM',
            server: 'vidsrc-pm',
            url: type === 'movie'
              ? `https://vidsrc.pm/embed/movie/${currentMovie.tmdbId}`
              : `https://vidsrc.pm/embed/tv/${currentMovie.tmdbId}/${currentSeason}/${currentEpisode}`,
            lang: 'subtitulada' as AudioLang,
            quality: 'Auto',
            type: 'stream' as const,
            mode: 'embed' as const,
          },
        ],
      };
      groups.push(subbedGroup);
      seenLangs.add('subtitulada');

      setAvailableLangs([...seenLangs]);
      setServerGroups(groups);
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
      // Remember working server
      if (currentMovie) {
        try {
          localStorage.setItem(`xs-working-${currentMovie.id}`, currentServerUrl);
        } catch {}
      }
    }
  }, [currentServerUrl, currentMovie?.id]);

  const currentGroupSources = serverGroups.find(g => g.lang === currentLang)?.sources || [];
  const hasMultipleLangs = availableLangs.length > 1;

  if (!isPlaying || !currentMovie) return null;

  const type = currentMovie.mediaType as 'movie' | 'tv';

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
              {currentServerName || 'Cargando servidor...'}
              {currentMovie.mediaType === 'tv' && ` - T${String(currentSeason).padStart(2,'0')}E${String(currentEpisode).padStart(2,'0')}`}
            </p>
          </div>
        </div>
      </div>

      {/* Player area */}
      <div className="flex-1 relative bg-black">
        {loadingProgress && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={40} className="text-red-500 animate-spin" />
              <p className="text-gray-400 text-sm">Cargando servidor...</p>
            </div>
          </div>
        )}

        {iframeError && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/90">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <AlertTriangle size={40} className="text-yellow-500" />
              <p className="text-white font-semibold">Este servidor no esta disponible</p>
              <p className="text-gray-400 text-sm">Intenta con otro servidor de la lista</p>
            </div>
          </div>
        )}

        {!currentServerUrl && !loadingProgress && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <MonitorPlay size={48} className="text-gray-600" />
              <p className="text-gray-400">Selecciona un servidor para reproducir</p>
            </div>
          </div>
        )}

        {currentServerUrl && (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={currentServerUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; autoplay; encrypted-media"
            allowTransparency
            referrerPolicy="no-referrer"
            onLoad={() => setLoadingProgress(false)}
            onError={() => { setIframeError(true); setLoadingProgress(false); }}
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
            Servidores {LANG_LABELS[currentLang] && `(${currentLang})`}
          </h3>
          <div className="flex flex-wrap gap-2">
            {currentGroupSources.map(source => (
              <button
                key={source.id}
                onClick={() => selectServer(source)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentServerUrl === source.url
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-base">{SERVER_ICONS[source.server] || SERVER_ICONS.default}</span>
                <span>{source.name}</span>
                {source.quality !== 'Auto' && source.quality !== 'HD' && (
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">{source.quality}</span>
                )}
                {source.type === 'download' && (
                  <Download size={12} className="ml-1" />
                )}
              </button>
            ))}

            {isLoadingServers && (
              <div className="flex items-center gap-2 px-3 py-2 text-gray-500 text-sm">
                <Loader2 size={14} className="animate-spin" />
                Cargando...
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
              className="px-4 py-2 rounded-lg bg-white/5 text-sm text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} className="inline mr-1" />
              Anterior
            </button>
            <span className="text-white text-sm font-semibold px-4">
              T{String(currentSeason).padStart(2,'0')}E{String(currentEpisode).padStart(2,'0')}
            </span>
            <button
              onClick={() => {
                const maxEp = currentDetail.number_of_episodes || 20;
                if (currentEpisode < maxEp) playEpisode(currentSeason, currentEpisode + 1);
              }}
              className="px-4 py-2 rounded-lg bg-white/5 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-all"
            >
              Siguiente
              <ChevronRight size={16} className="inline ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

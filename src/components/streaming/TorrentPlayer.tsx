'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Magnet,
  Upload,
  Play,
  Loader2,
  AlertCircle,
  Users,
  ArrowDown,
  ArrowUp,
  Clock,
  Film,
  Trash2,
  Search,
  Zap,
  HardDrive,
  Tv,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWebTorrent } from '@/hooks/use-webtorrent';
import { useAppStore } from '@/lib/store';

interface TorrentSearchResult {
  title: string;
  magnet: string;
  size: string;
  sizeBytes: number;
  seeders: number;
  leechers: number;
  quality: string;
  source: string;
  year?: number;
  hash?: string;
}

export default function TorrentPlayer() {
  const { selectedMovie, goBack, torrentQuery } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [magnetInput, setMagnetInput] = useState('');
  const [showInput, setShowInput] = useState(false); // Start with search view
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState(torrentQuery || '');
  const [searchResults, setSearchResults] = useState<TorrentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const {
    torrentStatus,
    addTorrent,
    addTorrentFile,
    stopTorrent,
  } = useWebTorrent();

  // Auto-search when component mounts with a query
  useEffect(() => {
    if (torrentQuery && torrentQuery.trim()) {
      setSearchQuery(torrentQuery);
      handleSearch(torrentQuery);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(async (query?: string) => {
    const q = (query || searchQuery).trim();
    if (!q || q.length < 2) return;

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const mediaType = selectedMovie?.mediaType || 'all';
      const res = await fetch(
        `/api/torrents/search?q=${encodeURIComponent(q)}&type=${mediaType}&limit=25`
      );

      if (!res.ok) {
        throw new Error('Error en la busqueda');
      }

      const data = await res.json();
      setSearchResults(data.results || []);

      if (data.results?.length === 0) {
        setSearchError('No se encontraron torrents. Intenta con otro termino.');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError('Error al buscar torrents. Verifica tu conexion.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, selectedMovie?.mediaType]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSearch();
    },
    [handleSearch]
  );

  const handleSelectTorrent = useCallback(
    (result: TorrentSearchResult) => {
      if (result.magnet) {
        addTorrent(result.magnet, videoRef.current);
        setShowInput(false);
      }
    },
    [addTorrent]
  );

  const handleMagnetSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const magnet = magnetInput.trim();
      if (magnet.startsWith('magnet:')) {
        addTorrent(magnet, videoRef.current);
        setShowInput(false);
      }
    },
    [magnetInput, addTorrent]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        addTorrentFile(file, videoRef.current);
        setShowInput(false);
      }
    },
    [addTorrentFile]
  );

  const handleClose = useCallback(() => {
    stopTorrent();
    goBack();
  }, [stopTorrent, goBack]);

  const handleBackToSearch = useCallback(() => {
    stopTorrent();
    setShowInput(true);
  }, [stopTorrent]);

  const toggleFullscreen = useCallback(() => {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatSpeed = (bytes: number) => `${formatBytes(bytes)}/s`;
  const formatTime = (ms: number) => {
    if (!ms || !isFinite(ms)) return '--';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const formatProgress = (p: number) => `${(p * 100).toFixed(1)}%`;

  const getQualityColor = (quality: string) => {
    const q = quality.toLowerCase();
    if (q.includes('4k') || q.includes('2160')) return 'text-purple-400 bg-purple-500/20';
    if (q.includes('1080')) return 'text-blue-400 bg-blue-500/20';
    if (q.includes('720')) return 'text-green-400 bg-green-500/20';
    if (q.includes('480')) return 'text-yellow-400 bg-yellow-500/20';
    if (q.includes('cam')) return 'text-red-400 bg-red-500/20';
    return 'text-gray-400 bg-gray-500/20';
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'YTS': return 'bg-green-600';
      case 'TPB': return 'bg-red-600';
      case 'SolidTorrents': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const isStreaming = torrentStatus.status === 'downloading' || torrentStatus.status === 'streaming';
  const isIdle = torrentStatus.status === 'idle';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col"
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 to-transparent p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={isIdle || showInput ? handleClose : handleBackToSearch}
          className="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm rounded-full h-9 w-9 p-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <Magnet className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-medium text-white truncate max-w-[60%]">
            {torrentStatus.status !== 'idle' && !showInput
              ? torrentStatus.fileName || 'Reproductor Torrent'
              : torrentQuery || 'Buscar Torrents'}
          </h2>
        </div>

        <div className="w-9" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center pt-14">
        {/* ── SEARCH / RESULTS VIEW ── */}
        {(isIdle || showInput) && (
          <div className="w-full max-w-2xl px-4 max-h-[calc(100vh-100px)] overflow-y-auto">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="mb-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={torrentQuery || 'Buscar pelicula, serie...'}
                    className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSearching || searchQuery.trim().length < 2}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-lg disabled:opacity-50"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>

            {/* Quick Action: Manual Input / File Upload */}
            <div className="flex gap-2 mb-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInput(false);
                  // Show manual magnet input
                  setTimeout(() => setShowInput(true), 0);
                }}
                className="flex-1 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white text-xs py-2.5 rounded-lg"
              >
                <Magnet className="h-3.5 w-3.5 mr-1.5" />
                Enlace Magnet
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".torrent"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex-1 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white text-xs py-2.5 rounded-lg"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Archivo .torrent
              </Button>
            </div>

            {/* Magnet Input (collapsible) */}
            <AnimatePresence>
              {showInput && !hasSearched && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <form onSubmit={handleMagnetSubmit} className="space-y-3">
                    <input
                      type="text"
                      value={magnetInput}
                      onChange={(e) => setMagnetInput(e.target.value)}
                      placeholder="magnet:?xt=urn:btih:..."
                      className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
                    />
                    <Button
                      type="submit"
                      disabled={!magnetInput.trim().startsWith('magnet:')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg disabled:opacity-50 text-sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Reproducir Magnet
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info Banner */}
            {selectedMovie && !hasSearched && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
                <p className="text-xs text-blue-300 flex items-start gap-2">
                  <Zap className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Buscando torrents para: <strong>{selectedMovie.title}</strong>
                    {selectedMovie.year && ` (${selectedMovie.year})`}
                    {selectedMovie.mediaType === 'tv' && ` - Serie`}
                  </span>
                </p>
              </div>
            )}

            {/* Search Results */}
            <AnimatePresence mode="wait">
              {isSearching && (
                <motion.div
                  key="searching"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-12"
                >
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  <p className="text-gray-400 text-sm">Buscando torrents...</p>
                  <p className="text-gray-600 text-xs">Consultando YTS, The Pirate Bay y SolidTorrents</p>
                </motion.div>
              )}

              {searchError && !isSearching && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3 py-12"
                >
                  <AlertCircle className="h-8 w-8 text-yellow-500" />
                  <p className="text-gray-400 text-sm">{searchError}</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={() => handleSearch()}
                      variant="outline"
                      className="border-gray-700 text-gray-300 text-sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Reintentar
                    </Button>
                  </div>
                </motion.div>
              )}

              {searchResults.length > 0 && !isSearching && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  {/* Results Header */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500">
                      {searchResults.length} torrents encontrados
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-green-500" />
                      <span className="text-[10px] text-gray-500">P2P directo en navegador</span>
                    </div>
                  </div>

                  {/* Torrent List */}
                  {searchResults.map((result, idx) => (
                    <motion.button
                      key={result.magnet || idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => handleSelectTorrent(result)}
                      className="w-full text-left px-4 py-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-blue-500/50 hover:bg-gray-900 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Quality Badge */}
                        <div className="flex-shrink-0 pt-0.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${getQualityColor(result.quality)} border-0`}
                          >
                            {result.quality}
                          </Badge>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                            {result.title}
                          </p>

                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-green-500" />
                              <span className="text-green-400">{result.seeders}</span>
                              <span>/ {result.leechers}</span>
                            </span>

                            <span className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              {result.size}
                            </span>

                            {result.year && (
                              <span>{result.year}</span>
                            )}

                            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${getSourceColor(result.source)} text-white`}>
                              {result.source}
                            </span>
                          </div>
                        </div>

                        {/* Play Icon */}
                        <div className="flex-shrink-0 self-center">
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-3.5 w-3.5 text-blue-400 fill-blue-400 ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}

                  {/* Info footer */}
                  <div className="mt-4 p-3 bg-gray-900/30 rounded-lg">
                    <p className="text-[10px] text-gray-600 space-y-1">
                      <p>El streaming P2P requiere suficientes seeders. Los torrents con mas seeders se descargan mas rapido.</p>
                      <p>Los torrents de YTS suelen tener la mejor calidad para peliculas. Soporta MP4, MKV, WebM, AVI, MOV.</p>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Empty state when no query yet */}
              {!hasSearched && !isSearching && !searchError && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  <Magnet className="h-12 w-12 text-blue-500/50" />
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-white mb-1">Streaming P2P</h3>
                    <p className="text-gray-500 text-sm max-w-sm">
                      Busca peliculas y series para reproducirlas directamente desde torrents usando la tecnologia WebTorrent
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── LOADING STATE ── */}
        {torrentStatus.status === 'loading' && !showInput && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            <div className="text-center">
              <p className="text-white font-medium">Buscando fuentes...</p>
              <p className="text-gray-400 text-sm mt-1">
                Conectando a la red de torrents
              </p>
              <p className="text-gray-600 text-xs mt-2">Buscando peers y descargando metadatos...</p>
            </div>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {torrentStatus.status === 'error' && !showInput && (
          <div className="flex flex-col items-center gap-4 px-6">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <p className="text-white font-medium">Error</p>
              <p className="text-gray-400 text-sm mt-1">{torrentStatus.error}</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleBackToSearch}
                className="bg-gray-700 hover:bg-gray-600 text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Volver
              </Button>
              <Button onClick={handleClose} variant="outline" className="border-gray-700 text-gray-300">
                Cerrar
              </Button>
            </div>
          </div>
        )}

        {/* ── VIDEO + STATS ── */}
        {isStreaming && !showInput && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              autoPlay
              playsInline
            />

            {/* Torrent Stats Overlay */}
            <AnimatePresence>
              {(torrentStatus.status === 'downloading' || torrentStatus.status === 'streaming') && (
                <motion.div
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 60, opacity: 0 }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4"
                >
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span className="truncate max-w-[60%]">{torrentStatus.fileName}</span>
                      <span className="flex-shrink-0 ml-2">{formatProgress(torrentStatus.progress)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${torrentStatus.progress * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <ArrowDown className="h-3 w-3 text-green-400" />
                      <span>{formatSpeed(torrentStatus.downloadSpeed)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowUp className="h-3 w-3 text-blue-400" />
                      <span>{formatSpeed(torrentStatus.uploadSpeed)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-yellow-400" />
                      <span>{torrentStatus.numPeers} peers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(torrentStatus.timeRemaining)}</span>
                    </div>
                    <div className="ml-auto text-gray-600">
                      {formatBytes(torrentStatus.downloaded)} / {formatBytes(torrentStatus.totalSize)}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={stopTorrent}
                      className="text-red-400 hover:bg-red-400/20 h-7 w-7 p-0 rounded-full"
                      title="Detener torrent"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {torrentStatus.status === 'streaming' && (
                    <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Reproduciendo mientras se descarga
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}

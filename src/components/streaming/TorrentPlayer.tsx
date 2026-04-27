'use client';

import { useState, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebTorrent } from '@/hooks/use-webtorrent';
import { useAppStore } from '@/lib/store';

export default function TorrentPlayer() {
  const { selectedMovie, goBack } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [magnetInput, setMagnetInput] = useState('');
  const [showInput, setShowInput] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    torrentStatus,
    addTorrent,
    addTorrentFile,
    stopTorrent,
  } = useWebTorrent();

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col"
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleClose}
          className="text-white hover:bg-white/20 bg-black/30 backdrop-blur-sm rounded-full h-9 w-9 p-0"
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-medium text-white truncate max-w-[60%]">
            {torrentStatus.fileName || 'Reproductor Torrent'}
          </h2>
        </div>

        <div className="w-9" />
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center">
        {torrentStatus.status === 'idle' && showInput ? (
          /* Input Panel */
          <div className="flex flex-col items-center gap-6 px-6 w-full max-w-lg">
            <div className="text-center">
              <Magnet className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Reproducir Torrent</h3>
              <p className="text-gray-400 text-sm">
                Ingresa un enlace magnet o sube un archivo .torrent para reproducir directamente en el navegador
              </p>
            </div>

            {/* Magnet Link Input */}
            <form onSubmit={handleMagnetSubmit} className="w-full space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={magnetInput}
                  onChange={(e) => setMagnetInput(e.target.value)}
                  placeholder="magnet:?xt=urn:btih:..."
                  className="flex-1 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
                />
                <Button
                  type="submit"
                  disabled={!magnetInput.trim().startsWith('magnet:')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-500">o</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* File Upload */}
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
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white py-6 rounded-lg"
            >
              <Upload className="h-5 w-5 mr-2" />
              Subir archivo .torrent
            </Button>

            {/* Info */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 w-full">
              <p className="text-xs text-gray-500 space-y-1">
                <p>Soporta archivos MP4, MKV, WebM, AVI, MOV</p>
                <p>El contenido se transmite directamente en el navegador mediante P2P</p>
                <p>Mientras mas seeders tenga el torrent, mas rapido sera</p>
              </p>
            </div>
          </div>
        ) : torrentStatus.status === 'loading' ? (
          /* Loading / Searching peers */
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            <div className="text-center">
              <p className="text-white font-medium">Buscando fuentes...</p>
              <p className="text-gray-400 text-sm mt-1">
                Conectando a la red de torrents
              </p>
            </div>
          </div>
        ) : torrentStatus.status === 'error' ? (
          /* Error State */
          <div className="flex flex-col items-center gap-4 px-6">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div className="text-center">
              <p className="text-white font-medium">Error</p>
              <p className="text-gray-400 text-sm mt-1">{torrentStatus.error}</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  stopTorrent();
                  setShowInput(true);
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white"
              >
                Intentar de nuevo
              </Button>
              <Button onClick={handleClose} variant="outline" className="border-gray-700 text-gray-300">
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          /* Video + Stats */
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
                      <span>{torrentStatus.fileName}</span>
                      <span>{formatProgress(torrentStatus.progress)}</span>
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
                      <Play className="h-3 w-3" />
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

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Volume2,
  VolumeX,
  Upload,
  Music,
  Link as LinkIcon,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AudioManagerState {
  audioFile: File | null;
  audioUrl: string | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  offset: number; // seconds, can be negative or positive
  syncEnabled: boolean;
  source: 'file' | 'url';
}

interface AudioManagerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  visible: boolean;
  onClose: () => void;
  isEmbedPlayer: boolean;
}

export default function AudioManager({ videoRef, visible, onClose, isEmbedPlayer }: AudioManagerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [offset, setOffset] = useState(0);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [source, setSource] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [fileName, setFileName] = useState('');

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = 'anonymous';
    }
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Sync loop: keep external audio in sync with video
  useEffect(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    if (!syncEnabled || !audioLoaded || !isPlaying) return;

    syncIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      const audio = audioRef.current;
      if (!video || !audio) return;

      const targetTime = video.currentTime + offset;
      const diff = Math.abs(audio.currentTime - targetTime);

      // If more than 1 second out of sync, jump to correct position
      if (diff > 1.0) {
        audio.currentTime = Math.max(0, targetTime);
      }
    }, 500);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [syncEnabled, audioLoaded, isPlaying, offset, videoRef]);

  // Handle video play/pause - sync external audio
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio || !audioLoaded || !syncEnabled) return;

    const handleVideoPlay = () => {
      if (!isPlaying) {
        audio.currentTime = Math.max(0, video.currentTime + offset);
        audio.play().catch(() => {});
        setIsPlaying(true);
      }
    };

    const handleVideoPause = () => {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      }
    };

    const handleVideoSeek = () => {
      if (isPlaying || syncEnabled) {
        audio.currentTime = Math.max(0, video.currentTime + offset);
      }
    };

    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('pause', handleVideoPause);
    video.addEventListener('seeked', handleVideoSeek);

    return () => {
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('pause', handleVideoPause);
      video.removeEventListener('seeked', handleVideoSeek);
    };
  }, [audioLoaded, syncEnabled, isPlaying, offset, videoRef]);

  const loadAudioFromFile = useCallback((file: File) => {
    setIsLoading(true);
    setError(null);
    setAudioFile(file);
    setSource('file');
    setFileName(file.name);

    // Revoke previous URL
    if (audioUrl) URL.revokeObjectURL(audioUrl);

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const audio = audioRef.current;
    if (audio) {
      audio.src = url;
      audio.volume = volume;
      audio.load();
      audio.onloadeddata = () => {
        setAudioLoaded(true);
        setIsLoading(false);
      };
      audio.onerror = () => {
        setError('No se pudo cargar el archivo de audio');
        setIsLoading(false);
        setAudioLoaded(false);
      };
    }
  }, [audioUrl, volume]);

  const loadAudioFromUrl = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setSource('url');
    setFileName(url.split('/').pop() || 'Audio externo');
    setAudioUrl(url);

    const audio = audioRef.current;
    if (audio) {
      audio.src = url;
      audio.crossOrigin = 'anonymous';
      audio.volume = volume;
      audio.load();
      audio.onloadeddata = () => {
        setAudioLoaded(true);
        setIsLoading(false);
      };
      audio.onerror = () => {
        setError('No se pudo cargar el audio desde la URL');
        setIsLoading(false);
        setAudioLoaded(false);
      };
    }
  }, [urlInput, volume]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadAudioFromFile(file);
  }, [loadAudioFromFile]);

  const handleTogglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioLoaded) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Start audio from current video position
      const video = videoRef.current;
      if (video) {
        audio.currentTime = Math.max(0, video.currentTime + offset);
      }
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying, audioLoaded, offset, videoRef]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) audioRef.current.volume = vol;
  }, []);

  const handleToggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.5;
        audioRef.current.muted = false;
        setIsMuted(false);
      } else {
        audioRef.current.muted = true;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const handleOffsetChange = useCallback((newOffset: number) => {
    setOffset(newOffset);
    // Immediately apply offset change
    const audio = audioRef.current;
    const video = videoRef.current;
    if (audio && video && audioLoaded) {
      audio.currentTime = Math.max(0, video.currentTime + newOffset);
    }
  }, [audioLoaded, videoRef]);

  const handleRemoveAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (audioUrl && source === 'file') URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setAudioLoaded(false);
    setFileName('');
    setError(null);
  }, [audioUrl, source]);

  const handleResetOffset = useCallback(() => {
    handleOffsetChange(0);
  }, [handleOffsetChange]);

  const adjustOffset = useCallback((delta: number) => {
    const newOffset = offset + delta;
    handleOffsetChange(Math.max(-30, Math.min(30, newOffset)));
  }, [offset, handleOffsetChange]);

  // Mute original video audio when external audio is playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isEmbedPlayer) return;

    if (isPlaying && syncEnabled) {
      video.volume = 0; // Mute original
    } else if (isMuted) {
      video.volume = 0;
    }
  }, [isPlaying, syncEnabled, isMuted, isEmbedPlayer, videoRef]);

  if (!visible) return null;

  const formatOffset = (seconds: number) => {
    const s = Math.abs(seconds).toFixed(1);
    return seconds >= 0 ? `+${s}s` : `-${s}s`;
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute top-0 right-0 bottom-0 z-[45] w-80 sm:w-96 bg-black/95 backdrop-blur-md border-l border-gray-800 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-md border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Music className="h-4 w-4 text-green-400" />
            Audio Latino
          </h3>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Audio Source Selection */}
        {!audioLoaded && !isLoading && (
          <div className="space-y-3">
            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-blue-300 leading-relaxed">
                Carga un archivo de audio en español latino y se sincronizara automaticamente con el video.
                Soporta MP3, M4A, AAC, OGG, WAV.
              </p>
            </div>

            {/* Upload File */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white py-6 rounded-lg"
            >
              <Upload className="h-5 w-5 mr-2" />
              Subir archivo de audio
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600">o desde URL</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* URL Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://ejemplo.com/audio-latino.mp3"
                className="flex-1 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-500 placeholder:text-gray-600"
                onKeyDown={(e) => e.key === 'Enter' && loadAudioFromUrl()}
              />
              <Button
                onClick={loadAudioFromUrl}
                disabled={!urlInput.trim().startsWith('http')}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white px-3"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Where to get audio */}
            <div className="bg-gray-900/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-400">Donde conseguir audio latino:</p>
              <ul className="text-[11px] text-gray-500 space-y-1">
                <li>- Extraer audio de BluRay/DVD con MKVExtract</li>
                <li>- Buscar &quot;dual audio&quot; o &quot;latino&quot; en sitios de torrents</li>
                <li>- Usar herramientas como FFmpeg para convertir</li>
                <li>- OpenSubtitles.org tiene pistas de audio en algunos idiomas</li>
              </ul>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
            <p className="text-gray-400 text-sm">Cargando audio...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Audio Controls (when loaded) */}
        {audioLoaded && !isLoading && (
          <div className="space-y-5">
            {/* File Info */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-green-300 font-medium truncate">{fileName}</p>
                  <p className="text-[10px] text-gray-500">Audio cargado correctamente</p>
                </div>
              </div>
            </div>

            {/* Play/Pause */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleTogglePlay}
                className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all ${
                  isPlaying
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar Audio
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Reproducir Audio
                  </>
                )}
              </Button>
              <Button
                onClick={handleRemoveAudio}
                variant="outline"
                className="border-gray-700 text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 px-3"
                title="Eliminar audio"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">Volumen del audio latino</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleToggleMute}
                  className="text-gray-400 hover:text-white h-8 w-8 p-0 rounded-full"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-green-500
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500"
                  style={{
                    background: `linear-gradient(to right, #22c55e ${(isMuted ? 0 : volume) * 100}%, #374151 ${(isMuted ? 0 : volume) * 100}%)`,
                  }}
                />
                <span className="text-xs text-gray-500 w-8 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>

            {/* Sync Offset */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400 font-medium">Sincronizacion</label>
                <span className={`text-xs font-mono ${offset === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {formatOffset(offset)}
                </span>
              </div>

              {/* Offset Controls */}
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => adjustOffset(-1)}
                  variant="outline"
                  className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 px-2 rounded-lg text-xs"
                >
                  -1s
                </Button>
                <Button
                  onClick={() => adjustOffset(-0.3)}
                  variant="outline"
                  className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 px-2 rounded-lg text-xs"
                >
                  -0.3s
                </Button>
                <Button
                  onClick={() => adjustOffset(-0.1)}
                  variant="outline"
                  className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 px-2 rounded-lg text-xs"
                >
                  -0.1s
                </Button>
                <Button
                  onClick={handleResetOffset}
                  variant="outline"
                  className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 px-2 rounded-lg text-xs"
                  title="Resetear a 0"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => adjustOffset(0.1)}
                  variant="outline"
                  className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 px-2 rounded-lg text-xs"
                >
                  +0.1s
                </Button>
                <Button
                  onClick={() => adjustOffset(0.3)}
                  variant="outline"
                  className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 px-2 rounded-lg text-xs"
                >
                  +0.3s
                </Button>
                <Button
                  onClick={() => adjustOffset(1)}
                  variant="outline"
                  className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 px-2 rounded-lg text-xs"
                >
                  +1s
                </Button>
              </div>

              {/* Fine-tune slider */}
              <input
                type="range"
                min={-30}
                max={30}
                step={0.05}
                value={offset}
                onChange={(e) => handleOffsetChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-green-500
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500"
                style={{
                  background: `linear-gradient(to right, #ef4444, #374151 33%, #22c55e 50%, #374151 67%, #ef4444)`,
                }}
              />
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>-30s</span>
                <span className="text-green-500">0</span>
                <span>+30s</span>
              </div>
            </div>

            {/* Auto-Sync Toggle */}
            <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3">
              <div>
                <p className="text-sm text-white font-medium">Auto-sincronizar</p>
                <p className="text-[10px] text-gray-500">El audio sigue al video automaticamente</p>
              </div>
              <button
                onClick={() => setSyncEnabled(!syncEnabled)}
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  syncEnabled ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    syncEnabled ? 'left-5' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Replace Audio */}
            <div className="pt-2 border-t border-gray-800 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadAudioFromFile(file);
                }}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white text-xs py-2 rounded-lg"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Cambiar archivo de audio
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

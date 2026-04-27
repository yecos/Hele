'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface TorrentStatus {
  status: 'idle' | 'loading' | 'downloading' | 'streaming' | 'error';
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  totalSize: number;
  downloaded: number;
  timeRemaining: number;
  fileName: string;
  error: string | null;
}

const initialStatus: TorrentStatus = {
  status: 'idle',
  progress: 0,
  downloadSpeed: 0,
  uploadSpeed: 0,
  numPeers: 0,
  totalSize: 0,
  downloaded: 0,
  timeRemaining: 0,
  fileName: '',
  error: null,
};

export function useWebTorrent() {
  const [torrentStatus, setTorrentStatus] = useState<TorrentStatus>(initialStatus);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const clientRef = useRef<any>(null);
  const torrentRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize WebTorrent client (lazy)
  const getClient = useCallback(async () => {
    if (clientRef.current) return clientRef.current;

    try {
      const WebTorrent = (await import('webtorrent')).default;
      const client = new WebTorrent();
      clientRef.current = client;

      client.on('error', (err: Error) => {
        console.error('WebTorrent client error:', err);
        setTorrentStatus(prev => ({
          ...prev,
          status: 'error',
          error: `Error del cliente: ${err.message}`,
        }));
      });

      return client;
    } catch (err: any) {
      console.error('Failed to load WebTorrent:', err);
      setTorrentStatus(prev => ({
        ...prev,
        status: 'error',
        error: 'No se pudo cargar el motor de torrents',
      }));
      return null;
    }
  }, []);

  // Add torrent from magnet link
  const addTorrent = useCallback(
    async (magnetUri: string, videoEl?: HTMLVideoElement | null) => {
      setTorrentStatus({
        ...initialStatus,
        status: 'loading',
      });
      setVideoUrl(null);

      if (videoEl) videoRef.current = videoEl;

      const client = await getClient();
      if (!client) return;

      try {
        // Destroy previous torrent if any
        if (torrentRef.current) {
          try { client.remove(torrentRef.current); } catch {}
          torrentRef.current = null;
        }

        const torrent = client.add(magnetUri, {
          announce: [
            'wss://tracker.btorrent.xyz',
            'wss://tracker.openwebtorrent.com',
            'wss://tracker.fastcast.nz',
          ],
        });

        torrentRef.current = torrent;

        torrent.on('metadata', () => {
          // Find the largest video file
          const videoFile = torrent.files
            .filter((f: any) => {
              const ext = f.name.toLowerCase();
              return ext.endsWith('.mp4') || ext.endsWith('.mkv') || ext.endsWith('.webm') ||
                     ext.endsWith('.avi') || ext.endsWith('.mov') || ext.endsWith('.m4v');
            })
            .sort((a: any, b: any) => b.length - a.length)[0] || torrent.files[0];

          if (videoFile) {
            setTorrentStatus(prev => ({
              ...prev,
              status: 'downloading',
              fileName: videoFile.name,
              totalSize: torrent.length,
            }));

            // Render to video element
            videoFile.renderTo(videoRef.current || document.createElement('video'), {
              autoplay: true,
            });

            // Get the blob URL for the file
            const url = URL.createObjectURL(videoFile.blob || videoFile);
            setVideoUrl(url);
          } else {
            setTorrentStatus(prev => ({
              ...prev,
              status: 'error',
              error: 'No se encontró archivo de video en el torrent',
            }));
          }
        });

        torrent.on('download', () => {
          const progress = Math.min(1, torrent.progress);
          setTorrentStatus({
            status: progress > 0.01 ? 'streaming' : 'downloading',
            progress,
            downloadSpeed: torrent.downloadSpeed,
            uploadSpeed: torrent.uploadSpeed,
            numPeers: torrent.numPeers,
            totalSize: torrent.length,
            downloaded: torrent.downloaded,
            timeRemaining: torrent.timeRemaining,
            fileName: torrentStatus.fileName || torrent.name,
            error: null,
          });
        });

        torrent.on('done', () => {
          setTorrentStatus(prev => ({
            ...prev,
            status: 'streaming',
            progress: 1,
          }));
        });

        torrent.on('error', (err: Error) => {
          setTorrentStatus(prev => ({
            ...prev,
            status: 'error',
            error: `Error del torrent: ${err.message}`,
          }));
        });

        // Timeout for metadata
        setTimeout(() => {
          if (!torrent.name && !torrent.files?.length) {
            setTorrentStatus(prev => ({
              ...prev,
              status: 'error' as const,
              error: 'Tiempo de espera agotado. Verifica el enlace magnet.',
            }));
          }
        }, 30000);

      } catch (err: any) {
        setTorrentStatus(prev => ({
          ...prev,
          status: 'error',
          error: `Error al agregar torrent: ${err.message}`,
        }));
      }
    },
    [getClient, torrentStatus.fileName]
  );

  // Add torrent from .torrent file
  const addTorrentFile = useCallback(
    async (file: File, videoEl?: HTMLVideoElement | null) => {
      if (videoEl) videoRef.current = videoEl;

      const client = await getClient();
      if (!client) return;

      setTorrentStatus({
        ...initialStatus,
        status: 'loading',
        fileName: file.name,
      });
      setVideoUrl(null);

      try {
        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        addTorrent(uint8, videoEl);
      } catch (err: any) {
        setTorrentStatus(prev => ({
          ...prev,
          status: 'error',
          error: `Error al leer archivo: ${err.message}`,
        }));
      }
    },
    [getClient, addTorrent]
  );

  // Stop torrent
  const stopTorrent = useCallback(() => {
    if (torrentRef.current && clientRef.current) {
      try {
        clientRef.current.remove(torrentRef.current);
      } catch {}
      torrentRef.current = null;
    }
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setTorrentStatus(initialStatus);
  }, [videoUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (torrentRef.current && clientRef.current) {
        try {
          clientRef.current.remove(torrentRef.current);
        } catch {}
      }
      if (clientRef.current) {
        try {
          clientRef.current.destroy();
        } catch {}
      }
    };
  }, []);

  return {
    torrentStatus,
    videoUrl,
    addTorrent,
    addTorrentFile,
    stopTorrent,
  };
}

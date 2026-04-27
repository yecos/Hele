'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ChromecastState {
  available: boolean;
  connected: boolean;
  deviceName: string | null;
  casting: boolean;
}

export function useChromecast() {
  const [state, setState] = useState<ChromecastState>({
    available: false,
    connected: false,
    deviceName: null,
    casting: false,
  });
  const playerRef = useRef<cast.framework.RemotePlayer | null>(null);
  const controllerRef = useRef<cast.framework.RemotePlayerController | null>(null);
  const contextRef = useRef<cast.framework.CastContext | null>(null);
  const initializedRef = useRef(false);

  // Initialize Cast SDK
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initCast = () => {
      try {
        // Set global callback
        window.__onGCastApiAvailable = (isAvailable: boolean) => {
          if (!isAvailable) {
            console.log('Cast SDK not available');
            return;
          }

          try {
            const context = cast.framework.CastContext.getInstance();
            context.setOptions({
              receiverApplicationId: 'CC1AD845', // Default Media Receiver
              autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
            });

            contextRef.current = context;

            const player = new cast.framework.RemotePlayer();
            const controller = new cast.framework.RemotePlayerController(player);
            playerRef.current = player;
            controllerRef.current = controller;

            // Listen for state changes
            context.addEventListener('caststatechanged', () => {
              const castState = context.getCastState();
              setState(prev => ({
                ...prev,
                available: castState !== 'NO_DEVICES_AVAILABLE',
                connected: castState === 'CONNECTED',
                deviceName: context.getCurrentSession()?.receiver?.friendlyName || null,
              }));
            });

            context.addEventListener('sessionstatechanged', () => {
              const session = context.getCurrentSession();
              setState(prev => ({
                ...prev,
                connected: !!session,
                casting: !!session,
                deviceName: session?.receiver?.friendlyName || null,
              }));
            });

            console.log('Chromecast initialized successfully');
          } catch (err) {
            console.error('Cast init error:', err);
          }
        };
      } catch {
        // Cast SDK not loaded, silently ignore
      }
    };

    // Wait for DOM and SDK
    if (document.readyState === 'complete') {
      initCast();
    } else {
      window.addEventListener('load', initCast);
      return () => window.removeEventListener('load', initCast);
    }
  }, []);

  // Cast HLS/stream content directly
  const castMedia = useCallback(async (url: string, title: string, posterUrl?: string) => {
    if (!contextRef.current) return false;

    try {
      await contextRef.current.requestSession();
      const session = contextRef.current.getCurrentSession();
      if (!session) return false;

      const contentType = url.includes('.m3u8') ? 'application/x-mpegurl' : 'video/mp4';
      const mediaInfo = new chrome.cast.MediaInfo(url, contentType);
      mediaInfo.streamType = url.includes('.m3u8') ? 'LIVE' : 'BUFFERED';

      const metadata = new chrome.cast.GenericMediaMetadata();
      metadata.title = title;
      if (posterUrl) {
        metadata.images = [{ url: posterUrl }];
      }
      mediaInfo.metadata = metadata;

      const request = new chrome.cast.LoadRequest(mediaInfo);
      request.currentTime = 0;
      request.autoplay = true;

      return new Promise<boolean>((resolve) => {
        session.loadMedia(
          request,
          () => {
            setState(prev => ({ ...prev, casting: true, connected: true }));
            resolve(true);
          },
          (err) => {
            console.error('Load media error:', err);
            resolve(false);
          }
        );
      });
    } catch (err) {
      console.error('Cast session error:', err);
      return false;
    }
  }, []);

  // For iframe embed content - open in new tab with instructions
  const castEmbed = useCallback(async (embedUrl: string, title: string) => {
    if (!contextRef.current) return false;

    try {
      await contextRef.current.requestSession();
      const session = contextRef.current.getCurrentSession();
      if (!session) return false;

      // Try to load the embed URL as HTML content
      const mediaInfo = new chrome.cast.MediaInfo(embedUrl, 'text/html');
      mediaInfo.streamType = 'BUFFERED';

      const metadata = new chrome.cast.GenericMediaMetadata();
      metadata.title = title;
      mediaInfo.metadata = metadata;

      const request = new chrome.cast.LoadRequest(mediaInfo);

      return new Promise<boolean>((resolve) => {
        session.loadMedia(
          request,
          () => {
            setState(prev => ({ ...prev, casting: true, connected: true }));
            resolve(true);
          },
          () => {
            // If default receiver can't handle it, open in new tab
            window.open(embedUrl, '_blank');
            resolve(false);
          }
        );
      });
    } catch {
      // Fallback: open in new tab for tab casting
      window.open(embedUrl, '_blank');
      return false;
    }
  }, []);

  // Stop casting
  const stopCasting = useCallback(() => {
    if (contextRef.current) {
      contextRef.current.endCurrentSession(true);
      setState({ available: false, connected: false, deviceName: null, casting: false });
    }
  }, []);

  // Toggle play/pause on cast device
  const togglePlayPause = useCallback(() => {
    controllerRef.current?.playOrPause();
  }, []);

  return {
    ...state,
    castMedia,
    castEmbed,
    stopCasting,
    togglePlayPause,
  };
}

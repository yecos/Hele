'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Types for Chrome Cast API (global)
declare global {
  interface Window {
    __onGCastApiAvailable: (isAvailable: boolean) => void;
    chrome: {
      cast: {
        isAvailable: boolean;
        SessionRequest: new (appId: string) => chrome.cast.SessionRequest;
        ApiConfig: new (
          sessionRequest: chrome.cast.SessionRequest,
          sessionListener: (session: chrome.cast.Session) => void,
          receiverListener: (availability: string) => void
        ) => chrome.cast.ApiConfig;
        initialize: (
          apiConfig: chrome.cast.ApiConfig,
          onSuccess: () => void,
          onError: (error: chrome.cast.Error) => void
        ) => void;
        requestSession: (
          onSuccess: (session: chrome.cast.Session) => void,
          onError: (error: chrome.cast.Error) => void
        ) => void;
        media: {
          MediaInfo: new (url: string, contentType: string) => chrome.cast.media.MediaInfo;
          GenericMediaMetadata: new () => chrome.cast.media.GenericMediaMetadata;
          LoadRequest: new (mediaInfo: chrome.cast.media.MediaInfo) => chrome.cast.media.LoadRequest;
        };
        ReceiverAvailability: {
          AVAILABLE: string;
          UNAVAILABLE: string;
        };
        AutoJoinPolicy: { ORIGIN_SCOPED: string };
        ErrorCode: Record<string, number>;
        SessionStatus: {
          STOPPED: string;
        };
        Error: new (code: number, description?: string) => chrome.cast.Error;
      };
    };
  }
}

interface CastDeviceInfo {
  friendlyName: string;
  deviceId?: string;
}

interface ChromecastState {
  isAvailable: boolean;
  isConnected: boolean;
  isCasting: boolean;
  device: CastDeviceInfo | null;
  connect: () => void;
  disconnect: () => void;
  castHLS: (url: string, title?: string, subtitle?: string) => void;
  castEmbed: (url: string, title?: string, subtitle?: string) => void;
  stopCast: () => void;
}

const NAMESPACE = 'urn:x-cast:com.xuperstream';
// Default Media Receiver works for HLS natively
const DEFAULT_MEDIA_RECEIVER_APP_ID = 'CC1AD845';

export function useChromecast(): ChromecastState {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [device, setDevice] = useState<CastDeviceInfo | null>(null);
  const sessionRef = useRef<chrome.cast.Session | null>(null);
  const initializedRef = useRef(false);

  // Load Cast SDK dynamically
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Define the callback before loading the script
    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable && window.chrome?.cast) {
        initializeCastApi();
      }
    };

    // Load the Cast SDK script
    if (!document.querySelector('script[src*="cast_sender"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const initializeCastApi = useCallback(() => {
    try {
      if (!window.chrome?.cast) return;

      const sessionRequest = new window.chrome.cast.SessionRequest(DEFAULT_MEDIA_RECEIVER_APP_ID);

      const apiConfig = new window.chrome.cast.ApiConfig(
        sessionRequest,
        // Session listener - called when a session is started/ended
        (session: chrome.cast.Session) => {
          sessionRef.current = session;
          setIsConnected(true);
          setIsCasting(true);
          setDevice({
            friendlyName: session.receiver.friendlyName || 'Chromecast',
            deviceId: session.receiver.deviceId,
          });

          // Listen for session updates
          session.addEventListener('update', () => {
            if (session.status === window.chrome.cast.SessionStatus.STOPPED) {
              sessionRef.current = null;
              setIsConnected(false);
              setIsCasting(false);
              setDevice(null);
            }
          });
        },
        // Receiver availability listener
        (availability: string) => {
          setIsAvailable(availability === window.chrome.cast.ReceiverAvailability.AVAILABLE);
        }
      );

      window.chrome.cast.initialize(
        apiConfig,
        () => {
          console.log('[Chromecast] Initialized');
        },
        (error: chrome.cast.Error) => {
          console.warn('[Chromecast] Init error:', error);
        }
      );
    } catch (err) {
      console.warn('[Chromecast] Failed to initialize:', err);
    }
  }, []);

  // Connect to a Cast device
  const connect = useCallback(() => {
    if (!window.chrome?.cast) return;

    window.chrome.cast.requestSession(
      (session: chrome.cast.Session) => {
        sessionRef.current = session;
        setIsConnected(true);
        setIsCasting(true);
        setDevice({
          friendlyName: session.receiver.friendlyName || 'Chromecast',
          deviceId: session.receiver.deviceId,
        });
      },
      (error: chrome.cast.Error) => {
        if (error.code !== window.chrome.cast.ErrorCode.CANCEL) {
          console.warn('[Chromecast] Session error:', error);
        }
      }
    );
  }, []);

  // Disconnect from Cast device
  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.stop(
        () => {
          sessionRef.current = null;
          setIsConnected(false);
          setIsCasting(false);
          setDevice(null);
        },
        () => {
          sessionRef.current = null;
          setIsConnected(false);
          setIsCasting(false);
          setDevice(null);
        }
      );
    }
  }, []);

  // Send a custom message to the receiver
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (sessionRef.current) {
      sessionRef.current.sendMessage(NAMESPACE, message, () => {}, () => {});
    }
  }, []);

  // Cast an HLS stream
  const castHLS = useCallback((url: string, title?: string, subtitle?: string) => {
    if (!window.chrome?.cast) return;

    // Try to use Default Media Receiver for native HLS playback
    const mediaInfo = new window.chrome.cast.media.MediaInfo(
      url,
      'application/x-mpegurl'
    );
    const metadata = new window.chrome.cast.media.GenericMediaMetadata();
    if (title) metadata.title = title;
    if (subtitle) metadata.subtitle = subtitle;
    mediaInfo.metadata = metadata;

    const loadRequest = new window.chrome.cast.media.LoadRequest(mediaInfo);

    if (sessionRef.current) {
      sessionRef.current.loadMedia(
        loadRequest,
        () => {
          setIsCasting(true);
        },
        (error: chrome.cast.Error) => {
          console.warn('[Chromecast] Load media error:', error);
        }
      );
    } else {
      // No active session, request one first
      window.chrome.cast.requestSession(
        (session: chrome.cast.Session) => {
          sessionRef.current = session;
          setIsConnected(true);
          setDevice({
            friendlyName: session.receiver.friendlyName || 'Chromecast',
          });
          session.loadMedia(
            loadRequest,
            () => setIsCasting(true),
            (err: chrome.cast.Error) => console.warn('[Chromecast] Load error:', err)
          );
        },
        (err: chrome.cast.Error) => {
          if (err.code !== window.chrome.cast.ErrorCode.CANCEL) {
            console.warn('[Chromecast] Session request error:', err);
          }
        }
      );
    }
  }, []);

  // Cast an embed URL (iframe)
  const castEmbed = useCallback((url: string, title?: string, subtitle?: string) => {
    // For embed URLs, we send a custom message to our custom receiver
    // If using Default Media Receiver, we still try loadMedia (may not work for embeds)
    sendMessage({
      action: 'PLAY_EMBED',
      url,
      title: title || '',
      subtitle: subtitle || '',
    });

    setIsCasting(true);
  }, [sendMessage]);

  // Stop casting
  const stopCast = useCallback(() => {
    sendMessage({ action: 'STOP' });
    disconnect();
  }, [sendMessage, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        try {
          sessionRef.current.stop(() => {}, () => {});
        } catch {}
      }
    };
  }, []);

  return {
    isAvailable,
    isConnected,
    isCasting,
    device,
    connect,
    disconnect,
    castHLS,
    castEmbed,
    stopCast,
  };
}

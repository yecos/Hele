'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Types for Chrome Cast API (global)
declare global {
  interface Window {
    __onGCastApiAvailable: (isAvailable: boolean) => void;
    cast: typeof chrome.cast;
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

export type CastStatus = 'loading' | 'unavailable' | 'available' | 'connecting' | 'connected' | 'error';

interface ChromecastState {
  status: CastStatus;
  isAvailable: boolean;
  isConnected: boolean;
  isCasting: boolean;
  device: CastDeviceInfo | null;
  statusMessage: string;
  connect: () => void;
  disconnect: () => void;
  castHLS: (url: string, title?: string, subtitle?: string) => void;
  castEmbed: (url: string, title?: string, subtitle?: string) => void;
  stopCast: () => void;
}

// Default Media Receiver — works for HLS/DASH/mp4 natively on Chromecast
const DEFAULT_MEDIA_RECEIVER_APP_ID = 'CC1AD845';
const MAX_INIT_RETRIES = 3;

export function useChromecast(): ChromecastState {
  const [status, setStatus] = useState<CastStatus>('loading');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [device, setDevice] = useState<CastDeviceInfo | null>(null);
  const [statusMessage, setStatusMessage] = useState('Cargando Chromecast...');

  const sessionRef = useRef<chrome.cast.Session | null>(null);
  const initRetryRef = useRef(0);

  // Helper to update state from session
  const updateFromSession = useCallback((session: chrome.cast.Session) => {
    sessionRef.current = session;
    setIsConnected(true);
    setIsCasting(true);
    setDevice({
      friendlyName: session.receiver.friendlyName || 'Chromecast',
      deviceId: session.receiver.deviceId,
    });
    setStatus('connected');
    setStatusMessage(`Conectado a ${session.receiver.friendlyName || 'Chromecast'}`);
  }, []);

  const resetState = useCallback(() => {
    sessionRef.current = null;
    setIsConnected(false);
    setIsCasting(false);
    setDevice(null);
    if (isAvailable) {
      setStatus('available');
      setStatusMessage('Dispositivo disponible');
    }
  }, [isAvailable]);

  // Initialize the Cast API
  const initializeCastApi = useCallback(() => {
    try {
      const cast = window.chrome?.cast;
      if (!cast) {
        console.warn('[Chromecast] chrome.cast not available');
        if (initRetryRef.current < MAX_INIT_RETRIES) {
          initRetryRef.current += 1;
          console.log(`[Chromecast] Retry ${initRetryRef.current}/${MAX_INIT_RETRIES} in 2s...`);
          setTimeout(initializeCastApi, 2000);
        } else {
          setStatus('unavailable');
          setStatusMessage('Chromecast no disponible en este navegador');
        }
        return;
      }

      console.log('[Chromecast] Initializing Cast API...');
      setStatusMessage('Buscando dispositivos...');

      const sessionRequest = new cast.SessionRequest(DEFAULT_MEDIA_RECEIVER_APP_ID);

      const apiConfig = new cast.ApiConfig(
        sessionRequest,
        // Session listener
        (session: chrome.cast.Session) => {
          console.log('[Chromecast] Session started:', session.receiver.friendlyName);
          updateFromSession(session);

          session.addEventListener('update', () => {
            if (session.status === cast.SessionStatus.STOPPED) {
              console.log('[Chromecast] Session stopped');
              resetState();
            }
          });
        },
        // Receiver availability listener
        (availability: string) => {
          const available = availability === cast.ReceiverAvailability.AVAILABLE;
          console.log(`[Chromecast] Receiver availability: ${availability} (available=${available})`);
          setIsAvailable(available);
          if (available) {
            setStatus('available');
            setStatusMessage('Dispositivo disponible');
          } else {
            setStatus('unavailable');
            setStatusMessage('No se encontraron dispositivos Chromecast');
          }
          initRetryRef.current = 0; // Reset retries on successful init
        }
      );

      cast.initialize(
        apiConfig,
        () => {
          console.log('[Chromecast] Cast API initialized successfully');
          setStatusMessage('Buscando dispositivos...');
          if (status === 'loading') {
            setStatus('unavailable');
          }
        },
        (error: chrome.cast.Error) => {
          console.warn('[Chromecast] Init error:', error.code, error.description);
          setStatus('error');
          setStatusMessage(`Error al inicializar Chromecast (código ${error.code})`);
        }
      );
    } catch (err) {
      console.error('[Chromecast] Failed to initialize:', err);
      setStatus('error');
      setStatusMessage('Error al inicializar Chromecast');
    }
  }, [status, updateFromSession, resetState]);

  // Load Cast SDK
  useEffect(() => {
    // Check if we're on HTTPS or localhost (required for Chromecast)
    const isSecure = window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.');

    if (!isSecure) {
      console.warn('[Chromecast] Not on HTTPS or localhost. Cast discovery requires secure context.');
      setStatus('unavailable');
      setStatusMessage('Chromecast requiere HTTPS');
      return;
    }

    // Check for native Cast support first
    if (window.chrome?.cast?.isAvailable) {
      console.log('[Chromecast] Cast API already available');
      initializeCastApi();
      return;
    }

    // Set up the callback
    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      console.log(`[Chromecast] __onGCastApiAvailable fired: ${isAvailable}`);
      if (isAvailable) {
        initializeCastApi();
      } else {
        setStatus('unavailable');
        setStatusMessage('Chromecast no disponible en este navegador');
      }
    };

    // Load the Cast SDK script
    const existingScript = document.querySelector('script[src*="cast_sender"]');
    if (!existingScript) {
      console.log('[Chromecast] Loading Cast SDK...');
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;

      script.onload = () => {
        console.log('[Chromecast] Cast SDK script loaded');
      };

      script.onerror = () => {
        console.error('[Chromecast] Failed to load Cast SDK script');
        setStatus('error');
        setStatusMessage('No se pudo cargar el SDK de Chromecast');
      };

      document.head.appendChild(script);
    } else {
      console.log('[Chromecast] Cast SDK script already in DOM');
    }

    // Timeout: if SDK doesn't load in 10s
    const timeout = setTimeout(() => {
      if (status === 'loading') {
        console.warn('[Chromecast] SDK load timeout');
        setStatus('unavailable');
        setStatusMessage('Tiempo de espera agotado al cargar Chromecast');
      }
    }, 10000);

    return () => {
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Connect to a Cast device
  const connect = useCallback(() => {
    const cast = window.chrome?.cast;
    if (!cast) {
      console.warn('[Chromecast] Cannot connect: Cast API not available');
      return;
    }

    console.log('[Chromecast] Requesting session...');
    setStatus('connecting');
    setStatusMessage('Selecciona un dispositivo...');

    cast.requestSession(
      (session: chrome.cast.Session) => {
        console.log('[Chromecast] Session established:', session.receiver.friendlyName);
        updateFromSession(session);
      },
      (error: chrome.cast.Error) => {
        if (error.code !== cast.ErrorCode.CANCEL) {
          console.warn('[Chromecast] Session request error:', error.code, error.description);
          setStatus('error');
          setStatusMessage(`Error de conexión (${error.code})`);
          setTimeout(() => {
            if (isAvailable) {
              setStatus('available');
              setStatusMessage('Dispositivo disponible');
            }
          }, 3000);
        } else {
          console.log('[Chromecast] User cancelled device selection');
          setStatus('available');
          setStatusMessage('Dispositivo disponible');
        }
      }
    );
  }, [isAvailable, updateFromSession]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      console.log('[Chromecast] Stopping session...');
      try {
        sessionRef.current.stop(
          () => {
            console.log('[Chromecast] Session stopped successfully');
            resetState();
            setStatusMessage('Desconectado');
          },
          () => {
            console.log('[Chromecast] Session stop failed (already ended?)');
            resetState();
          }
        );
      } catch {
        resetState();
      }
    }
  }, [resetState]);

  // Cast an HLS stream via Default Media Receiver
  const castHLS = useCallback((url: string, title?: string, subtitle?: string) => {
    const cast = window.chrome?.cast;
    if (!cast) return;

    console.log('[Chromecast] Casting HLS:', url);

    const mediaInfo = new cast.media.MediaInfo(url, 'application/x-mpegurl');
    const metadata = new cast.media.GenericMediaMetadata();
    if (title) metadata.title = title;
    if (subtitle) metadata.subtitle = subtitle;
    mediaInfo.metadata = metadata;

    const loadRequest = new cast.media.LoadRequest(mediaInfo);
    setStatusMessage(`Enviando a ${device?.friendlyName || 'Chromecast'}...`);

    if (sessionRef.current) {
      sessionRef.current.loadMedia(
        loadRequest,
        () => {
          console.log('[Chromecast] HLS media loaded');
          setIsCasting(true);
          setStatusMessage(`Reproduciendo en ${device?.friendlyName || 'Chromecast'}`);
        },
        (error: chrome.cast.Error) => {
          console.warn('[Chromecast] Load media error:', error.code);
          setStatusMessage('Error al cargar el contenido');
        }
      );
    } else {
      // No session — request one first, then load
      cast.requestSession(
        (session) => {
          updateFromSession(session);
          session.loadMedia(
            loadRequest,
            () => {
              setIsCasting(true);
              setStatusMessage(`Reproduciendo en ${device?.friendlyName || 'Chromecast'}`);
            },
            (err) => {
              console.warn('[Chromecast] Load error:', err.code);
              setStatusMessage('Error al cargar el contenido');
            }
          );
        },
        (err) => {
          if (err.code !== cast.ErrorCode.CANCEL) {
            setStatusMessage('No se pudo conectar al dispositivo');
          }
        }
      );
    }
  }, [device, updateFromSession]);

  // Cast an embed URL (iframe content) via Default Media Receiver
  // NOTE: Default Media Receiver can't render iframes, but we try loading
  // the URL as media content — for embed URLs this may show a basic player
  const castEmbed = useCallback((url: string, title?: string, subtitle?: string) => {
    const cast = window.chrome?.cast;
    if (!cast) return;

    console.log('[Chromecast] Casting embed URL:', url);

    // Strategy: Send the embed URL to the receiver using loadMedia.
    // The Default Media Receiver will attempt to play it.
    // For HLS/MP4 streams within embeds, this works. For pure iframe embeds,
    // the receiver will show a "content type not supported" message.
    const mediaInfo = new cast.media.MediaInfo(url, 'video/mp4');
    const metadata = new cast.media.GenericMediaMetadata();
    if (title) metadata.title = title;
    if (subtitle) metadata.subtitle = subtitle;
    mediaInfo.metadata = metadata;

    const loadRequest = new cast.media.LoadRequest(mediaInfo);
    setStatusMessage(`Enviando a ${device?.friendlyName || 'Chromecast'}...`);

    const doLoad = (session: chrome.cast.Session) => {
      updateFromSession(session);
      session.loadMedia(
        loadRequest,
        () => {
          setIsCasting(true);
          setStatusMessage(`Reproduciendo en ${device?.friendlyName || 'Chromecast'}`);
        },
        (error: chrome.cast.Error) => {
          console.warn('[Chromecast] Embed load failed:', error.code);
          setStatusMessage('El servidor no es compatible con Chromecast — intenta otro');
        }
      );
    };

    if (sessionRef.current) {
      doLoad(sessionRef.current);
    } else {
      cast.requestSession(
        (session) => doLoad(session),
        (err) => {
          if (err.code !== cast.ErrorCode.CANCEL) {
            setStatusMessage('No se pudo conectar al dispositivo');
          }
        }
      );
    }
  }, [device, updateFromSession]);

  // Stop casting
  const stopCast = useCallback(() => {
    disconnect();
  }, [disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        try { sessionRef.current.stop(() => {}, () => {}); } catch { /* ignore */ }
      }
    };
  }, []);

  return {
    status,
    isAvailable,
    isConnected,
    isCasting,
    device,
    statusMessage,
    connect,
    disconnect,
    castHLS,
    castEmbed,
    stopCast,
  };
}

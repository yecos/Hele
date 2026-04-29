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
          DEFAULT_MEDIA_RECEIVER_APP_ID: string;
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
  castError: string | null; // Visible error for the user
  clearError: () => void;
  connect: () => void;
  disconnect: () => void;
  castHLS: (url: string, title?: string, subtitle?: string) => Promise<boolean>;
  castEmbed: (url: string, title?: string, subtitle?: string) => Promise<boolean>;
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
  const [castError, setCastError] = useState<string | null>(null);

  const sessionRef = useRef<chrome.cast.Session | null>(null);
  const initRetryRef = useRef(0);
  const initializedRef = useRef(false);

  const clearError = useCallback(() => setCastError(null), []);

  // Helper to update state from session
  const updateFromSession = useCallback((session: chrome.cast.Session) => {
    sessionRef.current = session;
    setIsConnected(true);
    setDevice({
      friendlyName: session.receiver.friendlyName || 'Chromecast',
      deviceId: session.receiver.deviceId,
    });
    setStatus('connected');
    setStatusMessage(`Conectado a ${session.receiver.friendlyName || 'Chromecast'}`);
    setCastError(null);
  }, []);

  const resetState = useCallback(() => {
    sessionRef.current = null;
    setIsConnected(false);
    setIsCasting(false);
    setDevice(null);
    setIsAvailable(false);
    setStatus('unavailable');
    setStatusMessage('Dispositivo desconectado');
    setCastError(null);
  }, []);

  // Initialize the Cast API
  const initializeCastApi = useCallback(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const cast = window.chrome?.cast;
      if (!cast) {
        console.warn('[Chromecast] chrome.cast not available');
        initializedRef.current = false;
        if (initRetryRef.current < MAX_INIT_RETRIES) {
          initRetryRef.current += 1;
          setTimeout(initializeCastApi, 2000);
        } else {
          setStatus('unavailable');
          setStatusMessage('Chromecast no disponible en este navegador');
        }
        return;
      }

      console.log('[Chromecast] Initializing Cast API...');
      setStatusMessage('Buscando dispositivos...');

      const appId = cast.media?.DEFAULT_MEDIA_RECEIVER_APP_ID || DEFAULT_MEDIA_RECEIVER_APP_ID;
      const sessionRequest = new cast.SessionRequest(appId);

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
        },
        (error: chrome.cast.Error) => {
          console.warn('[Chromecast] Init error:', error.code, error.description);
          setStatus('error');
          setStatusMessage(`Error al inicializar Chromecast (código ${error.code})`);
          initializedRef.current = false;
        }
      );
    } catch (err) {
      console.error('[Chromecast] Failed to initialize:', err);
      setStatus('error');
      setStatusMessage('Error al inicializar Chromecast');
      initializedRef.current = false;
    }
  }, [updateFromSession, resetState]);

  // Load Cast SDK — improved for mobile
  useEffect(() => {
    // Use the browser's built-in secure context check
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      console.warn('[Chromecast] Not on a secure context. Cast discovery requires HTTPS.');
      setStatus('unavailable');
      setStatusMessage('Chromecast requiere conexión segura (HTTPS)');
      return;
    }

    // Check if Cast API is already available (handles race condition on mobile)
    if (window.chrome?.cast?.isAvailable) {
      console.log('[Chromecast] Cast API already available');
      initializeCastApi();
      return;
    }

    // Set up the callback BEFORE loading the script
    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      console.log(`[Chromecast] __onGCastApiAvailable fired: ${isAvailable}`);
      if (isAvailable) {
        initializeCastApi();
      } else {
        setStatus('unavailable');
        setStatusMessage('Chromecast no disponible en este navegador');
      }
    };

    // Load the Cast SDK script only if not already present
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

    // Periodic check for API availability (fixes mobile Chrome race condition
    // where __onGCastApiAvailable fires before our callback is set)
    const pollInterval = setInterval(() => {
      if (window.chrome?.cast?.isAvailable && !initializedRef.current) {
        console.log('[Chromecast] API detected via polling');
        initializeCastApi();
      }
    }, 800);

    // Timeout: if SDK doesn't load in 15s (longer for mobile)
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (!initializedRef.current && status === 'loading') {
        console.warn('[Chromecast] SDK load timeout');
        setStatus('unavailable');
        setStatusMessage('Tiempo de espera agotado al cargar Chromecast');
      }
    }, 15000);

    return () => {
      clearTimeout(timeout);
      clearInterval(pollInterval);
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
    setCastError(null);

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
          setCastError(`Error de conexión a Chromecast (${error.code})`);
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
  const castHLS = useCallback(async (url: string, title?: string, subtitle?: string): Promise<boolean> => {
    const cast = window.chrome?.cast;
    if (!cast) return false;

    console.log('[Chromecast] Casting HLS:', url);

    const mediaInfo = new cast.media.MediaInfo(url, 'application/x-mpegurl');
    const metadata = new cast.media.GenericMediaMetadata();
    if (title) metadata.title = title;
    if (subtitle) metadata.subtitle = subtitle;
    mediaInfo.metadata = metadata;

    const loadRequest = new cast.media.LoadRequest(mediaInfo);
    setStatusMessage(`Enviando a ${device?.friendlyName || 'Chromecast'}...`);
    setCastError(null);

    return new Promise((resolve) => {
      const doLoad = (session: chrome.cast.Session) => {
        updateFromSession(session);
        session.loadMedia(
          loadRequest,
          () => {
            console.log('[Chromecast] HLS media loaded successfully');
            setIsCasting(true);
            setStatusMessage(`Reproduciendo en ${device?.friendlyName || 'Chromecast'}`);
            resolve(true);
          },
          (error: chrome.cast.Error) => {
            console.warn('[Chromecast] Load media error:', error.code);
            setStatusMessage('Error al cargar el contenido');
            setCastError(`Error al enviar a TV: ${error.description || 'Código ' + error.code}`);
            resolve(false);
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
              setCastError('No se pudo conectar al dispositivo');
            }
            resolve(false);
          }
        );
      }
    });
  }, [device, updateFromSession]);

  // Cast an embed URL — NOTE: The Default Media Receiver CANNOT render iframe embeds.
  // This will attempt to load the URL as media, but it will likely fail for embed URLs.
  // Returns false if casting fails, so the UI can react accordingly.
  const castEmbed = useCallback(async (url: string, title?: string, subtitle?: string): Promise<boolean> => {
    const cast = window.chrome?.cast;
    if (!cast) return false;

    console.log('[Chromecast] Attempting to cast embed URL:', url);

    const mediaInfo = new cast.media.MediaInfo(url, 'video/mp4');
    const metadata = new cast.media.GenericMediaMetadata();
    if (title) metadata.title = title;
    if (subtitle) metadata.subtitle = subtitle;
    mediaInfo.metadata = metadata;

    const loadRequest = new cast.media.LoadRequest(mediaInfo);
    setStatusMessage(`Enviando a ${device?.friendlyName || 'Chromecast'}...`);
    setCastError(null);

    return new Promise((resolve) => {
      const doLoad = (session: chrome.cast.Session) => {
        updateFromSession(session);
        session.loadMedia(
          loadRequest,
          () => {
            console.log('[Chromecast] Embed URL loaded on receiver');
            setIsCasting(true);
            setStatusMessage(`Reproduciendo en ${device?.friendlyName || 'Chromecast'}`);
            resolve(true);
          },
          (error: chrome.cast.Error) => {
            console.warn('[Chromecast] Embed load failed:', error.code);
            setStatusMessage('No se pudo enviar a TV');
            setCastError(
              'Este servidor usa un reproductor web que no es compatible con Chromecast. ' +
              'El contenido se reproduce en tu dispositivo. Para ver en TV, prueba con canales IPTV.'
            );
            resolve(false);
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
              setCastError('No se pudo conectar al dispositivo');
            }
            resolve(false);
          }
        );
      }
    });
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
    castError,
    clearError,
    connect,
    disconnect,
    castHLS,
    castEmbed,
    stopCast,
  };
}

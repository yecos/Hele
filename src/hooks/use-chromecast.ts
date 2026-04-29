'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ==================== CAST SDK TYPE DECLARATIONS ====================

interface CastDeviceInfo {
  friendlyName: string;
  deviceId?: string;
}

export type CastStatus = 'loading' | 'unavailable' | 'available' | 'connecting' | 'connected' | 'error';
export type CastMode = 'default' | 'custom'; // default = Default Media Receiver, custom = our receiver

interface ChromecastState {
  status: CastStatus;
  isAvailable: boolean;
  isConnected: boolean;
  isCasting: boolean;
  device: CastDeviceInfo | null;
  statusMessage: string;
  castError: string | null;
  castMode: CastMode;
  clearError: () => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  castHLS: (url: string, title?: string, subtitle?: string) => Promise<boolean>;
  castEmbed: (url: string, title?: string, subtitle?: string) => Promise<boolean>;
  stopCast: () => void;
}

const CUSTOM_NAMESPACE = 'urn:x-cast:com.xuperstream';
const DEFAULT_RECEIVER_ID = 'CC1AD845';
const SDK_LOAD_TIMEOUT = 20000; // 20s for mobile (slower networks)

// Get the configured receiver app ID from localStorage
function getReceiverAppId(): string {
  try {
    return localStorage.getItem('xs-cast-app-id') || DEFAULT_RECEIVER_ID;
  } catch {
    return DEFAULT_RECEIVER_ID;
  }
}

function isCustomReceiver(): boolean {
  return getReceiverAppId() !== DEFAULT_RECEIVER_ID;
}

// ==================== HOOK ====================

export function useChromecast(): ChromecastState {
  const [status, setStatus] = useState<CastStatus>('loading');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [device, setDevice] = useState<CastDeviceInfo | null>(null);
  const [statusMessage, setStatusMessage] = useState('Cargando Chromecast...');
  const [castError, setCastError] = useState<string | null>(null);
  const [castMode, setCastMode] = useState<CastMode>(() => isCustomReceiver() ? 'custom' : 'default');

  const castContextRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const controllerRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const sdkLoadRetriesRef = useRef(0);

  const clearError = useCallback(() => setCastError(null), []);

  // ==================== SESSION HELPERS ====================

  const updateFromSession = useCallback((session: any) => {
    sessionRef.current = session;
    setIsConnected(true);
    setIsAvailable(true);
    setDevice({
      friendlyName: session.receiver?.friendlyName || 'Chromecast',
      deviceId: session.receiver?.deviceId,
    });
    setStatus('connected');
    setStatusMessage(`Conectado a ${session.receiver?.friendlyName || 'Chromecast'}`);
    setCastError(null);
  }, []);

  const resetState = useCallback(() => {
    sessionRef.current = null;
    setIsConnected(false);
    setIsCasting(false);
    setDevice(null);
    // Don't reset isAvailable - devices may still be discoverable
    setStatus('available');
    setStatusMessage('Dispositivo disponible');
    setCastError(null);
  }, []);

  // ==================== INITIALIZATION ====================

  const initializeCastFramework = useCallback(() => {
    if (initializedRef.current) return;

    const castFramework = (window as any).cast?.framework;
    const chromeCast = (window as any).chrome?.cast;

    if (!castFramework || !chromeCast) {
      console.warn('[Chromecast] cast.framework not available yet');
      initializedRef.current = false;
      return false;
    }

    try {
      initializedRef.current = true;

      const appId = getReceiverAppId();
      const usingCustom = appId !== DEFAULT_RECEIVER_ID;
      setCastMode(usingCustom ? 'custom' : 'default');

      console.log(`[Chromecast] Initializing CAF with receiver: ${usingCustom ? 'Custom' : 'Default Media Receiver'}`);

      // Create CastContext — the recommended way to initialize
      const context = castFramework.CastContext.getInstance();
      castContextRef.current = context;

      context.setOptions({
        receiverApplicationId: appId,
        autoJoinPolicy: chromeCast.AutoJoinPolicy.ORIGIN_SCOPED,
      });

      // Listen for session state changes (mobile-friendly)
      context.addEventListener(
        castFramework.CastContextEventType.SESSION_STATE_CHANGED,
        (event: any) => {
          console.log('[Chromecast] Session state:', event.sessionState);

          switch (event.sessionState) {
            case castFramework.SessionState.SESSION_STARTED:
            case castFramework.SessionState.SESSION_RESUMED: {
              const session = context.getCurrentSession();
              if (session) updateFromSession(session);
              break;
            }
            case castFramework.SessionState.SESSION_ENDED:
            case castFramework.SessionState.SESSION_ENDING:
              resetState();
              break;
          }
        }
      );

      // Set up RemotePlayer + Controller for state sync
      const player = new castFramework.RemotePlayer();
      const controller = new castFramework.RemotePlayerController(player);
      playerRef.current = player;
      controllerRef.current = controller;

      // Track connection changes
      controller.addEventListener(
        castFramework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
        () => {
          const connected = player.isConnected;
          console.log('[Chromecast] RemotePlayer connected:', connected);

          if (connected && context.getCurrentSession()) {
            updateFromSession(context.getCurrentSession());
          } else if (!connected && isConnected) {
            resetState();
          }
        }
      );

      // Check if already connected (auto-join from previous session)
      const currentSession = context.getCurrentSession();
      if (currentSession) {
        console.log('[Chromecast] Existing session found, reconnecting...');
        updateFromSession(currentSession);
        if (currentSession.media && currentSession.media.length > 0) {
          setIsCasting(true);
          setStatusMessage(`Reproduciendo en ${currentSession.receiver?.friendlyName || 'Chromecast'}`);
        }
      }

      // Check cast state for device availability
      const castState = context.getCastState();
      updateCastState(castState);

      // Listen for cast state changes (device discovery)
      context.addEventListener(
        'caststatechanged',
        (event: any) => {
          updateCastState(event.castState);
        }
      );

      console.log('[Chromecast] CAF initialized successfully');
      setStatusMessage('Buscando dispositivos...');

      return true;
    } catch (err) {
      console.error('[Chromecast] Failed to initialize CAF:', err);
      initializedRef.current = false;
      setStatus('error');
      setStatusMessage('Error al inicializar Chromecast');
      return false;
    }
  }, [updateFromSession, resetState, isConnected]);

  // Map CastState to our status
  const updateCastState = useCallback((castState: string) => {
    const framework = (window as any).cast?.framework;
    if (!framework) return;

    switch (castState) {
      case framework.CastState.CONNECTED:
        setIsAvailable(true);
        break;
      case framework.CastState.NOT_CONNECTED:
        setIsAvailable(true);
        if (!initializedRef.current || status === 'loading') {
          setStatus('available');
          setStatusMessage('Dispositivo disponible');
        }
        break;
      case framework.CastState.CONNECTING:
        setStatus('connecting');
        setStatusMessage('Conectando...');
        break;
      case framework.CastState.NO_DEVICES_AVAILABLE:
        setIsAvailable(false);
        setStatus('unavailable');
        setStatusMessage('No se encontraron dispositivos Chromecast');
        break;
    }
  }, [status]);

  // ==================== SDK LOADING ====================

  useEffect(() => {
    // Check secure context (HTTPS required for Cast)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      console.warn('[Chromecast] Not on secure context');
      setStatus('unavailable');
      setStatusMessage('Chromecast requiere HTTPS');
      return;
    }

    // Strategy 1: Check if CAF is already loaded (race condition on mobile)
    if ((window as any).cast?.framework?.CastContext) {
      console.log('[Chromecast] CAF already loaded');
      initializeCastFramework();
      return;
    }

    console.log('[Chromecast] Loading Cast SDK...');

    // Set up callback before loading script
    (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
      console.log('[Chromecast] __onGCastApiAvailable:', isAvailable);
      if (isAvailable) {
        // Give the framework a moment to fully initialize
        setTimeout(() => {
          if (!initializeCastFramework()) {
            sdkLoadRetriesRef.current = 0;
          }
        }, 100);
      } else {
        setStatus('unavailable');
        setStatusMessage('Chromecast no disponible en este navegador');
      }
    };

    // Load Cast SDK script
    const existingScript = document.querySelector('script[src*="cast_sender"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;

      script.onload = () => {
        console.log('[Chromecast] SDK script loaded');
      };

      script.onerror = () => {
        console.error('[Chromecast] Failed to load SDK script');
        setStatus('error');
        setStatusMessage('No se pudo cargar Chromecast. Verifica tu conexión.');
      };

      document.head.appendChild(script);
    }

    // Strategy 2: Aggressive polling for CAF (fixes mobile race condition)
    // Mobile Chrome sometimes fires __onGCastApiAvailable before our callback
    const pollInterval = setInterval(() => {
      if ((window as any).cast?.framework?.CastContext && !initializedRef.current) {
        console.log('[Chromecast] CAF detected via polling (mobile fix)');
        initializeCastFramework();
      }
    }, 400); // 400ms — more aggressive for mobile

    // Strategy 3: Timeout
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (!initializedRef.current) {
        console.warn('[Chromecast] SDK load timeout');
        setStatus('unavailable');
        setStatusMessage('Tiempo agotado. Asegúrate de estar en HTTPS y en la misma red WiFi.');
      }
    }, SDK_LOAD_TIMEOUT);

    return () => {
      clearTimeout(timeout);
      clearInterval(pollInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ==================== CONNECT / DISCONNECT ====================

  const connect = useCallback(async (): Promise<boolean> => {
    const context = castContextRef.current;
    if (!context) {
      console.warn('[Chromecast] Cannot connect: CAF not initialized');
      setCastError('Chromecast no está disponible. Recarga la página.');
      return false;
    }

    console.log('[Chromecast] Requesting session...');
    setStatus('connecting');
    setStatusMessage('Selecciona un dispositivo...');
    setCastError(null);

    try {
      const session = await context.requestSession();
      console.log('[Chromecast] Session established:', session.receiver?.friendlyName);
      updateFromSession(session);
      return true;
    } catch (err: any) {
      const cast = (window as any).chrome?.cast;
      if (err?.code !== cast?.ErrorCode?.CANCEL) {
        console.warn('[Chromecast] Session request failed:', err);
        setStatus('error');
        setStatusMessage('Error de conexión');
        setCastError('No se pudo conectar. Verifica que el Chromecast esté encendido y en la misma red.');
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
      return false;
    }
  }, [isAvailable, updateFromSession]);

  const disconnect = useCallback(() => {
    const context = castContextRef.current;
    const session = context?.getCurrentSession() || sessionRef.current;

    if (session) {
      console.log('[Chromecast] Stopping session...');
      try {
        session.stop(
          () => {
            console.log('[Chromecast] Session stopped');
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

  // ==================== CAST HLS ====================

  const castHLS = useCallback(async (url: string, title?: string, subtitle?: string): Promise<boolean> => {
    const context = castContextRef.current;
    if (!context) return false;

    console.log('[Chromecast] Casting HLS:', url);
    setCastError(null);

    const usingCustom = isCustomReceiver();

    try {
      // Ensure we have a session
      let session = context.getCurrentSession() || sessionRef.current;
      if (!session) {
        session = await context.requestSession();
        updateFromSession(session);
      }

      if (usingCustom) {
        // Custom receiver: send via custom namespace (handles iframe + HLS)
        return new Promise((resolve) => {
          session.sendMessage(
            CUSTOM_NAMESPACE,
            { action: 'PLAY_HLS', url, title: title || '', subtitle: subtitle || '' },
            () => {
              console.log('[Chromecast] HLS message sent to custom receiver');
              setIsCasting(true);
              setStatusMessage(`Reproduciendo en ${device?.friendlyName || 'Chromecast'}`);
              resolve(true);
            },
            (err: any) => {
              console.warn('[Chromecast] Custom message failed, trying loadMedia:', err);
              // Fallback to loadMedia
              doLoadMedia(session, url, 'application/x-mpegurl', title, subtitle, resolve);
            }
          );
        });
      } else {
        // Default Media Receiver: use loadMedia (works for HLS)
        return new Promise((resolve) => {
          doLoadMedia(session, url, 'application/x-mpegurl', title, subtitle, resolve);
        });
      }
    } catch (err) {
      console.warn('[Chromecast] castHLS error:', err);
      setCastError('No se pudo enviar a la TV');
      return false;
    }
  }, [device, updateFromSession]);

  // ==================== CAST EMBED ====================

  const castEmbed = useCallback(async (url: string, title?: string, subtitle?: string): Promise<boolean> => {
    const context = castContextRef.current;
    if (!context) return false;

    console.log('[Chromecast] Casting embed:', url);
    setCastError(null);

    const usingCustom = isCustomReceiver();

    if (!usingCustom) {
      // Default Media Receiver CANNOT render embed URLs
      console.warn('[Chromecast] Embed URL not supported by Default Media Receiver');
      setCastError(
        'Este servidor usa un reproductor web incompatible con Chromecast. ' +
        'El contenido se reproduce en tu dispositivo. Para ver en TV, configura el Custom Receiver en Ajustes > Chromecast.'
      );
      return false;
    }

    try {
      // Ensure we have a session
      let session = context.getCurrentSession() || sessionRef.current;
      if (!session) {
        session = await context.requestSession();
        updateFromSession(session);
      }

      // Custom receiver: send embed URL via custom namespace
      return new Promise((resolve) => {
        session.sendMessage(
          CUSTOM_NAMESPACE,
          { action: 'PLAY_EMBED', url, title: title || '', subtitle: subtitle || '' },
          () => {
            console.log('[Chromecast] Embed message sent to custom receiver');
            setIsCasting(true);
            setStatusMessage(`Reproduciendo en ${device?.friendlyName || 'Chromecast'}`);
            resolve(true);
          },
          (err: any) => {
            console.warn('[Chromecast] Embed message failed:', err);
            setCastError('No se pudo enviar el contenido a la TV. Intenta de nuevo.');
            resolve(false);
          }
        );
      });
    } catch (err) {
      console.warn('[Chromecast] castEmbed error:', err);
      setCastError('No se pudo conectar al dispositivo');
      return false;
    }
  }, [device, updateFromSession]);

  // ==================== STOP CASTING ====================

  const stopCast = useCallback(() => {
    const usingCustom = isCustomReceiver();
    const session = castContextRef.current?.getCurrentSession() || sessionRef.current;

    if (usingCustom && session) {
      try {
        session.sendMessage(
          CUSTOM_NAMESPACE,
          { action: 'STOP' },
          () => console.log('[Chromecast] Stop message sent'),
          () => {} // Ignore errors
        );
      } catch {}
    }

    disconnect();
  }, [disconnect]);

  // ==================== CLEANUP ====================

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
    castMode,
    clearError,
    connect,
    disconnect,
    castHLS,
    castEmbed,
    stopCast,
  };
}

// ==================== HELPER: LOAD MEDIA VIA DEFAULT RECEIVER ====================

function doLoadMedia(
  session: any,
  url: string,
  contentType: string,
  title?: string,
  subtitle?: string,
  resolve: (value: boolean) => void
) {
  const chromeCast = (window as any).chrome?.cast;
  if (!chromeCast?.media) {
    resolve(false);
    return;
  }

  const mediaInfo = new chromeCast.media.MediaInfo(url, contentType);
  const metadata = new chromeCast.media.GenericMediaMetadata();
  if (title) metadata.title = title;
  if (subtitle) metadata.subtitle = subtitle;
  mediaInfo.metadata = metadata;

  const loadRequest = new chromeCast.media.LoadRequest(mediaInfo);

  session.loadMedia(
    loadRequest,
    () => {
      console.log('[Chromecast] Media loaded successfully');
      resolve(true);
    },
    (error: any) => {
      console.warn('[Chromecast] loadMedia failed:', error.code);
      resolve(false);
    }
  );
}

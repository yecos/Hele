'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ==================== TYPES ====================

interface CastDeviceInfo {
  friendlyName: string;
  deviceId?: string;
}

export type CastStatus = 'loading' | 'unavailable' | 'available' | 'connecting' | 'connected' | 'error';
export type CastMode = 'default' | 'custom';

interface ChromecastState {
  status: CastStatus;
  isAvailable: boolean;
  isConnected: boolean;
  isCasting: boolean;
  castMode: CastMode;
  device: CastDeviceInfo | null;
  statusMessage: string;
  castError: string | null;
  clearError: () => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  castMedia: (url: string, contentType: string, title?: string, subtitle?: string) => Promise<boolean>;
  castHLS: (url: string, title?: string, subtitle?: string) => Promise<boolean>;
  castEmbed: (url: string, title?: string, subtitle?: string) => Promise<boolean>;
  stopCast: () => void;
}

const DEFAULT_RECEIVER_ID = 'CC1AD845';
const CUSTOM_NAMESPACE = 'urn:x-cast:com.xuperstream';
const SDK_LOAD_TIMEOUT = 20000;

// ==================== HOOK ====================

export function useChromecast(): ChromecastState {
  const [status, setStatus] = useState<CastStatus>('loading');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [device, setDevice] = useState<CastDeviceInfo | null>(null);
  const [statusMessage, setStatusMessage] = useState('Cargando Chromecast...');
  const [castError, setCastError] = useState<string | null>(null);

  const castContextRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const controllerRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const mountedRef = useRef(true);
  const currentReceiverIdRef = useRef<string>(DEFAULT_RECEIVER_ID);

  const clearError = useCallback(() => setCastError(null), []);

  // Determine cast mode from localStorage
  const getCastMode = useCallback((): CastMode => {
    try {
      const appId = localStorage.getItem('xs-cast-app-id');
      return appId && appId.trim().length === 12 ? 'custom' : 'default';
    } catch {
      return 'default';
    }
  }, []);

  const castMode = getCastMode();

  // Get the receiver App ID to use
  const getReceiverAppId = useCallback((): string => {
    try {
      const customId = localStorage.getItem('xs-cast-app-id');
      if (customId && /^[A-Fa-f0-9]{12}$/.test(customId.trim())) {
        return customId.trim().toUpperCase();
      }
    } catch {}
    return DEFAULT_RECEIVER_ID;
  }, []);

  // ==================== SESSION HELPERS ====================

  const updateFromSession = useCallback((session: any) => {
    if (!mountedRef.current) return;
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
    if (!mountedRef.current) return;
    sessionRef.current = null;
    setIsConnected(false);
    setIsCasting(false);
    setDevice(null);
    setStatus('available');
    setStatusMessage('Dispositivo disponible');
    setCastError(null);
  }, []);

  // ==================== RE-INITIALIZE WITH NEW APP ID ====================

  const reinitializeWithAppId = useCallback((appId: string) => {
    if (!initializedRef.current) return;

    const castFramework = (window as any).cast?.framework;
    const chromeCast = (window as any).chrome?.cast;
    if (!castFramework || !chromeCast) return;

    try {
      // End existing session if any
      const context = castFramework.CastContext.getInstance();
      const currentSession = context.getCurrentSession();
      if (currentSession) {
        try { currentSession.stop(() => {}, () => {}); } catch {}
      }

      // Update options with new receiver ID
      context.setOptions({
        receiverApplicationId: appId,
        autoJoinPolicy: chromeCast.AutoJoinPolicy.ORIGIN_SCOPED,
      });

      currentReceiverIdRef.current = appId;
      console.log('[Chromecast] Re-initialized with App ID:', appId);
    } catch (err) {
      console.error('[Chromecast] Re-init failed:', err);
    }
  }, []);

  // ==================== INITIALIZATION ====================

  const initializeCastFramework = useCallback(() => {
    if (initializedRef.current) return false;

    const castFramework = (window as any).cast?.framework;
    const chromeCast = (window as any).chrome?.cast;

    if (!castFramework || !chromeCast) {
      initializedRef.current = false;
      return false;
    }

    try {
      initializedRef.current = true;

      console.log('[Chromecast] Initializing CAF...');

      const receiverId = getReceiverAppId();
      currentReceiverIdRef.current = receiverId;

      const context = castFramework.CastContext.getInstance();
      castContextRef.current = context;

      context.setOptions({
        receiverApplicationId: receiverId,
        autoJoinPolicy: chromeCast.AutoJoinPolicy.ORIGIN_SCOPED,
      });

      // Session state changes
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

      // RemotePlayer for state tracking
      const player = new castFramework.RemotePlayer();
      const controller = new castFramework.RemotePlayerController(player);
      playerRef.current = player;
      controllerRef.current = controller;

      controller.addEventListener(
        castFramework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
        () => {
          if (player.isConnected && context.getCurrentSession()) {
            updateFromSession(context.getCurrentSession());
          } else if (!player.isConnected && isConnected) {
            resetState();
          }
        }
      );

      // Check existing session
      const currentSession = context.getCurrentSession();
      if (currentSession) {
        console.log('[Chromecast] Reconnecting to existing session');
        updateFromSession(currentSession);
        if (currentSession.media?.length > 0) {
          setIsCasting(true);
          setStatusMessage(`Reproduciendo en ${currentSession.receiver?.friendlyName || 'Chromecast'}`);
        }
      }

      // Check cast state
      const castState = context.getCastState();
      updateCastState(castState);

      context.addEventListener('caststatechanged', (event: any) => {
        updateCastState(event.castState);
      });

      console.log('[Chromecast] CAF ready — Mode:', receiverId === DEFAULT_RECEIVER_ID ? 'Default' : 'Custom', 'App ID:', receiverId);
      setStatusMessage('Buscando dispositivos...');

      return true;
    } catch (err) {
      console.error('[Chromecast] Init failed:', err);
      initializedRef.current = false;
      setStatus('error');
      setStatusMessage('Error al inicializar Chromecast');
      return false;
    }
  }, [updateFromSession, resetState, isConnected, getReceiverAppId]);

  const updateCastState = useCallback((castState: string) => {
    if (!mountedRef.current) return;
    const framework = (window as any).cast?.framework;
    if (!framework) return;

    switch (castState) {
      case framework.CastState.CONNECTED:
        setIsAvailable(true);
        break;
      case framework.CastState.NOT_CONNECTED:
        setIsAvailable(true);
        if (status === 'loading' || status === 'unavailable') {
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
        setStatusMessage('No se encontraron dispositivos');
        break;
    }
  }, [status]);

  // ==================== SDK LOADING ====================

  useEffect(() => {
    mountedRef.current = true;

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setStatus('unavailable');
      setStatusMessage('Chromecast requiere HTTPS');
      return;
    }

    // Already loaded?
    if ((window as any).cast?.framework?.CastContext) {
      initializeCastFramework();
      return;
    }

    console.log('[Chromecast] Loading SDK...');

    (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
      console.log('[Chromecast] Callback fired:', isAvailable);
      if (isAvailable) {
        setTimeout(() => {
          if (!initializedRef.current) initializeCastFramework();
        }, 100);
      } else {
        if (mountedRef.current) {
          setStatus('unavailable');
          setStatusMessage('Chromecast no disponible');
        }
      }
    };

    // Load script
    if (!document.querySelector('script[src*="cast_sender"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      script.onerror = () => {
        if (mountedRef.current) {
          setStatus('error');
          setStatusMessage('No se pudo cargar Chromecast');
        }
      };
      document.head.appendChild(script);
    }

    // Aggressive polling for mobile
    const poll = setInterval(() => {
      if ((window as any).cast?.framework?.CastContext && !initializedRef.current) {
        console.log('[Chromecast] Detected via polling');
        initializeCastFramework();
      }
    }, 400);

    const timeout = setTimeout(() => {
      clearInterval(poll);
      if (!initializedRef.current && mountedRef.current) {
        setStatus('unavailable');
        setStatusMessage('Tiempo agotado. Asegúrate de estar en HTTPS y misma red WiFi.');
      }
    }, SDK_LOAD_TIMEOUT);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      clearInterval(poll);
    };
  }, []);  

  // Watch for App ID changes in localStorage (when user saves a new ID in Settings)
  useEffect(() => {
    const checkAppIdChange = () => {
      const newAppId = getReceiverAppId();
      if (newAppId !== currentReceiverIdRef.current) {
        console.log('[Chromecast] App ID changed:', currentReceiverIdRef.current, '->', newAppId);
        reinitializeWithAppId(newAppId);
      }
    };

    // Check on storage events (cross-tab) and focus (same tab)
    window.addEventListener('storage', checkAppIdChange);
    window.addEventListener('focus', checkAppIdChange);

    return () => {
      window.removeEventListener('storage', checkAppIdChange);
      window.removeEventListener('focus', checkAppIdChange);
    };
  }, [getReceiverAppId, reinitializeWithAppId]);

  // ==================== CONNECT / DISCONNECT ====================

  const connect = useCallback(async (): Promise<boolean> => {
    const context = castContextRef.current;
    if (!context) {
      setCastError('Chromecast no disponible. Recarga la página.');
      return false;
    }

    setStatus('connecting');
    setStatusMessage('Selecciona un dispositivo...');
    setCastError(null);

    try {
      const session = await context.requestSession();
      updateFromSession(session);
      return true;
    } catch (err: any) {
      const cast = (window as any).chrome?.cast;
      if (err?.code !== cast?.ErrorCode?.CANCEL) {
        setStatus('error');
        setStatusMessage('Error de conexión');
        setCastError('No se pudo conectar. Verifica que el Chromecast esté encendido y en la misma red.');
        setTimeout(() => {
          if (mountedRef.current && isAvailable) {
            setStatus('available');
            setStatusMessage('Dispositivo disponible');
          }
        }, 3000);
      } else {
        setStatus('available');
        setStatusMessage('Dispositivo disponible');
      }
      return false;
    }
  }, [isAvailable, updateFromSession]);

  const disconnect = useCallback(() => {
    const session = castContextRef.current?.getCurrentSession() || sessionRef.current;
    if (session) {
      try {
        session.stop(
          () => { resetState(); setStatusMessage('Desconectado'); },
          () => { resetState(); }
        );
      } catch { resetState(); }
    }
  }, [resetState]);

  // ==================== SEND MESSAGE TO CUSTOM RECEIVER ====================

  const sendCustomMessage = useCallback(async (message: object): Promise<boolean> => {
    const context = castContextRef.current;
    if (!context) return false;

    try {
      let session = context.getCurrentSession() || sessionRef.current;
      if (!session) {
        session = await context.requestSession();
        updateFromSession(session);
      }

      session.sendMessage(CUSTOM_NAMESPACE, message);
      return true;
    } catch (err) {
      console.error('[Chromecast] Send message failed:', err);
      return false;
    }
  }, [updateFromSession]);

  // ==================== CAST MEDIA (Default Receiver) ====================

  const castMedia = useCallback(async (
    url: string,
    contentType: string,
    title?: string,
    subtitle?: string
  ): Promise<boolean> => {
    const context = castContextRef.current;
    if (!context) return false;

    console.log('[Chromecast] Casting media:', contentType, url.substring(0, 80));
    setCastError(null);

    try {
      let session = context.getCurrentSession() || sessionRef.current;
      if (!session) {
        session = await context.requestSession();
        updateFromSession(session);
      }

      const chromeCast = (window as any).chrome?.cast;
      if (!chromeCast?.media) return false;

      const mediaInfo = new chromeCast.media.MediaInfo(url, contentType);
      const metadata = new chromeCast.media.GenericMediaMetadata();
      if (title) metadata.title = title;
      if (subtitle) metadata.subtitle = subtitle;
      mediaInfo.metadata = metadata;

      // For HLS streams, set stream type
      if (contentType === 'application/x-mpegurl' || contentType === 'application/vnd.apple.mpegurl') {
        mediaInfo.streamType = chromeCast.media.StreamType.LIVE;
      }

      const loadRequest = new chromeCast.media.LoadRequest(mediaInfo);
      setStatusMessage(`Enviando a ${device?.friendlyName || 'Chromecast'}...`);

      return new Promise((resolve) => {
        session.loadMedia(
          loadRequest,
          () => {
            console.log('[Chromecast] Media loaded');
            setIsCasting(true);
            setStatusMessage(`Reproduciendo en ${device?.friendlyName || 'Chromecast'}`);
            resolve(true);
          },
          (error: any) => {
            console.warn('[Chromecast] Load failed:', error.code);
            setIsCasting(false);
            if (contentType.startsWith('video/') || contentType === 'application/x-mpegurl') {
              setCastError('No se pudo reproducir en TV. Intenta con otro canal.');
            }
            resolve(false);
          }
        );
      });
    } catch (err) {
      setCastError('No se pudo conectar al dispositivo');
      return false;
    }
  }, [device, updateFromSession]);

  // ==================== CAST HLS (For IPTV and direct HLS streams) ====================

  const castHLS = useCallback(async (
    url: string,
    title?: string,
    subtitle?: string
  ): Promise<boolean> => {
    console.log('[Chromecast] Casting HLS:', url.substring(0, 80));
    setCastError(null);

    const currentMode = getCastMode();

    if (currentMode === 'custom') {
      // Custom receiver: send message to load HLS in the custom receiver page
      const success = await sendCustomMessage({
        action: 'PLAY_HLS',
        url,
        title: title || '',
        subtitle: subtitle || '',
      });

      if (success) {
        setIsCasting(true);
        setStatusMessage(`Reproduciendo en ${device?.friendlyName || 'Chromecast'}`);
        return true;
      }

      // Fallback to default receiver if custom message fails
      console.log('[Chromecast] Custom message failed, falling back to default receiver');
    }

    // Default receiver: use loadMedia with HLS content type
    return castMedia(url, 'application/x-mpegurl', title, subtitle);
  }, [castMedia, device, getCastMode, sendCustomMessage]);

  // ==================== CAST EMBED (For movie/series embed URLs) ====================

  const castEmbed = useCallback(async (
    url: string,
    title?: string,
    subtitle?: string
  ): Promise<boolean> => {
    console.log('[Chromecast] Casting embed:', url.substring(0, 80));
    setCastError(null);

    const currentMode = getCastMode();

    if (currentMode === 'custom') {
      // Custom receiver: send embed URL to be loaded in iframe
      const success = await sendCustomMessage({
        action: 'PLAY_EMBED',
        url,
        title: title || '',
        subtitle: subtitle || '',
      });

      if (success) {
        setIsCasting(true);
        setStatusMessage(`Reproduciendo en ${device?.friendlyName || 'Chromecast'}`);
        return true;
      }

      // Custom receiver failed
      setCastError('No se pudo enviar el contenido al Custom Receiver.');
      return false;
    }

    // Default receiver: embed URLs cannot be cast without custom receiver
    console.warn('[Chromecast] Cannot cast embed URL without custom receiver');
    setCastError('Los servidores de películas requieren un Custom Receiver para funcionar en TV. Configúralo en Ajustes > Chromecast.');
    return false;
  }, [device, getCastMode, sendCustomMessage]);

  // ==================== STOP CAST ====================

  const stopCast = useCallback(() => {
    const currentMode = getCastMode();

    // If using custom receiver, send STOP message
    if (currentMode === 'custom' && isConnected) {
      sendCustomMessage({ action: 'STOP' }).catch(() => {});
    }

    disconnect();
  }, [disconnect, getCastMode, isConnected, sendCustomMessage]);

  // ==================== CLEANUP ====================

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        try { sessionRef.current.stop(() => {}, () => {}); } catch {}
      }
    };
  }, []);

  return {
    status,
    isAvailable,
    isConnected,
    isCasting,
    castMode,
    device,
    statusMessage,
    castError,
    clearError,
    connect,
    disconnect,
    castMedia,
    castHLS,
    castEmbed,
    stopCast,
  };
}

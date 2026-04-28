import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────

export interface CastMediaInfo {
  url: string;
  title: string;
  posterUrl?: string;
  contentType?: string;
  streamType?: 'BUFFERED' | 'LIVE';
  isEmbed?: boolean;
}

interface CastState {
  // SDK State
  initialized: boolean;
  available: boolean;
  connected: boolean;
  casting: boolean;
  loading: boolean;
  deviceName: string | null;

  // Current media
  currentMedia: CastMediaInfo | null;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volumeLevel: number;
  isMuted: boolean;

  // Actions
  initialize: () => void;
  castMedia: (url: string, title: string, posterUrl?: string) => Promise<boolean>;
  castEmbed: (embedUrl: string, title: string) => Promise<boolean>;
  stopCasting: () => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (level: number) => void;
  toggleMute: () => void;
  requestSession: () => Promise<boolean>;
}

// ─── Internal refs (outside Zustand to survive re-renders) ─

let contextRef: cast.framework.CastContext | null = null;
let playerRef: cast.framework.RemotePlayer | null = null;
let controllerRef: cast.framework.RemotePlayerController | null = null;
let sdkInitialized = false;
let stateListenersAttached = false;

// ─── Helper: sync RemotePlayer state into Zustand ──

function syncPlayerState(set: (fn: (s: CastState) => Partial<CastState>) => void) {
  if (!playerRef) return;
  try {
    set((s) => ({
      ...s,
      isPaused: playerRef!.isPaused ?? false,
      currentTime: playerRef!.currentTime ?? 0,
      duration: playerRef!.duration ?? 0,
      volumeLevel: playerRef!.volumeLevel ?? 1,
      isMuted: playerRef!.isMuted ?? false,
    }));
  } catch {
    // ignore sync errors
  }
}

// ─── Store ───────────────────────────────────────────────────

export const useCastStore = create<CastState>((set, get) => ({
  initialized: false,
  available: false,
  connected: false,
  casting: false,
  loading: false,
  deviceName: null,
  currentMedia: null,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  volumeLevel: 1,
  isMuted: false,

  // ── Initialize Cast SDK ──────────────────────────────────
  initialize: () => {
    if (sdkInitialized) return;
    sdkInitialized = true;

    const initCast = () => {
      try {
        window.__onGCastApiAvailable = (isAvailable: boolean) => {
          if (!isAvailable) return;

          try {
            const context = cast.framework.CastContext.getInstance();
            context.setOptions({
              receiverApplicationId: 'CC1AD845', // Default Media Receiver
              autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
            });
            contextRef = context;

            const player = new cast.framework.RemotePlayer();
            const controller = new cast.framework.RemotePlayerController(player);
            playerRef = player;
            controllerRef = controller;

            set({ initialized: true });

            // Attach state listeners once
            if (!stateListenersAttached) {
              stateListenersAttached = true;

              // Cast device availability / connection changes
              context.addEventListener('caststatechanged', () => {
                const castState = context.getCastState();
                set({
                  available: castState !== 'NO_DEVICES_AVAILABLE',
                  connected: castState === 'CONNECTED',
                  deviceName: context.getCurrentSession()?.receiver?.friendlyName || null,
                  casting: castState === 'CONNECTED',
                });
              });

              // Session state changes
              context.addEventListener('sessionstatechanged', () => {
                const session = context.getCurrentSession();
                const isConnected = !!session;
                set({
                  connected: isConnected,
                  casting: isConnected,
                  deviceName: session?.receiver?.friendlyName || null,
                  // Clear current media if session ended
                  currentMedia: isConnected ? get().currentMedia : null,
                });
              });

              // Remote player state sync
              controller.addEventListener(
                cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
                () => syncPlayerState(set)
              );
              controller.addEventListener(
                cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
                () => syncPlayerState(set)
              );
              controller.addEventListener(
                cast.framework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED,
                () => syncPlayerState(set)
              );
              controller.addEventListener(
                cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
                () => syncPlayerState(set)
              );
            }

            // Sync initial state
            const castState = context.getCastState();
            set({
              available: castState !== 'NO_DEVICES_AVAILABLE',
              connected: castState === 'CONNECTED',
              casting: castState === 'CONNECTED',
            });

            console.log('[Cast] SDK initialized globally');
          } catch (err) {
            console.error('[Cast] Init error:', err);
          }
        };
      } catch {
        // Cast SDK script not loaded, silently ignore
      }
    };

    if (document.readyState === 'complete') {
      initCast();
    } else {
      window.addEventListener('load', initCast);
    }
  },

  // ── Request session (connect to device) ─────────────────
  requestSession: async () => {
    if (!contextRef) return false;
    try {
      await contextRef.requestSession();
      return true;
    } catch {
      return false;
    }
  },

  // ── Cast HLS / MP4 content ──────────────────────────────
  castMedia: async (url: string, title: string, posterUrl?: string) => {
    if (!contextRef) return false;

    set({ loading: true });
    try {
      await contextRef.requestSession();
      const session = contextRef.getCurrentSession();
      if (!session) {
        set({ loading: false });
        return false;
      }

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
            set({
              loading: false,
              casting: true,
              connected: true,
              deviceName: session.receiver?.friendlyName || null,
              currentMedia: { url, title, posterUrl, contentType, streamType: mediaInfo.streamType as 'BUFFERED' | 'LIVE' },
            });
            resolve(true);
          },
          (err) => {
            console.error('[Cast] Load media error:', err);
            set({ loading: false });
            resolve(false);
          }
        );
      });
    } catch (err) {
      console.error('[Cast] Session error:', err);
      set({ loading: false });
      return false;
    }
  },

  // ── Cast embed content (best effort) ────────────────────
  castEmbed: async (embedUrl: string, title: string) => {
    if (!contextRef) return false;

    set({ loading: true });
    try {
      await contextRef.requestSession();
      const session = contextRef.getCurrentSession();
      if (!session) {
        set({ loading: false });
        return false;
      }

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
            set({
              loading: false,
              casting: true,
              connected: true,
              deviceName: session.receiver?.friendlyName || null,
              currentMedia: { url: embedUrl, title, isEmbed: true, streamType: 'BUFFERED' },
            });
            resolve(true);
          },
          () => {
            // Default receiver can't handle embed → open in new tab
            window.open(embedUrl, '_blank');
            set({ loading: false });
            resolve(false);
          }
        );
      });
    } catch {
      window.open(embedUrl, '_blank');
      set({ loading: false });
      return false;
    }
  },

  // ── Stop casting ────────────────────────────────────────
  stopCasting: () => {
    if (contextRef) {
      contextRef.endCurrentSession(true);
    }
    set({
      connected: false,
      casting: false,
      deviceName: null,
      currentMedia: null,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      loading: false,
    });
  },

  // ── Remote controls ─────────────────────────────────────
  togglePlayPause: () => {
    controllerRef?.playOrPause();
    set((s) => ({ isPaused: !s.isPaused }));
  },

  seekTo: (time: number) => {
    if (!playerRef) return;
    try {
      playerRef.currentTime = time;
      controllerRef?.seek();
      set({ currentTime: time });
    } catch {
      // ignore seek errors
    }
  },

  setVolume: (level: number) => {
    if (!playerRef) return;
    try {
      playerRef.volumeLevel = Math.max(0, Math.min(1, level));
      controllerRef?.setVolumeLevel();
      set({ volumeLevel: level });
    } catch {
      // ignore volume errors
    }
  },

  toggleMute: () => {
    controllerRef?.muteOrUnmute();
    set((s) => ({ isMuted: !s.isMuted }));
  },
}));

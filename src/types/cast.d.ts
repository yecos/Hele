// Google Cast SDK type declarations

interface CastApiWindow extends Window {
  __onGCastApiAvailable: (isAvailable: boolean) => void;
  cast: typeof chrome.cast;
  chrome: typeof chrome & {
    cast: typeof chrome.cast;
  };
}

declare namespace chrome.cast {
  enum SessionStatus {
    STOPPED = 'stopped',
    STARTED = 'started',
    RESUMED = 'resumed',
  }

  enum ReceiverAvailability {
    AVAILABLE = 'available',
    NOT_AVAILABLE = 'not_available',
  }

  enum AutoJoinPolicy {
    ORIGIN_SCOPED = 'ORIGIN_SCOPED',
    PAGE_SCOPED = 'PAGE_SCOPED',
    TAB_AND_ORIGIN_SCOPED = 'TAB_AND_ORIGIN_SCOPED',
  }

  class SessionRequest {
    appId: string;
    constructor(appId: string);
  }

  class ApiConfig {
    sessionRequest: SessionRequest;
    sessionListener: (session: Session) => void;
    receiverAvailabilityListener: (availability: ReceiverAvailability) => void;
    autoJoinPolicy: AutoJoinPolicy;
    constructor(
      sessionRequest: SessionRequest,
      sessionListener: (session: Session) => void,
      receiverAvailabilityListener: (availability: ReceiverAvailability) => void,
      autoJoinPolicy?: AutoJoinPolicy
    );
  }

  class Session {
    media: Media[];
    receiver: { friendlyName: string };
    status: string;
    loadMedia(
      request: LoadRequest,
      onSuccess?: (media: Media) => void,
      onError?: (error: Error) => void
    ): void;
    stop(
      onSuccess?: () => void,
      onError?: (error: Error) => void
    ): void;
  }

  class MediaInfo {
    contentId: string;
    contentType: string;
    metadata: MediaMetadata | null;
    streamType: string;
    constructor(contentId: string, contentType: string);
  }

  class MediaMetadata {
    metadataType: number;
    title: string;
    images: { url: string }[];
    constructor(metadataType?: number);
  }

  class GenericMediaMetadata extends MediaMetadata {
    constructor();
  }

  class LoadRequest {
    mediaInfo: MediaInfo;
    currentTime: number;
    autoplay: boolean;
    constructor(mediaInfo: MediaInfo);
  }

  enum MediaMetadataType {
    GENERIC = 0,
    MOVIE = 1,
    TV_SHOW = 2,
    MUSIC_TRACK = 3,
    PHOTO = 4,
  }

  function initialize(
    apiConfig: ApiConfig,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ): void;

  function requestSession(
    onSuccess?: (session: Session) => void,
    onError?: (error: Error) => void
  ): void;
}

declare namespace cast.framework {
  class CastContext {
    static getInstance(): CastContext;
    getCurrentSession(): chrome.cast.Session | null;
    getCastState(): string;
    setOptions(options: CastOptions): void;
    requestSession(): Promise<chrome.cast.Session>;
    endCurrentSession(stopCasting: boolean): void;
    addEventListener(type: string, listener: (event: { session: chrome.cast.Session }) => void): void;
    removeEventListener(type: string, listener: (event: { session: chrome.cast.Session }) => void): void;
  }

  interface CastOptions {
    receiverApplicationId: string;
    autoJoinPolicy: chrome.cast.AutoJoinPolicy;
  }

  enum RemotePlayerEventType {
    IS_CONNECTED_CHANGED = 'isConnectedChanged',
    CURRENT_TIME_CHANGED = 'currentTimeChanged',
    VOLUME_LEVEL_CHANGED = 'volumeLevelChanged',
    IS_PAUSED_CHANGED = 'isPausedChanged',
    PLAYER_STATE_CHANGED = 'playerStateChanged',
  }

  class RemotePlayer {
    isConnected: boolean;
    currentTime: number;
    duration: number;
    volumeLevel: number;
    isPaused: boolean;
    playerState: string;
  }

  class RemotePlayerController {
    constructor(player: RemotePlayer);
    addEventListener(eventType: string, listener: (event: { value: unknown }) => void): void;
    removeEventListener(eventType: string, listener: (event: { value: unknown }) => void): void;
    playOrPause(): void;
    stop(): void;
    seek(): void;
    setVolumeLevel(): void;
    muteOrUnmute(): void;
  }
}

declare const window: CastApiWindow;

export {};

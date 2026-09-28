import { create } from 'zustand';

interface IptvFavoritesState {
  favorites: string[];
  toggleIptvFavorite: (id: string) => void;
  isIptvFavorite: (id: string) => boolean;
}

function readStringArray(key: string): string[] {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (error) {
    console.warn(`[Live] Corrupted storage for ${key}, resetting:`, error);
    return [];
  }
}

export const useIptvFavoritesStore = create<IptvFavoritesState>((set, get) => ({
  favorites: readStringArray('xs-iptv-favorites'),

  toggleIptvFavorite: (id) => {
    const current = get().favorites;
    const updated = current.includes(id)
      ? current.filter((favorite) => favorite !== id)
      : [...current, id];

    localStorage.setItem('xs-iptv-favorites', JSON.stringify(updated));
    set({ favorites: updated });
  },

  isIptvFavorite: (id) => get().favorites.includes(id),
}));

interface IptvRecentItem {
  id: string;
  timestamp: number;
}

interface IptvRecentState {
  recent: IptvRecentItem[];
  addToRecent: (id: string) => void;
}

function readRecent(): IptvRecentItem[] {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(localStorage.getItem('xs-iptv-recent') || '[]');
  } catch (error) {
    console.warn('[IPTV Recent] Corrupted data, resetting:', error);
    return [];
  }
}

export const useIptvRecentStore = create<IptvRecentState>((set, get) => ({
  recent: readRecent(),

  addToRecent: (id) => {
    const current = get().recent.filter((item) => item.id !== id);
    const updated = [{ id, timestamp: Date.now() }, ...current].slice(0, 20);

    localStorage.setItem('xs-iptv-recent', JSON.stringify(updated));
    set({ recent: updated });
  },
}));

interface XuperClientState {
  isLoggedIn: boolean;
  username: string;
  isConnecting: boolean;
  error: string;
  available: boolean;
  dcsOk: boolean;
  portalOk: boolean;
  latencyMs: number;
  activePortal: string;
  xuperLogin: (username: string, password: string) => Promise<boolean>;
  xuperLogout: () => void;
  checkXuperStatus: () => Promise<void>;
}

export const useXuperStore = create<XuperClientState>((set) => ({
  isLoggedIn: false,
  username: '',
  isConnecting: false,
  error: '',
  available: false,
  dcsOk: false,
  portalOk: false,
  latencyMs: 0,
  activePortal: '',

  xuperLogin: async (username, password) => {
    set({ isConnecting: true, error: '' });

    try {
      const response = await fetch('/api/xuper/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!data.success) {
        set({
          isConnecting: false,
          error: data.error || 'Login fallido',
        });
        return false;
      }

      localStorage.setItem(
        'xuper-session',
        JSON.stringify({ username, loggedIn: true })
      );
      set({
        isLoggedIn: true,
        username,
        isConnecting: false,
        error: '',
      });
      return true;
    } catch (error) {
      console.warn('[Xuper] Login connection error:', error);
      set({
        isConnecting: false,
        error: 'Error de conexión',
      });
      return false;
    }
  },

  xuperLogout: () => {
    localStorage.removeItem('xuper-session');
    set({
      isLoggedIn: false,
      username: '',
      error: '',
    });
  },

  checkXuperStatus: async () => {
    try {
      const response = await fetch('/api/xuper/status');
      const data = await response.json();

      if (data.success) {
        set({
          available: data.connectivity?.available || false,
          dcsOk: data.connectivity?.dcsOk || false,
          portalOk: data.connectivity?.portalOk || false,
          latencyMs: data.connectivity?.latencyMs || 0,
          activePortal: data.connectivity?.activePortal || '',
          isLoggedIn: data.client?.isLoggedIn || false,
        });
      }
    } catch (error) {
      console.warn('[Xuper] Status check error:', error);
      set({
        available: false,
        dcsOk: false,
        portalOk: false,
      });
    }
  },
}));

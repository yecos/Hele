'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  Tv,
  Film,
  Play,
  Settings,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  Server,
  X,
  Info,
  FileText,
  CheckCircle,
  Upload,
  RadioTower,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { parseM3U, parseM3UFromUrl, filterChannels, m3uToMovie, type M3UChannel, type M3UParseResult } from '@/lib/m3uParser';
import { useChannelValidation } from '@/hooks/useChannelValidation';
import { getChannelExtendedInfo } from '@/lib/channelInfo';

// ─── Types ──────────────────────────────────────────────────

type SourceMode = 'xtream' | 'm3u';

interface XtreamConfig {
  serverUrl: string;
  username: string;
  password: string;
}

interface Channel {
  id: number;
  name: string;
  icon: string;
  category: string;
  streamUrl: string;
  type: 'live' | 'vod' | 'series';
  rating?: string;
}

interface Category {
  id: string;
  name: string;
}

// ─── Component ───────────────────────────────────────────────

export default function IPTVView() {
  const { setPlayerState, setCurrentView, setSelectedMovie } = useAppStore();

  // Source mode
  const [sourceMode, setSourceMode] = useState<SourceMode>('xtream');

  // Xtream state
  const [config, setConfig] = useState<XtreamConfig | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'vod' | 'series'>('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [userInfo, setUserInfo] = useState<{ username: string; status: string; exp_date: string; max_connections: string; active_cons: string } | null>(null);

  // M3U state
  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uChannels, setM3uChannels] = useState<M3UChannel[]>([]);
  const [m3uGroups, setM3uGroups] = useState<{ id: string; name: string; count: number }[]>([]);
  const [loadingM3U, setLoadingM3U] = useState(false);
  const [m3uError, setM3uError] = useState('');
  const [m3uConnected, setM3uConnected] = useState(false);
  const [m3uParseInfo, setM3uParseInfo] = useState<M3UParseResult | null>(null);
  const [selectedM3uCat, setSelectedM3uCat] = useState('all');
  const [m3uSearchQuery, setM3uSearchQuery] = useState('');
  const validation = useChannelValidation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build a quick lookup map from validation results
  const validationResultMap = new Map<string, string>();
  for (const r of validation.results) {
    validationResultMap.set(r.channel.url, r.status);
  }

  // ─── Load saved config ────────────────────────────────────

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('iptv_source_mode') as SourceMode | null;
      if (savedMode === 'm3u') {
        const savedUrl = localStorage.getItem('m3u_url');
        if (savedUrl) {
          setSourceMode('m3u');
          setM3uUrl(savedUrl);
          // Re-parse the playlist
          loadM3UPlaylist(savedUrl);
          return;
        }
      }

      const saved = localStorage.getItem('xtream_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        setShowSetup(false);
        connectToServer(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // ─── Xtream Connection Logic ──────────────────────────────

  const connectToServer = async (cfg: XtreamConfig) => {
    setConnecting(true);
    setError('');

    try {
      // Normalize URL
      let serverUrl = cfg.serverUrl.trim().replace(/\/$/, '');

      const proxyUrl = `/api/xtream-proxy?url=${encodeURIComponent(
        `${serverUrl}/player_api.php?username=${cfg.username}&password=${cfg.password}&action=get_user_info`
      )}`;

      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Error de conexión');

      const data = await res.json();

      if (data.user_info && data.user_info.auth === 1) {
        setConfig({ ...cfg, serverUrl });
        setConnected(true);
        setSourceMode('xtream');
        setShowSetup(false);
        setUserInfo(data.user_info);
        localStorage.setItem('xtream_config', JSON.stringify({ ...cfg, serverUrl }));
        localStorage.setItem('iptv_source_mode', 'xtream');
        setError('');
        // Load default tab (live categories)
        loadCategories({ ...cfg, serverUrl }, 'live');
      } else {
        throw new Error(data.user_info?.message || 'Credenciales inválidas');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar');
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  const loadCategories = async (cfg: XtreamConfig | null, tab: 'live' | 'vod' | 'series') => {
    if (!cfg) return;
    setLoadingChannels(true);

    try {
      const actionMap = {
        live: 'get_live_categories',
        vod: 'get_vod_categories',
        series: 'get_series_categories',
      };
      const proxyUrl = `/api/xtream-proxy?url=${encodeURIComponent(
        `${cfg.serverUrl}/player_api.php?username=${cfg.username}&password=${cfg.password}&action=${actionMap[tab]}`
      )}`;

      const res = await fetch(proxyUrl);
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
        setSelectedCat('all');
        // Load streams
        loadStreams(cfg, tab, undefined);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const loadStreams = async (cfg: XtreamConfig | null, tab: 'live' | 'vod' | 'series', categoryId?: string) => {
    if (!cfg) return;
    setLoadingChannels(true);

    try {
      const actionMap = {
        live: 'get_live_streams',
        vod: 'get_vod_streams',
        series: 'get_series',
      };
      const params = new URLSearchParams({
        action: actionMap[tab],
        username: cfg.username,
        password: cfg.password,
      });
      if (categoryId) params.set('category_id', categoryId);

      const proxyUrl = `/api/xtream-proxy?url=${encodeURIComponent(
        `${cfg.serverUrl}/player_api.php?${params.toString()}`
      )}`;

      const res = await fetch(proxyUrl);
      if (res.ok) {
        const data = await res.json();
        const items: Channel[] = Array.isArray(data)
          ? data.map((item: Record<string, unknown>) => {
              const id = item.stream_id || item.series_id || item.num || 0;
              let streamUrl = '';
              const ext = item.container_extension || 'ts';
              if (tab === 'live') {
                streamUrl = `${cfg.serverUrl}/live/${cfg.username}/${cfg.password}/${id}.${ext}`;
              } else if (tab === 'vod') {
                streamUrl = `${cfg.serverUrl}/movie/${cfg.username}/${cfg.password}/${id}.${ext}`;
              }

              return {
                id: id as number,
                name: item.name as string || 'Sin nombre',
                icon: item.stream_icon || item.cover || '',
                category: item.category_id as string || '',
                streamUrl,
                type: tab,
                rating: item.rating as string,
              };
            })
          : [];
        setChannels(items);
      }
    } catch (err) {
      console.error('Error loading streams:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleTabChange = (tab: 'live' | 'vod' | 'series') => {
    setActiveTab(tab);
    if (config) {
      loadCategories(config, tab);
    }
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCat(catId);
    if (config) {
      loadStreams(config, activeTab, catId === 'all' ? undefined : catId);
    }
  };

  const playChannel = (channel: Channel) => {
    if (channel.type === 'series') {
      // For series, open detail modal would be needed
      // For now, we'll just show an alert
      alert('Las series se reproducen por episodio. Funcionalidad en desarrollo.');
      return;
    }

    const movieObj = {
      id: String(channel.id),
      title: channel.name,
      description: `Canal de ${activeTab === 'live' ? 'TV en vivo' : 'VOD'}`,
      posterUrl: channel.icon || `https://picsum.photos/seed/${channel.id}/400/600`,
      backdropUrl: `https://picsum.photos/seed/${channel.id}-bg/1920/1080`,
      videoUrl: channel.streamUrl,
      year: 2025,
      duration: activeTab === 'live' ? '24/7' : '',
      rating: parseFloat(channel.rating || '0'),
      genre: channel.category,
      category: activeTab === 'live' ? 'tv' : 'peliculas',
      isLive: activeTab === 'live',
      featured: false,
      trending: false,
    };

    setSelectedMovie(movieObj);
    const sourceType = channel.streamUrl.includes('.m3u8') ? 'hls' as const : 'direct' as const;
    const videoSource = {
      id: String(channel.id),
      name: 'Servidor IPTV',
      type: sourceType,
      mode: 'native' as const,
      url: channel.streamUrl,
      quality: 'Auto',
      server: 'iptv',
    };
    setPlayerState({
      sources: [{
        server: 'IPTV',
        sources: [videoSource],
      }],
      currentSource: videoSource,
      isTVShow: false,
      selectedSeason: 1,
      selectedEpisode: 1,
    });
    setCurrentView('player');
  };

  // ─── M3U Connection Logic ─────────────────────────────────

  const loadM3UPlaylist = async (url: string) => {
    setLoadingM3U(true);
    setM3uError('');
    try {
      const result = await parseM3UFromUrl(url);
      setM3uChannels(result.channels);
      setM3uGroups(result.groups);
      setM3uParseInfo(result);
      if (result.channels.length > 0) {
        setM3uConnected(true);
        setShowSetup(false);
        setSourceMode('m3u');
        localStorage.setItem('m3u_url', url);
        localStorage.setItem('iptv_source_mode', 'm3u');
      } else {
        setM3uError(result.errors[0] || 'No se encontraron canales en la playlist');
      }
    } catch (err) {
      setM3uError(err instanceof Error ? err.message : 'Error al cargar la playlist');
    } finally {
      setLoadingM3U(false);
    }
  };

  const loadM3UFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const result = parseM3U(content);
        setM3uChannels(result.channels);
        setM3uGroups(result.groups);
        setM3uParseInfo(result);
        if (result.channels.length > 0) {
          setM3uConnected(true);
          setShowSetup(false);
          setSourceMode('m3u');
          localStorage.setItem('iptv_source_mode', 'm3u');
          setM3uError('');
        } else {
          setM3uError(result.errors[0] || 'No se encontraron canales en el archivo');
        }
      } catch (err) {
        setM3uError(err instanceof Error ? err.message : 'Error al procesar el archivo M3U');
      }
    };
    reader.onerror = () => {
      setM3uError('Error al leer el archivo');
    };
    reader.readAsText(file);
  };

  const playM3UChannel = (ch: M3UChannel) => {
    const movie = m3uToMovie(ch);
    setSelectedMovie(movie);
    const sourceType = ch.url.includes('.m3u8') ? 'hls' as const : 'direct' as const;
    const videoSource = {
      id: ch.id,
      name: ch.name,
      type: sourceType,
      mode: 'native' as const,
      url: ch.url,
      quality: ch.quality || 'Auto',
      server: 'm3u',
    };
    setPlayerState({
      sources: [{
        server: 'M3U',
        sources: [videoSource],
      }],
      currentSource: videoSource,
      isTVShow: false,
      selectedSeason: 1,
      selectedEpisode: 1,
    });
    setCurrentView('player');
  };

  // ─── Disconnect / Switch ──────────────────────────────────

  const disconnect = () => {
    setConfig(null);
    setConnected(false);
    setCategories([]);
    setChannels([]);
    setUserInfo(null);
    localStorage.removeItem('xtream_config');
    localStorage.removeItem('iptv_source_mode');
    setShowSetup(true);
  };

  const disconnectM3U = () => {
    setM3uUrl('');
    setM3uChannels([]);
    setM3uGroups([]);
    setM3uConnected(false);
    setM3uParseInfo(null);
    setSelectedM3uCat('all');
    setM3uSearchQuery('');
    localStorage.removeItem('m3u_url');
    localStorage.removeItem('iptv_source_mode');
    setShowSetup(true);
  };

  const switchToXtream = () => {
    if (connected && config) {
      setSourceMode('xtream');
      localStorage.setItem('iptv_source_mode', 'xtream');
    } else {
      setSourceMode('xtream');
      setShowSetup(true);
    }
  };

  const switchToM3U = () => {
    if (m3uConnected) {
      setSourceMode('m3u');
      localStorage.setItem('iptv_source_mode', 'm3u');
    } else {
      setSourceMode('m3u');
      setShowSetup(true);
    }
  };

  // ─── Filter channels by search ────────────────────────────
  const filteredChannels = searchQuery
    ? channels.filter((ch) => ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : channels;

  const filteredM3UChannels = m3uChannels.filter((ch) => {
    const matchesSearch = !m3uSearchQuery || ch.name.toLowerCase().includes(m3uSearchQuery.toLowerCase());
    const matchesGroup = selectedM3uCat === 'all' || ch.group === selectedM3uCat;
    return matchesSearch && matchesGroup;
  });

  // ─── Setup Form ───────────────────────────────────────────
  if (showSetup) {
    return (
      <div className="min-h-screen bg-black pt-20 pb-16 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
              <Tv className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Conectar IPTV</h1>
            <p className="text-gray-400 text-sm mt-2">
              Elige tu fuente de contenido IPTV para acceder a todos los canales, películas y series
            </p>
          </div>

          {/* Source Mode Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setSourceMode('xtream')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                sourceMode === 'xtream'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Server className="h-4 w-4" />
              Xtream Codes
            </button>
            <button
              onClick={() => setSourceMode('m3u')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                sourceMode === 'm3u'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4" />
              M3U Playlist
            </button>
          </div>

          <AnimatePresence mode="wait">
            {sourceMode === 'xtream' ? (
              <motion.div
                key="xtream-setup"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 space-y-4"
              >
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">URL del Servidor</label>
                  <Input
                    placeholder="http://servidor.com:8080"
                    id="xtream-url"
                    defaultValue=""
                    className="bg-gray-800 border-gray-700 text-white h-11"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Usuario</label>
                  <Input
                    placeholder="tu_usuario"
                    id="xtream-user"
                    defaultValue=""
                    className="bg-gray-800 border-gray-700 text-white h-11"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Contraseña</label>
                  <Input
                    type="password"
                    placeholder="tu_contraseña"
                    id="xtream-pass"
                    defaultValue=""
                    className="bg-gray-800 border-gray-700 text-white h-11"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-600/10 border border-red-600/30 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                )}

                <Button
                  onClick={() => {
                    const serverUrl = (document.getElementById('xtream-url') as HTMLInputElement)?.value || '';
                    const username = (document.getElementById('xtream-user') as HTMLInputElement)?.value || '';
                    const password = (document.getElementById('xtream-pass') as HTMLInputElement)?.value || '';
                    connectToServer({ serverUrl, username, password });
                  }}
                  disabled={connecting}
                  className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {connecting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Conectando...</>
                  ) : (
                    <><Wifi className="h-4 w-4 mr-2" /> Conectar</>
                  )}
                </Button>

                <div className="bg-gray-800/50 rounded-lg p-3 mt-2">
                  <p className="text-xs text-gray-500 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    Compatible con cualquier proveedor IPTV que use Xtream Codes Panel (Xuper TV, Magis TV, etc.)
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="m3u-setup"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 space-y-4"
              >
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">URL de la Playlist M3U</label>
                  <Input
                    placeholder="https://ejemplo.com/playlist.m3u"
                    value={m3uUrl}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white h-11"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">o sube un archivo .m3u</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 h-20 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-red-600/50 hover:bg-gray-800/50 transition-all"
                  >
                    <Upload className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-400">
                      Haz clic para seleccionar archivo .m3u
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".m3u,.m3u8"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) loadM3UFromFile(file);
                    }}
                  />
                </div>

                {m3uError && (
                  <div className="flex items-center gap-2 bg-red-600/10 border border-red-600/30 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-red-400 text-sm">{m3uError}</span>
                  </div>
                )}

                {/* Parse Info */}
                {m3uParseInfo && m3uParseInfo.channels.length > 0 && !m3uConnected && (
                  <div className="flex items-center gap-2 bg-green-600/10 border border-green-600/30 rounded-lg p-3">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-green-400 text-sm">
                      {m3uParseInfo.channels.length} canales encontrados en {m3uParseInfo.groups.length} grupos
                      {m3uParseInfo.errors.length > 0 && ` (${m3uParseInfo.errors.length} errores)`}
                    </span>
                  </div>
                )}

                <Button
                  onClick={() => {
                    if (m3uUrl.trim()) {
                      loadM3UPlaylist(m3uUrl.trim());
                    }
                  }}
                  disabled={loadingM3U || !m3uUrl.trim()}
                  className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {loadingM3U ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cargando playlist...</>
                  ) : (
                    <><Wifi className="h-4 w-4 mr-2" /> Conectar</>
                  )}
                </Button>

                <div className="bg-gray-800/50 rounded-lg p-3 mt-2">
                  <p className="text-xs text-gray-500 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    Compatible con playlists M3U/M3U8 de cualquier proveedor IPTV. También puedes usar archivos locales con extensión .m3u o .m3u8.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // ─── M3U Main Browser ─────────────────────────────────────
  if (sourceMode === 'm3u' && m3uConnected) {
    return (
      <div className="min-h-screen bg-black pt-20 pb-16">
        {/* Header */}
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
                <Radio className="h-5 w-5 text-green-500 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">IPTV — M3U</h1>
                <p className="text-gray-500 text-xs mt-0.5">
                  Playlist M3U · {m3uChannels.length} canales · {m3uGroups.length} grupos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Source mode switcher */}
              <Button
                variant="ghost"
                size="sm"
                onClick={switchToXtream}
                className="text-gray-500 hover:text-white text-xs"
                disabled={!connected}
              >
                <Server className="h-3.5 w-3.5 mr-1" />
                Xtream
              </Button>
              <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
              <Button variant="ghost" size="sm" onClick={disconnectM3U} className="text-gray-400 hover:text-white">
                <WifiOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* M3U Groups as filter buttons */}
        {m3uGroups.length > 0 && (
          <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <ChevronDown className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-400 font-medium">Grupos</span>
              <span className="text-xs text-gray-600">({m3uGroups.length})</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                onClick={() => setSelectedM3uCat('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedM3uCat === 'all'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                }`}
              >
                Todos ({m3uChannels.length})
              </button>
              {m3uGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedM3uCat(group.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedM3uCat === group.id
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {group.name} ({group.count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search + Actions */}
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar canales..."
                value={m3uSearchQuery}
                onChange={(e) => setM3uSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-800 text-white h-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => validation.startValidation(filteredM3UChannels)}
              disabled={validation.isRunning}
              className="border-gray-800 text-gray-400 hover:text-white h-10"
            >
              {validation.isRunning ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> {validation.progress.percentage}%</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-1" /> Validar</>
              )}
            </Button>
          </div>
        </div>

        {/* Validation Progress */}
        {validation.isRunning && (
          <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-4">
            <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Validando canales...</span>
                <span className="text-xs text-gray-500">
                  {validation.progress.checked}/{validation.progress.total} · {validation.progress.online} válidos · {validation.progress.offline} inválidos
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <motion.div
                  className="bg-green-500 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${validation.progress.percentage}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* M3U Channel Grid */}
        <div className="px-4 sm:px-8 md:px-12 lg:px-16">
          {filteredM3UChannels.length === 0 ? (
            <div className="text-center py-20">
              <Tv className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No hay contenido</p>
              <p className="text-gray-600 text-sm">
                {m3uSearchQuery ? 'Sin resultados para tu búsqueda' : 'No se encontraron canales en este grupo'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-16">
              {filteredM3UChannels.slice(0, 100).map((channel, index) => {
                const channelStatus = validationResultMap.get(channel.url);
                const isValid = channelStatus === 'online';
                const isInvalid = channelStatus === 'offline' || channelStatus === 'timeout' || channelStatus === 'error';

                return (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.5) }}
                    className={`group bg-gray-900/80 border rounded-lg overflow-hidden hover:border-red-600/50 transition-all cursor-pointer ${
                      isInvalid ? 'border-red-900/40 opacity-60' : isValid ? 'border-green-900/40' : 'border-gray-800'
                    }`}
                    onClick={() => playM3UChannel(channel)}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-gray-600 text-lg">${channel.name.charAt(0)}</span>`;
                            }}
                          />
                        ) : (
                          <span className="text-gray-600 text-lg">{channel.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                          {channel.name}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {channel.group && (
                            <span className="text-xs text-gray-600 truncate max-w-[120px]">
                              {channel.group}
                            </span>
                          )}
                          {channel.url.includes('.m3u8') && (
                            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-[10px] px-1 py-0">
                              HLS
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Validation indicator */}
                      {isValid && (
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                      {isInvalid && (
                        <div className="flex-shrink-0">
                          <X className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                      {/* Play button */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                          <Play className="h-3.5 w-3.5 text-white ml-0.5 fill-white" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {filteredM3UChannels.length > 100 && (
                <div className="text-center py-8 col-span-full">
                  <p className="text-gray-500 text-sm">
                    Mostrando 100 de {filteredM3UChannels.length} resultados. Usa la búsqueda para filtrar.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Main IPTV Browser (Xtream) ───────────────────────────
  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      {/* Header */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
              <Radio className="h-5 w-5 text-green-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">IPTV</h1>
              {userInfo && (
                <p className="text-gray-500 text-xs mt-0.5">
                  {userInfo.username} · Conectado · Expira: {userInfo.exp_date ? new Date(parseInt(userInfo.exp_date) * 1000).toLocaleDateString('es') : 'N/A'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Source mode switcher */}
            <Button
              variant="ghost"
              size="sm"
              onClick={switchToM3U}
              className="text-gray-500 hover:text-white text-xs"
              disabled={!m3uConnected}
            >
              <FileText className="h-3.5 w-3.5 mr-1" />
              M3U
            </Button>
            <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
              <Wifi className="h-3 w-3 mr-1" />
              Online
            </Badge>
            <Button variant="ghost" size="sm" onClick={disconnect} className="text-gray-400 hover:text-white">
              <WifiOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-6">
        <div className="flex gap-2">
          {([
            { id: 'live' as const, label: 'TV en Vivo', icon: Radio },
            { id: 'vod' as const, label: 'Películas', icon: Film },
            { id: 'series' as const, label: 'Series', icon: Tv },
          ]).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + Refresh */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder={`Buscar ${activeTab === 'live' ? 'canales' : activeTab === 'vod' ? 'películas' : 'series'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-800 text-white h-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => config && loadStreams(config, activeTab, selectedCat === 'all' ? undefined : selectedCat)}
            className="border-gray-800 text-gray-400 hover:text-white h-10 w-10"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCat === 'all'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
              }`}
            >
              Todos ({channels.length})
            </button>
            {categories.slice(0, 20).map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCat === cat.id
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Channel Grid */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16">
        {loadingChannels ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-red-500 animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Cargando {activeTab === 'live' ? 'canales' : 'contenido'}...</p>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="text-center py-20">
            <Tv className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No hay contenido</p>
            <p className="text-gray-600 text-sm">
              {searchQuery ? 'Sin resultados para tu búsqueda' : 'No se encontraron canales en esta categoría'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-16">
            {filteredChannels.slice(0, 100).map((channel, index) => (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.5) }}
                className="group bg-gray-900/80 border border-gray-800 rounded-lg overflow-hidden hover:border-red-600/50 transition-all cursor-pointer"
                onClick={() => playChannel(channel)}
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {channel.icon ? (
                      <img
                        src={channel.icon}
                        alt={channel.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-gray-600 text-lg">${channel.name.charAt(0)}</span>`;
                        }}
                      />
                    ) : (
                      <span className="text-gray-600 text-lg">{channel.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                      {channel.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {activeTab === 'live' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      )}
                      <span className="text-xs text-gray-500">
                        {channel.rating && parseFloat(channel.rating) > 0
                          ? `${parseFloat(channel.rating).toFixed(1)} ★`
                          : activeTab === 'live' ? 'En vivo' : 'Disponible'}
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                      <Play className="h-3.5 w-3.5 text-white ml-0.5 fill-white" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredChannels.length > 100 && (
              <div className="text-center py-8 col-span-full">
                <p className="text-gray-500 text-sm">
                  Mostrando 100 de {filteredChannels.length} resultados. Usa la búsqueda para filtrar.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

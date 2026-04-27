'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';

// ─── Types ──────────────────────────────────────────────────

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

  // Load saved config
  useEffect(() => {
    try {
      const saved = localStorage.getItem('xtream_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        setShowSetup(false);
        connectToServer(parsed);
      }
    } catch { /* ignore */ }
  }, []);

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
        setShowSetup(false);
        setUserInfo(data.user_info);
        localStorage.setItem('xtream_config', JSON.stringify({ ...cfg, serverUrl }));
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
    setPlayerState({
      sources: [{
        server: 'IPTV',
        sources: [{
          id: String(channel.id),
          name: 'Servidor IPTV',
          type: channel.streamUrl.includes('.m3u8') ? 'hls' as const : 'direct' as const,
          url: channel.streamUrl,
          quality: 'Auto',
          server: 'iptv',
        }],
      }],
      currentSource: {
        id: String(channel.id),
        name: 'Servidor IPTV',
        type: channel.streamUrl.includes('.m3u8') ? 'hls' as const : 'direct' as const,
        url: channel.streamUrl,
        quality: 'Auto',
        server: 'iptv',
      },
      isTVShow: false,
      selectedSeason: 1,
      selectedEpisode: 1,
    });
    setCurrentView('player');
  };

  const disconnect = () => {
    setConfig(null);
    setConnected(false);
    setCategories([]);
    setChannels([]);
    setUserInfo(null);
    localStorage.removeItem('xtream_config');
    setShowSetup(true);
  };

  // Filter channels by search
  const filteredChannels = searchQuery
    ? channels.filter((ch) => ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : channels;

  // ─── Setup Form ─────────────────────────────────────────────
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
              Ingresa los datos de tu servidor Xtream Codes para acceder a todos los canales, películas y series
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 space-y-4">
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
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Main IPTV Browser ──────────────────────────────────────
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

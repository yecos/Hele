'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Play,
  Search,
  Loader2,
  ChevronRight,
  X,
  RefreshCw,
  AlertCircle,
  Tv,
  Info,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  ShieldCheck,
  Cast,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useCastStore } from '@/lib/cast-store';
import {
  LIVE_TV_CHANNELS,
  LIVE_TV_CATEGORIES,
  IPTV_ORG_COUNTRIES,
  type LiveTVChannel,
} from '@/lib/live-tv';

// ─── Tipos ──────────────────────────────────────────────────

interface ApiStream {
  id: string;
  name: string;
  description: string;
  logo: string;
  url: string;
  quality: string;
  country: string;
  countryCode: string;
  categories: string[];
  label: string | null;
  channelName: string;
  website: string | null;
}

interface ApiCountry {
  code: string;
  name: string;
  flag: string;
  languages?: string[];
}

interface StreamStats {
  totalAvailable: number;
  returned: number;
  country: string;
  categories?: Record<string, number>;
}

interface StreamsResponse {
  success: boolean;
  source: string;
  stats: StreamStats;
  streams: ApiStream[];
}

// ─── Country Groups (Latam priority) ────────────────────────
const COUNTRY_GROUPS = [
  { label: 'Colombia', codes: ['co'], flag: '🇨🇴' },
  { label: 'Mexico', codes: ['mx'], flag: '🇲🇽' },
  { label: 'Argentina', codes: ['ar'], flag: '🇦🇷' },
  { label: 'Venezuela', codes: ['ve'], flag: '🇻🇪' },
  { label: 'Chile', codes: ['cl'], flag: '🇨🇱' },
  { label: 'Peru', codes: ['pe'], flag: '🇵🇪' },
  { label: 'Ecuador', codes: ['ec'], flag: '🇪🇨' },
  { label: 'Brasil', codes: ['br'], flag: '🇧🇷' },
  { label: 'Espana', codes: ['es'], flag: '🇪🇸' },
  { label: 'Otros', codes: [], flag: '🌍' },
];

export default function IPTVOrgView() {
  const { setPlayerState, setCurrentView, setSelectedMovie } = useAppStore();
  const { available: castAvailable, connected: castConnected, loading: castLoading, castMedia } = useCastStore();

  // ─── State ─────────────────────────────────────────────────
  const [selectedCountry, setSelectedCountry] = useState<string>('co');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [showAllCountries, setShowAllCountries] = useState(false);

  // API state
  const [apiStreams, setApiStreams] = useState<ApiStream[]>([]);
  const [apiStats, setApiStats] = useState<StreamStats | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSource, setApiSource] = useState<string>('none');
  const [apiCategories, setApiCategories] = useState<Record<string, number>>({});

  // Countries list from API
  const [apiCountries, setApiCountries] = useState<ApiCountry[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);

  // ─── Fetch countries on mount ──────────────────────────────
  useEffect(() => {
    async function fetchCountries() {
      try {
        const res = await fetch('/api/iptv-org/countries');
        if (res.ok) {
          const data = await res.json();
          setApiCountries(data.countries || []);
        }
      } catch {
        // Fallback silencioso - los grupos hardcoded siempre funcionan
      } finally {
        setCountriesLoading(false);
      }
    }
    fetchCountries();
  }, []);

  // ─── Fetch streams via ref-based approach ──
  const fetchTriggerRef = useRef(0);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- data-fetching effect */
    if (selectedCountry === 'all') {
      setApiStreams([]);
      setApiStats(null);
      setApiError(null);
      return;
    }

    const group = COUNTRY_GROUPS.find(
      (g) => g.label.toLowerCase() === selectedCountry.toLowerCase()
    );
    if (!group || group.codes.length === 0) return;

    const countryCode = group.codes[0];
    let cancelled = false;
    const trigger = fetchTriggerRef.current;
    const controller = new AbortController();

    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching sets loading state
    setApiLoading(true);
    setApiError(null);

    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('country', countryCode);
        params.set('limit', '200');

        if (searchQuery.trim() || selectedCategory !== 'all') {
          params.set('source', 'api');
          if (searchQuery.trim()) params.set('search', searchQuery.trim());
          if (selectedCategory !== 'all') params.set('category', selectedCategory);
        } else {
          params.set('source', 'm3u');
        }

        const res = await fetch(`/api/iptv-org/streams?${params}`, { signal: controller.signal });
        const data: StreamsResponse = await res.json();

        if (cancelled || trigger !== fetchTriggerRef.current) return;

        if (data.success) {
          setApiStreams(data.streams);
          setApiStats(data.stats);
          setApiSource(data.source);
          if (data.stats.categories) setApiCategories(data.stats.categories);
        } else {
          throw new Error(data.error || 'Failed to fetch streams');
        }
      } catch (err) {
        if (cancelled || trigger !== fetchTriggerRef.current) return;
        console.error('API fetch error, falling back:', err);
        setApiError(err instanceof Error ? err.message : 'Error desconocido');
        setApiStreams([]);
        setApiSource('fallback');
      } finally {
        if (!cancelled && trigger === fetchTriggerRef.current) setApiLoading(false);
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [selectedCountry, selectedCategory, searchQuery]);

  // Manual refresh (for button clicks)
  const refreshStreams = useCallback(() => {
    fetchTriggerRef.current += 1;
    // Trigger re-render by toggling a state
    setSelectedCountry((prev) => prev);
    setSelectedCategory((prev) => prev);
  }, []);

  // ─── Fallback: static channels when API fails ──────────────
  const fallbackChannels = useMemo(() => {
    if (selectedCountry === 'all') return LIVE_TV_CHANNELS;

    const group = COUNTRY_GROUPS.find(
      (g) => g.label.toLowerCase() === selectedCountry.toLowerCase()
    );
    if (!group) return [];

    return LIVE_TV_CHANNELS.filter((ch) => group.codes.includes(ch.country));
  }, [selectedCountry]);

  // ─── Decide which data to show ─────────────────────────────
  const displayStreams = useMemo(() => {
    // If API has data, use it
    if (apiStreams.length > 0) return apiStreams.map(apiToLiveTVChannel);
    // If API is loading, show nothing (loading state)
    if (apiLoading) return [];
    // If API errored, fall back to static data
    if (apiError || apiSource === 'fallback') return fallbackChannels;
    return [];
  }, [apiStreams, apiLoading, apiError, apiSource, fallbackChannels]);

  const isUsingApi = apiSource === 'm3u' || apiSource === 'api';
  const isUsingFallback = !isUsingApi && displayStreams.length > 0;

  // ─── Available categories ──────────────────────────────────
  const availableCategories = useMemo(() => {
    if (isUsingApi && apiCategories) {
      return Object.entries(apiCategories)
        .filter(([, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([id, count]) => ({ id, name: id.charAt(0).toUpperCase() + id.slice(1), count }));
    }
    // Fallback categories from static data
    if (selectedCountry !== 'all') {
      const group = COUNTRY_GROUPS.find(
        (g) => g.label.toLowerCase() === selectedCountry.toLowerCase()
      );
      if (group) {
        return LIVE_TV_CATEGORIES
          .filter((c) => c.id !== 'all')
          .filter((c) => {
            const count = LIVE_TV_CHANNELS.filter(
              (ch) => group.codes.includes(ch.country) && ch.category === c.id
            ).length;
            return count > 0;
          })
          .slice(0, 15);
      }
    }
    return [];
  }, [selectedCountry, isUsingApi, apiCategories]);

  // ─── Get country channel count from API ────────────────────
  const getCountryCount = useCallback(
    (countryCode: string): number => {
      const country = apiCountries.find((c) => c.code === countryCode);
      if (country && (country as any).channelCount) return (country as any).channelCount;
      return 0;
    },
    [apiCountries]
  );

  // ─── Play channel ──────────────────────────────────────────
  const playChannel = useCallback(
    (channel: LiveTVChannel) => {
      setSelectedMovie({
        id: channel.id,
        title: channel.name,
        description: channel.description,
        posterUrl: channel.logo || `https://picsum.photos/seed/${channel.id}/400/600`,
        backdropUrl: `https://picsum.photos/seed/${channel.id}-bg/1920/1080`,
        videoUrl: channel.url,
        year: 2025,
        duration: '24/7',
        rating: 0,
        genre: channel.category,
        category: 'tv',
        isLive: true,
        featured: false,
        trending: false,
      });
      setPlayerState({
        sources: [
          {
            server: channel.name,
            sources: [
              {
                id: channel.id,
                name: channel.name,
                type: 'hls' as const,
                url: channel.url,
                quality: 'Live',
                server: channel.id,
              },
            ],
          },
        ],
        currentSource: {
          id: channel.id,
          name: channel.name,
          type: 'live' as const,
          url: channel.url,
          quality: 'Live',
          server: channel.id,
        },
        isTVShow: false,
        selectedSeason: 1,
        selectedEpisode: 1,
      });
      setCurrentView('player');
    },
    [setPlayerState, setCurrentView, setSelectedMovie]
  );

  // ─── Cast channel directly to Chromecast ──────────────────
  const castChannel = useCallback(
    async (e: React.MouseEvent, channel: LiveTVChannel) => {
      e.stopPropagation();
      if (channel.url) {
        await castMedia(channel.url, channel.name, channel.logo);
      }
    },
    [castMedia]
  );

  const getCountryFlag = (code: string) => {
    return IPTV_ORG_COUNTRIES[code.toUpperCase()]?.flag || '';
  };

  const getCountryName = (code: string) => {
    return IPTV_ORG_COUNTRIES[code.toUpperCase()]?.name || code;
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategory !== 'all' || searchQuery.trim();

  const totalChannels = apiStats?.totalAvailable || displayStreams.length || 0;

  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      {/* ─── Hero Section ──────────────────────────────────── */}
      <div className="relative px-4 sm:px-8 md:px-12 lg:px-16 mb-6">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
              <Globe className="h-5 w-5 text-purple-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                IPTV Mundial
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {isUsingApi
                  ? `${totalChannels.toLocaleString()} canales en vivo de todo el mundo`
                  : `${LIVE_TV_CHANNELS.length} canales disponibles`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge className="bg-purple-600 text-white border-0 px-3 py-1 text-xs font-bold">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-white" />
              IPTV-ORG
            </Badge>
            {isUsingApi && (
              <Badge
                variant="outline"
                className="border-green-600/50 text-green-400 text-xs"
              >
                <Wifi className="h-3 w-3 mr-1" />
                API en vivo
              </Badge>
            )}
            {isUsingFallback && (
              <Badge
                variant="outline"
                className="border-yellow-600/50 text-yellow-400 text-xs"
              >
                <WifiOff className="h-3 w-3 mr-1" />
                Modo offline
              </Badge>
            )}
            {apiStats && (
              <span className="text-gray-500 text-xs">
                Fuente: {apiSource === 'm3u' ? 'Playlist M3U' : 'API JSON'} ·
                Actualizados diariamente por iptv-org
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Search Bar ───────────────────────────────────── */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar canales por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-20 py-3 bg-gray-900/80 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-600/50 focus:ring-1 focus:ring-purple-600/20 transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1.5 rounded-full hover:bg-gray-800 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
            <button
              onClick={() => refreshStreams()}
              className="p-1.5 rounded-full hover:bg-gray-800 transition-colors"
              title="Actualizar lista"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-gray-400 ${apiLoading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Filters ──────────────────────────────────────── */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-8">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span>{showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Country Filters */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    Pais
                  </span>
                  <div className="flex-1 h-px bg-gray-900" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => {
                      setSelectedCountry('all');
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCountry === 'all'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                        : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800'
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                    Todos
                  </button>
                  {COUNTRY_GROUPS.map((group) => {
                    const isActive = selectedCountry === group.label.toLowerCase();
                    return (
                      <button
                        key={group.label}
                        onClick={() => {
                          setSelectedCountry(group.label.toLowerCase());
                          setSelectedCategory('all');
                          setSearchQuery('');
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                            : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800'
                        }`}
                      >
                        <span>{group.flag}</span>
                        {group.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Filters */}
              {availableCategories.length > 0 && selectedCountry !== 'all' && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                      Categoria
                    </span>
                    <div className="flex-1 h-px bg-gray-900" />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        selectedCategory === 'all'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      Todas
                    </button>
                    {availableCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                          selectedCategory === cat.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        {cat.name} ({cat.count})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Loading State ────────────────────────────────── */}
      {apiLoading && (
        <div className="px-4 sm:px-8 md:px-12 lg:px-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <Loader2 className="h-10 w-10 text-purple-500 animate-spin mb-4" />
            <p className="text-gray-400 text-sm">
              Cargando canales de iptv-org...
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Obteniendo lista actualizada
            </p>
          </motion.div>
        </div>
      )}

      {/* ─── Error / Fallback Banner ──────────────────────── */}
      {apiError && !apiLoading && (
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-yellow-600/10 border border-yellow-600/20 rounded-xl px-4 py-3"
          >
            <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-yellow-300 font-medium">
                API no disponible - usando datos en cache
              </p>
              <p className="text-xs text-yellow-500/70 mt-0.5 truncate">
                {apiError}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-yellow-600/30 text-yellow-400 hover:bg-yellow-600/10 text-xs flex-shrink-0"
              onClick={() => {
                setApiError(null);
                refreshStreams();
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reintentar
            </Button>
          </motion.div>
        </div>
      )}

      {/* ─── Search indicator ─────────────────────────────── */}
      {searchQuery.trim() && !apiLoading && (
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-purple-600/10 border border-purple-600/20 rounded-lg px-4 py-2"
          >
            <Search className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-purple-300">
              Buscando &quot;{searchQuery}&quot; -{' '}
              {displayStreams.length} resultado
              {displayStreams.length !== 1 ? 's' : ''}
            </span>
          </motion.div>
        </div>
      )}

      {/* ─── Channel Grid ─────────────────────────────────── */}
      {!apiLoading && (
        <div className="px-4 sm:px-8 md:px-12 lg:px-16">
          {/* Header with stats */}
          {displayStreams.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-600/20 text-purple-400">
                <Tv className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-white">
                {selectedCountry === 'all'
                  ? 'Todos los canales'
                  : COUNTRY_GROUPS.find(
                      (g) => g.label.toLowerCase() === selectedCountry.toLowerCase()
                    )?.label || selectedCountry}
              </h2>
              <Badge variant="secondary" className="bg-gray-800 text-gray-400 text-xs">
                {displayStreams.length} canales
              </Badge>
              {isUsingApi && (
                <Badge
                  variant="outline"
                  className="border-green-600/30 text-green-400 text-xs"
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Actualizado
                </Badge>
              )}
              <div className="flex-1 h-px bg-gray-800/50" />
              <button
                onClick={() => refreshStreams()}
                className="text-xs text-gray-500 hover:text-purple-400 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Actualizar
              </button>
            </div>
          )}

          {/* Channel cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {displayStreams.slice(0, 100).map((channel, index) => (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.4) }}
                className="group relative bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden hover:border-purple-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-600/10 cursor-pointer"
                onClick={() => playChannel(channel)}
              >
                <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      className="w-20 h-20 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-gray-600 text-lg font-bold">
                      {channel.name.charAt(0)}
                    </span>
                  )}

                  {/* Live badge */}
                  <div className="absolute top-2 right-2">
                    <div className="flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-2 py-0.5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-white text-[10px] font-bold uppercase">
                        Live
                      </span>
                    </div>
                  </div>

                  {/* Country flag */}
                  {channel.country && (
                    <div className="absolute top-2 left-2">
                      <span className="text-sm">
                        {getCountryFlag(channel.country)}
                      </span>
                    </div>
                  )}

                  {/* Quality badge */}
                  {channel.quality && channel.quality !== 'unknown' && (
                    <div className="absolute bottom-2 right-2">
                      <Badge className="bg-black/70 text-gray-300 text-[9px] px-1.5 py-0 border-0 backdrop-blur-sm">
                        {channel.quality}
                      </Badge>
                    </div>
                  )}

                  {/* Label (Geo-blocked, etc) */}
                  {channel.description && (
                    <div className="absolute bottom-2 left-2">
                      {(channel.description as any)?.label && (
                        <Badge className="bg-orange-600/70 text-white text-[9px] px-1.5 py-0 border-0 backdrop-blur-sm">
                          {(channel.description as any).label}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Play + Cast overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <div
                      className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/40 group-hover:scale-110 transition-transform"
                      onClick={(e) => { e.stopPropagation(); playChannel(channel); }}
                    >
                      <Play className="h-6 w-6 text-white ml-1 fill-white" />
                    </div>
                    {/* Cast button for live channels */}
                    {(castAvailable || castConnected) && channel.url && (
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                          castConnected
                            ? 'bg-blue-600 shadow-blue-600/40'
                            : 'bg-white/20 backdrop-blur-sm'
                        }`}
                        onClick={(e) => castChannel(e, channel)}
                        title="Enviar a Chromecast"
                      >
                        {castLoading ? (
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                          <Cast className="h-5 w-5 text-white" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
                        {channel.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {channel.country
                          ? `${getCountryFlag(channel.country)} ${getCountryName(channel.country)}`
                          : channel.language?.toUpperCase()}
                        {channel.quality && channel.quality !== 'unknown' && ` · ${channel.quality}`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-purple-500 transition-colors mt-0.5 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {channel.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Load more indicator */}
          {displayStreams.length > 100 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                Mostrando 100 de {displayStreams.length} canales.
                {isUsingApi ? ' Usa la busqueda para filtrar.' : ''}
              </p>
            </div>
          )}

          {/* Empty state */}
          {displayStreams.length === 0 && !apiLoading && !apiError && (
            <div className="text-center py-20">
              <Search className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No se encontraron canales</p>
              <p className="text-gray-600 text-sm mt-1">
                Intenta con otra busqueda o cambia de pais
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCountry('co');
                  clearFilters();
                }}
                className="mt-4 border-gray-700 text-gray-400 hover:bg-gray-900"
              >
                Ver canales de Colombia
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── Info Banner ──────────────────────────────────── */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mt-12">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 max-w-2xl">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                IPTV Org - Canales Publicos del Mundo
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Esta seccion consume la API abierta de iptv-org/iptv para ofrecer
                canales de TV publica actualizados diariamente. Incluye canales de
                Colombia, Mexico, Argentina, Espana, Venezuela, Chile, Peru, Ecuador,
                Brasil y mas de 250 paises. La disponibilidad de los streams puede
                variar segun la region y el horario. Si un canal no carga, prueba con
                otro. Los canales con etiqueta &quot;Geo-blocked&quot; solo funcionan desde
                ciertos paises.
              </p>
              {isUsingFallback && (
                <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400/80">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>
                    Actualmente usando datos en cache. La API se reanudara
                    automaticamente.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

/** Convierte un stream de la API al formato LiveTVChannel de la app */
function apiToLiveTVChannel(stream: ApiStream): LiveTVChannel {
  return {
    id: stream.id,
    name: stream.name,
    description: stream.description || stream.channelName || stream.name,
    logo: stream.logo || '',
    url: stream.url,
    category: stream.categories?.[0] || 'general',
    language: 'spa',
    country: stream.countryCode,
  };
}

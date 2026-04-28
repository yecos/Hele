'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  Play,
  Tv,
  Newspaper,
  Trophy,
  Music2,
  Film,
  ChevronRight,
  Loader2,
  AlertCircle,
  Volume2,
  Search,
  X,
  Globe,
  Baby,
  Church,
  Theater,
  Sparkles,
  SlidersHorizontal,
  ShieldAlert,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import {
  LIVE_TV_CHANNELS,
  LIVE_TV_CATEGORIES,
  type LiveTVChannel,
} from '@/lib/live-tv';

// ─── Category groupings for better organization ───────────────────
const CATEGORY_GROUPS = [
  {
    id: 'colombia',
    label: 'Colombia',
    icon: '🇨🇴',
    categories: [
      'co-nacional',
      'co-regional',
      'co-deportes',
      'co-noticias',
      'co-musica',
      'co-peliculas',
      'co-infantil',
      'co-entretenimiento',
      'co-religiosos',
    ],
  },
  {
    id: 'latam',
    label: 'Latinoamérica',
    icon: '🌎',
    categories: ['latam'],
  },
  {
    id: 'internacional',
    label: 'Internacional',
    icon: '🌐',
    categories: ['news', 'documentary', 'sports', 'music'],
  },
  {
    id: 'adultos',
    label: '+18 Adultos',
    icon: '🔞',
    categories: ['adultos'],
  },
];

export default function LiveTVView() {
  const { setPlayerState, setCurrentView, setSelectedMovie } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingChannel, setLoadingChannel] = useState<string | null>(null);
  const [errorChannel, setErrorChannel] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [adultUnlocked, setAdultUnlocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('xuperstream_adult_unlocked') === 'true';
    }
    return false;
  });
  const [showAdultConfirm, setShowAdultConfirm] = useState(false);

  // ─── Adult content unlock ───────────────────────────────────
  const unlockAdult = useCallback(() => {
    setAdultUnlocked(true);
    localStorage.setItem('xuperstream_adult_unlocked', 'true');
    setShowAdultConfirm(false);
  }, []);

  const lockAdult = useCallback(() => {
    setAdultUnlocked(false);
    localStorage.removeItem('xuperstream_adult_unlocked');
  }, []);

  // ─── Filter channels excluding adult if locked ─────────────
  const safeChannels = useMemo(() => {
    if (adultUnlocked) return LIVE_TV_CHANNELS;
    return LIVE_TV_CHANNELS.filter((ch) => ch.category !== 'adultos');
  }, [adultUnlocked]);

  // ─── Filter channels by category and search ─────────────────────
  const filteredChannels = useMemo(() => {
    let result = safeChannels;

    if (selectedCategory !== 'all') {
      result = result.filter((ch) => ch.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (ch) =>
          ch.name.toLowerCase().includes(q) ||
          ch.description.toLowerCase().includes(q) ||
          ch.country.toLowerCase().includes(q) ||
          (LIVE_TV_CATEGORIES.find((c) => c.id === ch.category)?.name || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [selectedCategory, searchQuery, safeChannels]);

  // ─── Group channels by category when "all" or searching ─────────
  const groupedChannels = useMemo(() => {
    if (selectedCategory !== 'all') {
      return [
        {
          categoryId: selectedCategory,
          categoryName:
            LIVE_TV_CATEGORIES.find((c) => c.id === selectedCategory)?.name || selectedCategory,
          channels: filteredChannels,
        },
      ];
    }

    if (searchQuery.trim()) {
      // When searching with "all", group by category for clarity
      const groups: { categoryId: string; categoryName: string; channels: LiveTVChannel[] }[] = [];
      const seen = new Set<string>();
      filteredChannels.forEach((ch) => {
        if (!seen.has(ch.category)) {
          seen.add(ch.category);
          groups.push({
            categoryId: ch.category,
            categoryName: LIVE_TV_CATEGORIES.find((c) => c.id === ch.category)?.name || ch.category,
            channels: filteredChannels.filter((c) => c.category === ch.category),
          });
        }
      });
      return groups;
    }

    // Default: group by category groups
    const groups: { categoryId: string; categoryName: string; channels: LiveTVChannel[] }[] = [];
    LIVE_TV_CATEGORIES.filter((c) => c.id !== 'all' && c.id !== 'adultos').forEach((cat) => {
      const catChannels = LIVE_TV_CHANNELS.filter((ch) => ch.category === cat.id);
      if (catChannels.length > 0) {
        groups.push({
          categoryId: cat.id,
          categoryName: cat.name,
          channels: catChannels,
        });
      }
    });
    return groups;
  }, [selectedCategory, searchQuery, filteredChannels]);

  const totalVisible = useMemo(
    () =>
      selectedCategory === 'all' && !searchQuery.trim()
        ? safeChannels.length
        : filteredChannels.length,
    [selectedCategory, searchQuery, filteredChannels, safeChannels]
  );

  // ─── Play channel ───────────────────────────────────────────────
  const playChannel = async (channel: LiveTVChannel) => {
    setLoadingChannel(channel.id);
    setErrorChannel(null);

    const movieObj = {
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
    };

    setSelectedMovie(movieObj);
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
    setLoadingChannel(null);
  };

  // ─── Helpers ────────────────────────────────────────────────────
  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'co-nacional': return Tv;
      case 'co-regional': return Tv;
      case 'co-deportes': return Trophy;
      case 'co-noticias': return Newspaper;
      case 'co-musica': return Music2;
      case 'co-peliculas': return Film;
      case 'co-infantil': return Baby;
      case 'co-entretenimiento': return Theater;
      case 'co-religiosos': return Church;
      case 'latam': return Globe;
      case 'adultos': return ShieldAlert;
      case 'news': return Newspaper;
      case 'sports': return Trophy;
      case 'music': return Music2;
      case 'documentary': return Sparkles;
      default: return Radio;
    }
  };

  const getCategoryColor = (catId: string) => {
    switch (catId) {
      case 'co-nacional': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'co-regional': return 'bg-amber-600/20 text-amber-400 border-amber-600/30';
      case 'co-deportes': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'co-noticias': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'co-musica': return 'bg-purple-600/20 text-purple-400 border-purple-600/30';
      case 'co-peliculas': return 'bg-red-600/20 text-red-400 border-red-600/30';
      case 'co-infantil': return 'bg-cyan-600/20 text-cyan-400 border-cyan-600/30';
      case 'co-entretenimiento': return 'bg-pink-600/20 text-pink-400 border-pink-600/30';
      case 'co-religiosos': return 'bg-indigo-600/20 text-indigo-400 border-indigo-600/30';
      case 'latam': return 'bg-teal-600/20 text-teal-400 border-teal-600/30';
      case 'news': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'sports': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'music': return 'bg-purple-600/20 text-purple-400 border-purple-600/30';
      case 'documentary': return 'bg-orange-600/20 text-orange-400 border-orange-600/30';
      case 'adultos': return 'bg-pink-600/20 text-pink-400 border-pink-600/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  const getGroupColor = (groupId: string) => {
    switch (groupId) {
      case 'colombia': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'latam': return 'border-teal-500/30 bg-teal-500/5';
      case 'internacional': return 'border-blue-500/30 bg-blue-500/5';
      case 'adultos': return 'border-pink-500/30 bg-pink-500/5';
      default: return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      {/* ─── Hero Section ────────────────────────────────────────── */}
      <div className="relative px-4 sm:px-8 md:px-12 lg:px-16 mb-6">
        <div className="absolute inset-0 bg-gradient-to-b from-red-600/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
              <Radio className="h-5 w-5 text-red-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                TV en Vivo
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {safeChannels.length} canales en vivo de Colombia, Latinoamérica y el mundo
                {adultUnlocked && <span className='text-pink-400'> (incluye contenido +18)</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge className="bg-red-600 text-white border-0 px-3 py-1 text-xs font-bold animate-pulse">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-white" />
              EN VIVO
            </Badge>
            <span className="text-gray-500 text-xs">
              {totalVisible} canales {searchQuery.trim() ? 'encontrados' : selectedCategory !== 'all' ? 'en esta categoría' : 'disponibles'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Search Bar ─────────────────────────────────────────── */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar canales por nombre, país o tema..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-gray-900/80 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Filter Toggle + Category Filters ───────────────────── */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-8">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
          </button>
          {(selectedCategory !== 'all' || searchQuery.trim()) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                clearSearch();
              }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
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
              {/* "All" button */}
              <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                      : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800'
                  }`}
                >
                  <Tv className="h-4 w-4" />
                  Todos
                  <span className="text-xs opacity-70">({safeChannels.length})</span>
                </button>
              </div>

              {/* Grouped categories */}
              {CATEGORY_GROUPS.map((group) => {
                const groupCategories = LIVE_TV_CATEGORIES.filter((c) =>
                  group.categories.includes(c.id)
                );
                const groupTotal = groupCategories.reduce((sum, cat) => {
                  return sum + (cat.id === 'adultos' && !adultUnlocked ? 0 : LIVE_TV_CHANNELS.filter((ch) => ch.category === cat.id).length);
                }, 0);

                return (
                  <div key={group.id} className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{group.icon}</span>
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                        {group.label}
                      </span>
                      <span className="text-xs text-gray-600">({groupTotal})</span>
                      <div className="flex-1 h-px bg-gray-900" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {groupCategories.map((cat) => {
                        const Icon = getCategoryIcon(cat.id);
                        const count = cat.id === 'adultos' && !adultUnlocked ? 0 : LIVE_TV_CHANNELS.filter((ch) => ch.category === cat.id).length;
                        const isActive = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                              isActive
                                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                                : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {cat.name}
                            <span className="text-xs opacity-70">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Search active indicator ────────────────────────────── */}
      {searchQuery.trim() && (
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-600/10 border border-red-600/20 rounded-lg px-4 py-2"
          >
            <Search className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-300">
              Buscando &quot;{searchQuery}&quot; — {filteredChannels.length} resultado{filteredChannels.length !== 1 ? 's' : ''}
            </span>
          </motion.div>
        </div>
      )}

      {/* ─── Channel Grid (Grouped) ─────────────────────────────── */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16">
        {/* ─── Adult Content Section (+18) ──────────────────────── */}
        {selectedCategory === 'all' && !searchQuery.trim() && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-pink-600/20 text-pink-400 border border-pink-600/30">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-white">+18 Adultos</h2>
              <Badge className="bg-pink-600/80 text-white text-xs border-0">
                CONTENIDO PARA ADULTOS
              </Badge>
              <div className="flex-1 h-px bg-gray-800/50" />
            </div>

            {!adultUnlocked ? (
              <div className="relative bg-gray-900/80 border-2 border-pink-600/30 rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-900/10 via-transparent to-purple-900/10 pointer-events-none" />
                <div className="relative p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-pink-600/20 flex items-center justify-center mx-auto mb-4">
                    <Lock className="h-8 w-8 text-pink-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Contenido Exclusivo para Adultos
                  </h3>
                  <p className="text-gray-400 text-sm mb-2 max-w-md mx-auto">
                    Esta seccion contiene contenido exclusivo para mayores de 18 anos.
                    Al acceder, confirmas que eres mayor de edad y aceptas ver este tipo de contenido.
                  </p>
                  <p className="text-pink-400 text-xs mb-6">
                    24 canales disponibles
                  </p>

                  {!showAdultConfirm ? (
                    <Button
                      onClick={() => setShowAdultConfirm(true)}
                      className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-lg font-semibold transition-all"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Soy mayor de 18 anos - Desbloquear
                    </Button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <div className="bg-red-950/50 border border-red-600/30 rounded-lg p-4">
                        <p className="text-red-400 text-sm font-semibold mb-1">
                          Confirmacion requerida
                        </p>
                        <p className="text-gray-400 text-xs">
                          Este contenido es exclusivamente para personas mayores de 18 anos.
                          Contiene material pornografico explicito. Al continuar, aceptas
                          toda responsabilidad sobre el acceso a este contenido.
                        </p>
                      </div>
                      <div className="flex gap-3 justify-center">
                        <Button
                          onClick={() => setShowAdultConfirm(false)}
                          variant="outline"
                          className="border-gray-700 text-gray-400 hover:bg-gray-800 px-6"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={unlockAdult}
                          className="bg-pink-600 hover:bg-pink-700 text-white px-6 font-semibold"
                        >
                          Confirmar - Tengo mas de 18
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-end mb-3">
                  <button
                    onClick={lockAdult}
                    className="flex items-center gap-2 text-xs text-gray-500 hover:text-pink-400 transition-colors"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Bloquear seccion +18
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {LIVE_TV_CHANNELS.filter((ch) => ch.category === 'adultos').map((channel, index) => (
                    <ChannelCard
                      key={channel.id}
                      channel={channel}
                      index={index}
                      loadingChannel={loadingChannel}
                      errorChannel={errorChannel}
                      getCategoryColor={getCategoryColor}
                      onPlay={playChannel}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {selectedCategory === 'all' && !searchQuery.trim() ? (
          // Show channels grouped by category sections
          groupedChannels.map((group) => {
            if (group.channels.length === 0) return null;
            const Icon = getCategoryIcon(group.categoryId);
            return (
              <div key={group.categoryId} className="mb-10">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryColor(group.categoryId)}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg font-bold text-white">{group.categoryName}</h2>
                  <Badge variant="secondary" className="bg-gray-800 text-gray-400 text-xs">
                    {group.channels.length} canales
                  </Badge>
                  <div className="flex-1 h-px bg-gray-800/50" />
                </div>

                {/* Channel Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {group.channels.map((channel, index) => (
                    <ChannelCard
                      key={channel.id}
                      channel={channel}
                      index={index}
                      loadingChannel={loadingChannel}
                      errorChannel={errorChannel}
                      getCategoryColor={getCategoryColor}
                      onPlay={playChannel}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          // Show flat grid when filtering or searching
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredChannels.map((channel, index) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  index={index}
                  loadingChannel={loadingChannel}
                  errorChannel={errorChannel}
                  getCategoryColor={getCategoryColor}
                  onPlay={playChannel}
                />
              ))}
            </div>

            {filteredChannels.length === 0 && (
              <div className="text-center py-20">
                <Search className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No se encontraron canales</p>
                <p className="text-gray-600 text-sm mt-1">
                  Intenta con otra búsqueda o cambia de categoría
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCategory('all');
                    clearSearch();
                  }}
                  className="mt-4 border-gray-700 text-gray-400 hover:bg-gray-900"
                >
                  Ver todos los canales
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Info Banner ────────────────────────────────────────── */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mt-12">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 max-w-2xl">
          <div className="flex items-start gap-3">
            <Volume2 className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                IPTV Colombia - TV en Vivo
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Canales de TV en vivo de Colombia y Latinoamérica con tecnología HLS. Incluye canales nacionales como
                Señal Colombia, Canal Institucional, Citytv y Canal Uno; regionales como Teleantioquia, Telemedellín,
                Telecaribe y Telecafé; deportivos como Win Sports; musicales como La Kalle y Parranda Vallenata; y
                mucho más. La disponibilidad de los streams puede variar según la región y el horario. Si un canal no
                carga, prueba con otro.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Channel Card Component ─────────────────────────────────────────
function ChannelCard({
  channel,
  index,
  loadingChannel,
  errorChannel,
  getCategoryColor,
  onPlay,
}: {
  channel: LiveTVChannel;
  index: number;
  loadingChannel: string | null;
  errorChannel: string | null;
  getCategoryColor: (id: string) => string;
  onPlay: (ch: LiveTVChannel) => void;
}) {
  const isLoading = loadingChannel === channel.id;
  const hasError = errorChannel === channel.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5) }}
      className="group relative bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden hover:border-red-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-600/10 cursor-pointer"
      onClick={() => onPlay(channel)}
    >
      {/* Channel Logo/Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden">
        <img
          src={channel.logo}
          alt={channel.name}
          className="w-20 h-20 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Live Badge */}
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-[10px] font-bold uppercase">Live</span>
          </div>
        </div>

        {/* Category Badge */}
        <div className="absolute top-2 left-2">
          <Badge
            className={`${getCategoryColor(channel.category)} text-[10px] px-2 py-0.5 border`}
          >
            {LIVE_TV_CATEGORIES.find((c) => c.id === channel.category)?.name}
          </Badge>
        </div>

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="h-10 w-10 text-red-500 animate-spin" />
          ) : hasError ? (
            <AlertCircle className="h-10 w-10 text-red-500" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40 group-hover:scale-110 transition-transform">
              <Play className="h-6 w-6 text-white ml-1 fill-white" />
            </div>
          )}
        </div>
      </div>

      {/* Channel Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate group-hover:text-red-400 transition-colors">
              {channel.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {channel.country} · {channel.language.toUpperCase()}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-red-500 transition-colors mt-0.5 flex-shrink-0" />
        </div>
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
          {channel.description}
        </p>
      </div>
    </motion.div>
  );
}

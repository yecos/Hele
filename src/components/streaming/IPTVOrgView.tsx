'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Play,
  Radio,
  Search,
  Loader2,
  ChevronRight,
  X,
  RefreshCw,
  AlertCircle,
  Tv,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import {
  LIVE_TV_CHANNELS,
  LIVE_TV_CATEGORIES,
  IPTV_ORG_COUNTRIES,
  type LiveTVChannel,
} from '@/lib/live-tv';

// ─── Country Groups ──────────────────────────────────────────
const COUNTRY_GROUPS = [
  {
    label: 'Colombia',
    codes: ['CO'],
    categories: ['co-nacional', 'co-regional', 'co-deportes', 'co-noticias', 'co-musica', 'co-peliculas', 'co-infantil', 'co-entretenimiento', 'co-religiosos'],
  },
  {
    label: 'Latinoamerica',
    codes: ['MX', 'AR', 'VE', 'CL', 'PE', 'EC'],
    categories: ['mx-general', 'mx-musica', 'mx-religiosos', 'ar-general', 'ar-deportes', 'ar-musica', 've-general', 've-deportes', 've-religiosos', 'cl-general', 'cl-musica', 'cl-infantil', 'pe-general', 'pe-musica', 'ec-general', 'ec-musica'],
  },
  {
    label: 'Brasil',
    codes: ['BR'],
    categories: ['br-general', 'br-noticias', 'br-religiosos', 'br-infantil'],
  },
  {
    label: 'Espana',
    codes: ['ES'],
    categories: ['es-general', 'es-religiosos'],
  },
  {
    label: 'Internacional',
    codes: ['US', 'FR', 'DE', 'INTL', 'LATAM', 'EU'],
    categories: ['news', 'sports', 'music', 'documentary', 'latam'],
  },
];

export default function IPTVOrgView() {
  const { setPlayerState, setCurrentView, setSelectedMovie } = useAppStore();
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // ─── Filter channels ──────────────────────────────────────
  const filteredChannels = useMemo(() => {
    let result = LIVE_TV_CHANNELS;

    if (selectedCountry !== 'all') {
      const countryCodes = COUNTRY_GROUPS
        .filter((g) => g.label.toLowerCase() === selectedCountry.toLowerCase())
        .flatMap((g) => g.codes);
      result = result.filter((ch) => countryCodes.includes(ch.country));
    }

    if (selectedCategory !== 'all') {
      result = result.filter((ch) => ch.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (ch) =>
          ch.name.toLowerCase().includes(q) ||
          ch.description.toLowerCase().includes(q) ||
          ch.country.toLowerCase().includes(q)
      );
    }

    return result;
  }, [selectedCountry, selectedCategory, searchQuery]);

  // ─── Available categories for selected country ────────────
  const availableCategories = useMemo(() => {
    if (selectedCountry === 'all') {
      return LIVE_TV_CATEGORIES.filter((c) => c.id !== 'all');
    }
    const group = COUNTRY_GROUPS.find(
      (g) => g.label.toLowerCase() === selectedCountry.toLowerCase()
    );
    if (!group) return [];
    return LIVE_TV_CATEGORIES.filter((c) => group.categories.includes(c.id));
  }, [selectedCountry]);

  // ─── Grouped channels ─────────────────────────────────────
  const groupedChannels = useMemo(() => {
    if (selectedCategory !== 'all') {
      const cat = LIVE_TV_CATEGORIES.find((c) => c.id === selectedCategory);
      return [{ categoryId: selectedCategory, categoryName: cat?.name || selectedCategory, channels: filteredChannels }];
    }
    if (selectedCountry !== 'all') {
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
    // Default: group by country groups
    const groups: { categoryId: string; categoryName: string; channels: LiveTVChannel[] }[] = [];
    COUNTRY_GROUPS.forEach((group) => {
      const channels = filteredChannels.filter((ch) => group.codes.includes(ch.country));
      if (channels.length > 0) {
        groups.push({ categoryId: group.label.toLowerCase(), categoryName: group.label, channels });
      }
    });
    return groups;
  }, [selectedCountry, selectedCategory, filteredChannels]);

  // ─── Play channel ─────────────────────────────────────────
  const playChannel = (channel: LiveTVChannel) => {
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
      sources: [{
        server: channel.name,
        sources: [{
          id: channel.id,
          name: channel.name,
          type: 'hls' as const,
          url: channel.url,
          quality: 'Live',
          server: channel.id,
        }],
      }],
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
  };

  const getCountryFlag = (countryCode: string) => {
    return IPTV_ORG_COUNTRIES[countryCode]?.flag || '';
  };

  const getCountryName = (countryCode: string) => {
    return IPTV_ORG_COUNTRIES[countryCode]?.name || countryCode;
  };

  const clearFilters = () => {
    setSelectedCountry('all');
    setSelectedCategory('all');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCountry !== 'all' || selectedCategory !== 'all' || searchQuery.trim();

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
                {LIVE_TV_CHANNELS.length} canales de todo el mundo gracias a iptv-org
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge className="bg-purple-600 text-white border-0 px-3 py-1 text-xs font-bold">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-white" />
              IPTV-ORG
            </Badge>
            <span className="text-gray-500 text-xs">
              Fuentes abiertas de tv publica mundial
            </span>
          </div>
        </div>
      </div>

      {/* ─── Search Bar ───────────────────────────────────── */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar canales por nombre, pais o tema..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-gray-900/80 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-600/50 focus:ring-1 focus:ring-purple-600/20 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-800 transition-colors">
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Filters ──────────────────────────────────────── */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-8">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
            <Globe className="h-4 w-4" />
            <span>{showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
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
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pais</span>
                  <div className="flex-1 h-px bg-gray-900" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => { setSelectedCountry('all'); setSelectedCategory('all'); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCountry === 'all'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                        : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800'
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                    Todos ({LIVE_TV_CHANNELS.length})
                  </button>
                  {COUNTRY_GROUPS.map((group) => {
                    const count = LIVE_TV_CHANNELS.filter((ch) => group.codes.includes(ch.country)).length;
                    const isActive = selectedCountry === group.label.toLowerCase();
                    return (
                      <button
                        key={group.label}
                        onClick={() => { setSelectedCountry(group.label.toLowerCase()); setSelectedCategory('all'); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                            : 'bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800'
                        }`}
                      >
                        <span>{getCountryFlag(group.codes[0])}</span>
                        {group.label}
                        <span className="text-xs opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Filters */}
              {availableCategories.length > 0 && selectedCountry !== 'all' && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Categoria</span>
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
                    {availableCategories.map((cat) => {
                      const count = LIVE_TV_CHANNELS.filter((ch) => ch.category === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                            selectedCategory === cat.id
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                          }`}
                        >
                          {cat.name} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Search indicator ─────────────────────────────── */}
      {searchQuery.trim() && (
        <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-purple-600/10 border border-purple-600/20 rounded-lg px-4 py-2"
          >
            <Search className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-purple-300">
              Buscando &quot;{searchQuery}&quot; - {filteredChannels.length} resultado{filteredChannels.length !== 1 ? 's' : ''}
            </span>
          </motion.div>
        </div>
      )}

      {/* ─── Channel Groups ───────────────────────────────── */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16">
        {groupedChannels.map((group) => {
          if (group.channels.length === 0) return null;
          return (
            <div key={group.categoryId} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-600/20 text-purple-400">
                  <Tv className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-bold text-white">{group.categoryName}</h2>
                <Badge variant="secondary" className="bg-gray-800 text-gray-400 text-xs">
                  {group.channels.length} canales
                </Badge>
                <div className="flex-1 h-px bg-gray-800/50" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {group.channels.slice(0, 60).map((channel, index) => (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.5) }}
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
                        <span className="text-gray-600 text-lg font-bold">{channel.name.charAt(0)}</span>
                      )}

                      <div className="absolute top-2 right-2">
                        <div className="flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-2 py-0.5 rounded-full">
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span className="text-white text-[10px] font-bold uppercase">Live</span>
                        </div>
                      </div>

                      {getCountryFlag(channel.country) && (
                        <div className="absolute top-2 left-2">
                          <span className="text-sm">{getCountryFlag(channel.country)}</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/40 group-hover:scale-110 transition-transform">
                          <Play className="h-6 w-6 text-white ml-1 fill-white" />
                        </div>
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
                            {channel.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {getCountryFlag(channel.country)} {getCountryName(channel.country)} · {channel.language.toUpperCase()}
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
                {group.channels.length > 60 && (
                  <div className="text-center py-8 col-span-full">
                    <p className="text-gray-500 text-sm">
                      Mostrando 60 de {group.channels.length} canales. Usa la busqueda para filtrar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredChannels.length === 0 && (
          <div className="text-center py-20">
            <Search className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron canales</p>
            <p className="text-gray-600 text-sm mt-1">Intenta con otra busqueda o cambia de pais</p>
            <Button variant="outline" onClick={clearFilters} className="mt-4 border-gray-700 text-gray-400 hover:bg-gray-900">
              Ver todos los canales
            </Button>
          </div>
        )}
      </div>

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
                Esta seccion incluye canales de TV publica de todo el mundo recopilados del proyecto iptv-org/iptv en GitHub.
                Incluye canales de Colombia, Mexico, Argentina, Espana, Venezuela, Chile, Peru, Ecuador, Brasil y canales
                internacionales de noticias, deportes, musica y documentales. La disponibilidad de los streams puede variar
                segun la region y el horario. Si un canal no carga, prueba con otro.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

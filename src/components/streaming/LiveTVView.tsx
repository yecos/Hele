'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { LIVE_TV_CHANNELS, LIVE_TV_CATEGORIES, type LiveTVChannel } from '@/lib/live-tv';

export default function LiveTVView() {
  const { setPlayerState, setCurrentView, setSelectedMovie } = useAppStore();
  const [channels, setChannels] = useState<LiveTVChannel[]>(LIVE_TV_CHANNELS);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loadingChannel, setLoadingChannel] = useState<string | null>(null);
  const [errorChannel, setErrorChannel] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCategory === 'all') {
      setChannels(LIVE_TV_CHANNELS);
    } else {
      setChannels(LIVE_TV_CHANNELS.filter((ch) => ch.category === selectedCategory));
    }
  }, [selectedCategory]);

  const playChannel = async (channel: LiveTVChannel) => {
    setLoadingChannel(channel.id);
    setErrorChannel(null);

    // Create a Movie-like object for the player
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
    setLoadingChannel(null);
  };

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'news': return Newspaper;
      case 'sports': return Trophy;
      case 'music': return Music2;
      case 'documentary': return Tv;
      case 'entertainment': return Film;
      default: return Radio;
    }
  };

  const getCategoryColor = (catId: string) => {
    switch (catId) {
      case 'news': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      case 'sports': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'music': return 'bg-purple-600/20 text-purple-400 border-purple-600/30';
      case 'documentary': return 'bg-orange-600/20 text-orange-400 border-orange-600/30';
      case 'entertainment': return 'bg-pink-600/20 text-pink-400 border-pink-600/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  return (
    <div className="min-h-screen bg-black pt-20 pb-16">
      {/* Hero Section */}
      <div className="relative px-4 sm:px-8 md:px-12 lg:px-16 mb-8">
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
                Canales en vivo de noticias, deportes, música y documentales
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge className="bg-red-600 text-white border-0 px-3 py-1 text-xs font-bold animate-pulse">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-white" />
              EN VIVO
            </Badge>
            <span className="text-gray-500 text-xs">{channels.length} canales disponibles</span>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {LIVE_TV_CATEGORIES.map((cat) => {
            const Icon = getCategoryIcon(cat.id);
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
                <Icon className="h-4 w-4" />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel Grid */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {channels.map((channel, index) => {
            const isLoading = loadingChannel === channel.id;
            const hasError = errorChannel === channel.id;

            return (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden hover:border-red-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-600/10"
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
                    <Badge className={`${getCategoryColor(channel.category)} text-[10px] px-2 py-0.5 border`}>
                      {LIVE_TV_CATEGORIES.find(c => c.id === channel.category)?.name}
                    </Badge>
                  </div>

                  {/* Play Overlay */}
                  <div
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => playChannel(channel)}
                  >
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
          })}
        </div>

        {channels.length === 0 && (
          <div className="text-center py-20">
            <Radio className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay canales en esta categoría</p>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="px-4 sm:px-8 md:px-12 lg:px-16 mt-12">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 max-w-2xl">
          <div className="flex items-start gap-3">
            <Volume2 className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Canales en vivo con HLS
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Los canales de TV en vivo utilizan tecnología HLS (HTTP Live Streaming) para transmitir contenido en tiempo real.
                La reproducción puede tardar unos segundos en cargar. Si un canal no funciona, intenta con otro — la disponibilidad
                de los streams puede variar según la región y el horario.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

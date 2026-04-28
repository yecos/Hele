'use client';

import { useState, useRef } from 'react';
import { Radio, Play, Volume2, VolumeX, Maximize, X, Loader2, Tv, Newspaper, Music, Gamepad2, Globe } from 'lucide-react';

interface IPTVChannel {
  id: string;
  name: string;
  category: string;
  logo: string;
  url: string;
  country: string;
}

const IPTV_CHANNELS: IPTVChannel[] = [
  // Colombianos
  { id: 'caracol', name: 'Caracol TV', category: 'Nacional', logo: '📺', url: 'https://livecenterv2.cdnmedia.co/caracoltvlive/smil:caracoltv.smil/playlist.m3u8', country: '🇨🇴' },
  { id: 'canalrcn', name: 'Canal RCN', category: 'Nacional', logo: '📺', url: 'https://mdstrm.com/live-stream/57b4dbf5d7b86d600e5765c5/playlist.m3u8', country: '🇨🇴' },
  { id: 'canaluno', name: 'Canal Uno', category: 'Nacional', logo: '📺', url: 'https://mdstrm.com/live-stream/57b4dbf5d7b86d600e5765c5/playlist.m3u8', country: '🇨🇴' },
  { id: 'señalcolombia', name: 'Señal Colombia', category: 'Nacional', logo: '🎬', url: 'https://stream-gtlc.telecentro.net.ar/hls/señalColombiaHD.m3u8', country: '🇨🇴' },
  { id: 'canalinstitucional', name: 'Canal Institucional', category: 'Nacional', logo: '🏛️', url: '', country: '🇨🇴' },

  // Noticias
  { id: 'cnnespanol', name: 'CNN en Español', category: 'Noticias', logo: '📰', url: 'https://d1gymyavdvyjgt.cloudfront.net/v1/manifest/3722c60a815c199d9c1ef46cf4e8a03207b528c4/cnn-en-espanol/aa965b18-5eed-4cd4-bff3-89aaf862ba72/0.m3u8', country: '🌍' },
  { id: 'ntn24', name: 'NTN24', category: 'Noticias', logo: '📰', url: 'https://stream-gtlc.telecentro.net.ar/hls/ntn24HD.m3u8', country: '🇨🇴' },
  { id: 'telesur', name: 'TeleSUR', category: 'Noticias', logo: '📰', url: 'https://cdnenmakiia.telesur.ultrabase.net/mbliveMain/hd/playlist.m3u8', country: '🌍' },
  { id: 'dwespanol', name: 'DW Español', category: 'Noticias', logo: '📰', url: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8', country: '🇩🇪' },
  { id: 'rtspanish', name: 'RT en Español', category: 'Noticias', logo: '📰', url: 'https://rt-glb.rttv.com/live/rtnews/playlist.m3u8', country: '🌍' },

  // Deportes
  { id: 'espn', name: 'ESPN', category: 'Deportes', logo: '⚽', url: '', country: '🌍' },
  { id: 'win sports', name: 'Win Sports', category: 'Deportes', logo: '⚽', url: 'https://tkm-live.winstream.tv:8443/winsportshd/tracks-v1a1/mono.m3u8', country: '🇨🇴' },

  // Música
  { id: 'htv', name: 'HTV', category: 'Música', logo: '🎵', url: 'https://mdstrm.com/live-stream/580a4b3c27de7fed0734a5a5/playlist.m3u8', country: '🇨🇴' },
  { id: 'mtv', name: 'MTV', category: 'Música', logo: '🎵', url: 'https://stream-mtveu-ssai.global.ssl.fastly.net/m2od/83e1c465/mtv_es/playlist.m3u8', country: '🇺🇸' },

  // Entretenimiento
  { id: 'canal13', name: 'Canal 13', category: 'Entretenimiento', logo: '🎭', url: 'https://live-01-02-rtmp.vodgc.net/canal13/smil:canal13.smil/playlist.m3u8', country: '🇨🇴' },
  { id: 'teleantioquia', name: 'Teleantioquia', category: 'Regional', logo: '📺', url: 'https://tvMedios01.nidoinc.com/out/u/tvMedios01.m3u8', country: '🇨🇴' },
  { id: 'telecafe', name: 'Telecafé', category: 'Regional', logo: '☕', url: 'https://streaming.enetres.net/137448A83E8941D2AD804B852595AB06017/smil:live.smil/playlist.m3u8', country: '🇨🇴' },
  { id: 'telepacífico', name: 'Telepacífico', category: 'Regional', logo: '🌊', url: 'https://telepacificolive.com.co/smil:telepacifico.smil/playlist.m3u8', country: '🇨🇴' },
  { id: 'teleislas', name: 'Teleislas', category: 'Regional', logo: '🏝️', url: 'https://teleislas.com.co/smil:teleislas.smil/playlist.m3u8', country: '🇨🇴' },
  { id: 'telecaribe', name: 'Telecaribe', category: 'Regional', logo: '🌴', url: 'https://telecaribe-en-vivo-live.cast-addon.com/playlist.m3u8', country: '🇨🇴' },
  { id: 'canaltr3ce', name: 'Canal TR3CE', category: 'Regional', logo: '📺', url: 'https://mdstrm.com/live-stream/5c0d694b9159bd5b1b13d4c6/playlist.m3u8', country: '🇨🇴' },
  { id: 'cosmovision', name: 'Cosmovisión', category: 'Regional', logo: '📺', url: 'https://stream-gtlc.telecentro.net.ar/hls/cosmovisionHD.m3u8', country: '🇨🇴' },

  // Internacionales
  { id: 'antena3', name: 'Antena 3', category: 'Internacional', logo: '📺', url: 'https://livestream.akamaized.net/hls/live/2027225/antena3/master.m3u8', country: '🇪🇸' },
  { id: 'telecinco', name: 'Telecinco', category: 'Internacional', logo: '📺', url: '', country: '🇪🇸' },
  { id: 'larepublica', name: 'La República', category: 'Noticias', logo: '📰', url: 'https://mdstrm.com/live-stream-playlist/5c0d688327de7fed07357298.m3u8', country: '🇨🇴' },
  { id: 'cablenoticias', name: 'Cable Noticias', category: 'Noticias', logo: '📰', url: 'https://mdstrm.com/live-stream-playlist/5c0d65a51f897b691fde72bd.m3u8', country: '🇨🇴' },

  // Infantil
  { id: 'babytv', name: 'BabyTV', category: 'Infantil', logo: '🧸', url: 'https://d151xqcpre55rw.cloudfront.net/v1/master/3722c60a815c199d9c1ef46cf4e8a03207b528c4/BabyTV/playlist.m3u8', country: '🌍' },

  // Religiosos
  { id: 'cristovision', name: 'Cristovisión', category: 'Religioso', logo: '✝️', url: 'https://stream-gtlc.telecentro.net.ar/hls/cristovisionHD.m3u8', country: '🇨🇴' },
  { id: 'trendych', name: 'Trendy Channel', category: 'Entretenimiento', logo: '🎬', url: 'https://mdstrm.com/live-stream-playlist/5c0d67311f897b691fde727f.m3u8', country: '🇨🇴' },
];

const CATEGORIES = ['Todos', 'Nacional', 'Noticias', 'Deportes', 'Música', 'Entretenimiento', 'Regional', 'Internacional', 'Infantil', 'Religioso'];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Todos': <Globe size={14} />,
  'Nacional': <Tv size={14} />,
  'Noticias': <Newspaper size={14} />,
  'Deportes': <span>⚽</span>,
  'Música': <Music size={14} />,
  'Entretenimiento': <Gamepad2 size={14} />,
  'Regional': <Globe size={14} />,
  'Internacional': <Globe size={14} />,
  'Infantil': <span>🧸</span>,
  'Religioso': <span>✝️</span>,
};

export function IPTVView() {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [activeChannel, setActiveChannel] = useState<IPTVChannel | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [channelError, setChannelError] = useState(false);
  const [isChannelLoading, setIsChannelLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredChannels = selectedCategory === 'Todos'
    ? IPTV_CHANNELS
    : IPTV_CHANNELS.filter(c => c.category === selectedCategory);

  const playChannel = (channel: IPTVChannel) => {
    if (!channel.url) return;
    setActiveChannel(channel);
    setChannelError(false);
    setIsChannelLoading(true);
  };

  const closePlayer = () => {
    setActiveChannel(null);
    setChannelError(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="pt-20 min-h-screen">
      {/* Player overlay */}
      {activeChannel && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col" ref={containerRef}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 h-14 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-20">
            <div className="flex items-center gap-3">
              <button onClick={closePlayer} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                <X size={20} />
              </button>
              <div className="text-white">
                <h2 className="text-sm font-semibold">{activeChannel.name}</h2>
                <p className="text-xs text-gray-400">{activeChannel.category} {activeChannel.country}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button onClick={toggleFullscreen} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                <Maximize size={18} />
              </button>
            </div>
          </div>

          {/* Video player */}
          <div className="flex-1 relative bg-black">
            {isChannelLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/80">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={40} className="text-red-500 animate-spin" />
                  <p className="text-gray-400 text-sm">Cargando canal...</p>
                </div>
              </div>
            )}

            {channelError && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/90">
                <div className="flex flex-col items-center gap-3 text-center px-4">
                  <Radio size={40} className="text-red-500" />
                  <p className="text-white font-semibold">Este canal no está disponible</p>
                  <p className="text-gray-400 text-sm">Intenta con otro canal</p>
                  <button onClick={closePlayer} className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
                    Volver a IPTV
                  </button>
                </div>
              </div>
            )}

            <video
              ref={videoRef}
              src={activeChannel.url}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              controls
              onError={() => { setChannelError(true); setIsChannelLoading(false); }}
              onPlaying={() => setIsChannelLoading(false)}
              onCanPlay={() => setIsChannelLoading(false)}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 max-w-[1400px] mx-auto mb-4">
        <div className="flex items-center gap-3">
          <Radio size={28} className="text-green-500" />
          <h1 className="text-2xl font-bold text-white">IPTV - Canales en Vivo</h1>
        </div>
        <p className="text-gray-500 text-sm mt-1">Canales de televisión de Colombia y el mundo</p>
      </div>

      {/* Category filters */}
      <div className="px-4 max-w-[1400px] mx-auto mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-green-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {CATEGORY_ICONS[cat]}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Channel grid */}
      <div className="px-4 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => playChannel(channel)}
              disabled={!channel.url}
              className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                !channel.url
                  ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-green-500/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
              }`}
            >
              {/* Channel logo */}
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-2xl">
                {channel.logo}
              </div>

              {/* Channel info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm truncate">{channel.name}</h3>
                <p className="text-gray-500 text-xs mt-0.5">{channel.category}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs">{channel.country}</span>
                  {!channel.url && (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Offline</span>
                  )}
                  {channel.url && (
                    <span className="flex items-center gap-1 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                      EN VIVO
                    </span>
                  )}
                </div>
              </div>

              {/* Play button */}
              {channel.url && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-600/20 hover:bg-green-600 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                  <Play size={16} fill="white" className="text-green-400 group-hover:text-white ml-0.5" />
                </div>
              )}
            </button>
          ))}
        </div>

        {filteredChannels.length === 0 && (
          <div className="text-center py-20">
            <Radio size={48} className="text-gray-700 mx-auto mb-4" />
            <h3 className="text-gray-400 text-lg font-semibold">No hay canales en esta categoría</h3>
          </div>
        )}
      </div>

      <div className="h-20" />
    </div>
  );
}

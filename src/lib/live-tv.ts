// Live TV Channels with public M3U8/HLS streams
// These are freely available streams for testing and demo purposes

export interface LiveTVChannel {
  id: string;
  name: string;
  description: string;
  logo: string;
  url: string;           // M3U8/HLS stream URL
  category: string;      // 'news', 'sports', 'music', 'entertainment', 'documentary'
  language: string;
  country: string;
}

export const LIVE_TV_CHANNELS: LiveTVChannel[] = [
  // ─── News / Noticias ──────────────────────────────────
  {
    id: 'france24-en',
    name: 'France 24 English',
    description: 'Noticias internacionales en inglés las 24 horas. Cobertura global desde París.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/France_24_logo.svg/200px-France_24_logo.svg.png',
    url: 'https://stream.france24.com/F24_EN_HI_HLS/live_web.m3u8',
    category: 'news',
    language: 'en',
    country: 'FR',
  },
  {
    id: 'france24-es',
    name: 'France 24 Español',
    description: 'Noticias internacionales en español las 24 horas. Perspectiva global desde París.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/France_24_logo.svg/200px-France_24_logo.svg.png',
    url: 'https://stream.france24.com/F24_ES_HI_HLS/live_web.m3u8',
    category: 'news',
    language: 'es',
    country: 'FR',
  },
  {
    id: 'dw-english',
    name: 'DW English',
    description: 'Deutsche Welle en inglés. Noticias, documentales y reportajes desde Alemania.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Deutsche_Welle_symbol_2012.svg/200px-Deutsche_Welle_symbol_2012.svg.png',
    url: 'https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8',
    category: 'news',
    language: 'en',
    country: 'DE',
  },
  {
    id: 'dw-espanol',
    name: 'DW Español',
    description: 'Deutsche Welle en español. Noticias internacionales y cultura desde Alemania.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Deutsche_Welle_symbol_2012.svg/200px-Deutsche_Welle_symbol_2012.svg.png',
    url: 'https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8',
    category: 'news',
    language: 'es',
    country: 'DE',
  },
  {
    id: 'euronews',
    name: 'Euronews',
    description: 'Canal de noticias europeo. Cobertura de toda Europa y el mundo en varios idiomas.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Euronews_2023_logo.svg/200px-Euronews_2023_logo.svg.png',
    url: 'https://rakuten-euronews-es-1-es.samsung.wurl.tv/playlist.m3u8',
    category: 'news',
    language: 'es',
    country: 'EU',
  },
  {
    id: 'abc-news',
    name: 'ABC News Live',
    description: 'Canal de noticias en vivo de ABC News. Cobertura 24/7 desde Estados Unidos.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/ABC_News_logo.svg/200px-ABC_News_logo.svg.png',
    url: 'https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8',
    category: 'news',
    language: 'en',
    country: 'US',
  },
  {
    id: 'newsy',
    name: 'Newsy Live',
    description: 'Noticias en vivo las 24 horas. Cobertura nacional e internacional desde EE.UU.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Newsy_logo.svg/200px-Newsy_logo.svg.png',
    url: 'https://content.uplynk.com/channel/65030c7b091b4b3a9e181fc40e405364.m3u8',
    category: 'news',
    language: 'en',
    country: 'US',
  },

  // ─── Sports / Deportes ────────────────────────────────
  {
    id: 'bein-sports-xtra',
    name: 'beIN Sports XTRA',
    description: 'Canal de deportes con programación variada: fútbol, tenis, baloncesto y más.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/BeIN_Sports_logo.svg/200px-BeIN_Sports_logo.svg.png',
    url: 'https://bfrench.akamaized.net/hls/live/2032676/bfmtv2/index.m3u8',
    category: 'sports',
    language: 'en',
    country: 'US',
  },
  {
    id: 'stadium-sports',
    name: 'Stadium Sports',
    description: 'Deportes universitarios y eventos especiales en vivo. Fútbol americano y baloncesto NCAA.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Stadium_logo.svg/200px-Stadium_logo.svg.png',
    url: 'https://content.uplynk.com/channel/7689a937067e4defa59f23e56f9c76f1.m3u8',
    category: 'sports',
    language: 'en',
    country: 'US',
  },

  // ─── Science & Documentary / Ciencia ──────────────────
  {
    id: 'nasa-tv',
    name: 'NASA TV',
    description: 'Transmisiones en vivo de la NASA. Lanzamientos, paseos espaciales y cobertura de misiones.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/NASA_logo.svg/200px-NASA_logo.svg.png',
    url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    category: 'documentary',
    language: 'en',
    country: 'US',
  },
  {
    id: 'nasa-media',
    name: 'NASA Media Channel',
    description: 'Canal de medios de la NASA. Documentales, entrevistas y cobertura especial de misiones.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/NASA_logo.svg/200px-NASA_logo.svg.png',
    url: 'https://ntv2.akamaized.net/hls/live/2013923/NASA-NTV2-HLS/master.m3u8',
    category: 'documentary',
    language: 'en',
    country: 'US',
  },
  {
    id: 'smithsonian',
    name: 'Smithsonian Channel',
    description: 'Documentales sobre ciencia, historia, naturaleza y cultura. Programación premium.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Smithsonian_Channel_logo.svg/200px-Smithsonian_Channel_logo.svg.png',
    url: 'https://smithsonianlichn.akamaized.net/hls/live/2028241/sichannel/master.m3u8',
    category: 'documentary',
    language: 'en',
    country: 'US',
  },

  // ─── Music / Música ───────────────────────────────────
  {
    id: 'music-choice',
    name: 'Music Choice',
    description: 'Canales de música las 24 horas. Pop, rock, hip-hop, latin y más géneros.',
    logo: 'https://picsum.photos/seed/music-choice/200/200',
    url: 'https://music-choice.akamaized.net/hls/live/2097871/MCHRNB/master.m3u8',
    category: 'music',
    language: 'en',
    country: 'US',
  },
  {
    id: 'hit-tv',
    name: 'HIT TV Music',
    description: 'Los mejores videos musicales del momento. Pop, reggaetón, y éxitos latinos.',
    logo: 'https://picsum.photos/seed/hit-tv/200/200',
    url: 'https://tvtmspplive.akamaized.net/hls/live/2047811/ALHD/master.m3u8',
    category: 'music',
    language: 'es',
    country: 'ES',
  },

  // ─── Entertainment / Entretenimiento ──────────────────
  {
    id: 'qvc',
    name: 'QVC',
    description: 'Canal de compras y entretenimiento en vivo. Ofertas especiales y productos.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/QVC_logo.svg/200px-QVC_logo.svg.png',
    url: 'https://qvclive-lh.akamaized.net/hls/live/2035057/QVC/master.m3u8',
    category: 'entertainment',
    language: 'en',
    country: 'US',
  },
  {
    id: 'tbd-tv',
    name: 'TBD TV',
    description: 'Entretenimiento juvenil con series, películas y programas originales.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/TBD_TV_logo.svg/200px-TBD_TV_logo.svg.png',
    url: 'https://content.uplynk.com/channel/ba9e5237945b4b6a9080cc5cf0e4bf3e.m3u8',
    category: 'entertainment',
    language: 'en',
    country: 'US',
  },
  {
    id: 'comet-tv',
    name: 'Comet TV',
    description: 'Ciencia ficción, acción y series clásicas las 24 horas.',
    logo: 'https://picsum.photos/seed/comet-tv/200/200',
    url: 'https://content.uplynk.com/channel/65030c7b091b4b3a9e181fc40e405364.m3u8',
    category: 'entertainment',
    language: 'en',
    country: 'US',
  },
];

export const LIVE_TV_CATEGORIES = [
  { id: 'all', name: 'Todos', icon: '📺' },
  { id: 'news', name: 'Noticias', icon: '📰' },
  { id: 'sports', name: 'Deportes', icon: '⚽' },
  { id: 'documentary', name: 'Documentales', icon: '🔬' },
  { id: 'music', name: 'Música', icon: '🎵' },
  { id: 'entertainment', name: 'Entretenimiento', icon: '🎬' },
];

export function getChannelsByCategory(category: string): LiveTVChannel[] {
  if (category === 'all') return LIVE_TV_CHANNELS;
  return LIVE_TV_CHANNELS.filter((ch) => ch.category === category);
}

/**
 * IPTV Guardian - Fuentes M3U predefinidas para monitorear
 * Estas son las mismas fuentes que usa la app Hele, organizadas para el escaneo
 */

export interface SourceDefinition {
  id: string;
  name: string;
  url: string;
  category: 'country' | 'category' | 'extra' | 'language';
  priority: number;
}

export const GUARDIAN_SOURCES: SourceDefinition[] = [
  // ===== PAÍSES HISPANOS (prioridad alta) =====
  { id: 'co', name: 'Colombia', url: 'https://iptv-org.github.io/iptv/countries/co.m3u', category: 'country', priority: 100 },
  { id: 'mx', name: 'México', url: 'https://iptv-org.github.io/iptv/countries/mx.m3u', category: 'country', priority: 100 },
  { id: 'ar', name: 'Argentina', url: 'https://iptv-org.github.io/iptv/countries/ar.m3u', category: 'country', priority: 100 },
  { id: 'es', name: 'España', url: 'https://iptv-org.github.io/iptv/countries/es.m3u', category: 'country', priority: 100 },
  { id: 'cl', name: 'Chile', url: 'https://iptv-org.github.io/iptv/countries/cl.m3u', category: 'country', priority: 90 },
  { id: 've', name: 'Venezuela', url: 'https://iptv-org.github.io/iptv/countries/ve.m3u', category: 'country', priority: 90 },
  { id: 'pe', name: 'Perú', url: 'https://iptv-org.github.io/iptv/countries/pe.m3u', category: 'country', priority: 90 },
  { id: 'bo', name: 'Bolivia', url: 'https://iptv-org.github.io/iptv/countries/bo.m3u', category: 'country', priority: 80 },
  { id: 'cr', name: 'Costa Rica', url: 'https://iptv-org.github.io/iptv/countries/cr.m3u', category: 'country', priority: 80 },
  { id: 'cu', name: 'Cuba', url: 'https://iptv-org.github.io/iptv/countries/cu.m3u', category: 'country', priority: 80 },
  { id: 'do', name: 'Rep. Dominicana', url: 'https://iptv-org.github.io/iptv/countries/do.m3u', category: 'country', priority: 80 },
  { id: 'ec', name: 'Ecuador', url: 'https://iptv-org.github.io/iptv/countries/ec.m3u', category: 'country', priority: 80 },
  { id: 'sv', name: 'El Salvador', url: 'https://iptv-org.github.io/iptv/countries/sv.m3u', category: 'country', priority: 70 },
  { id: 'gt', name: 'Guatemala', url: 'https://iptv-org.github.io/iptv/countries/gt.m3u', category: 'country', priority: 70 },
  { id: 'hn', name: 'Honduras', url: 'https://iptv-org.github.io/iptv/countries/hn.m3u', category: 'country', priority: 70 },
  { id: 'ni', name: 'Nicaragua', url: 'https://iptv-org.github.io/iptv/countries/ni.m3u', category: 'country', priority: 70 },
  { id: 'pa', name: 'Panamá', url: 'https://iptv-org.github.io/iptv/countries/pa.m3u', category: 'country', priority: 70 },
  { id: 'py', name: 'Paraguay', url: 'https://iptv-org.github.io/iptv/countries/py.m3u', category: 'country', priority: 70 },
  { id: 'uy', name: 'Uruguay', url: 'https://iptv-org.github.io/iptv/countries/uy.m3u', category: 'country', priority: 70 },
  { id: 'pr', name: 'Puerto Rico', url: 'https://iptv-org.github.io/iptv/countries/pr.m3u', category: 'country', priority: 70 },

  // ===== IDIOMA / REGIÓN =====
  { id: 'spa', name: 'Todo Español', url: 'https://iptv-org.github.io/iptv/languages/spa.m3u', category: 'language', priority: 110 },
  { id: 'latam', name: 'Latinoamérica', url: 'https://iptv-org.github.io/iptv/regions/latam.m3u', category: 'language', priority: 105 },

  // ===== CATEGORÍAS =====
  { id: 'news', name: 'Noticias', url: 'https://iptv-org.github.io/iptv/categories/news.m3u', category: 'category', priority: 95 },
  { id: 'sports', name: 'Deportes', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u', category: 'category', priority: 95 },
  { id: 'music', name: 'Música', url: 'https://iptv-org.github.io/iptv/categories/music.m3u', category: 'category', priority: 85 },
  { id: 'kids', name: 'Infantil', url: 'https://iptv-org.github.io/iptv/categories/kids.m3u', category: 'category', priority: 85 },
  { id: 'documentary', name: 'Documentales', url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u', category: 'category', priority: 85 },
  { id: 'entertainment', name: 'Entretenimiento', url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u', category: 'category', priority: 80 },
  { id: 'lifestyle', name: 'Estilo de vida', url: 'https://iptv-org.github.io/iptv/categories/lifestyle.m3u', category: 'category', priority: 70 },
  { id: 'education', name: 'Educación', url: 'https://iptv-org.github.io/iptv/categories/education.m3u', category: 'category', priority: 70 },
  { id: 'religious', name: 'Religión', url: 'https://iptv-org.github.io/iptv/categories/religious.m3u', category: 'category', priority: 60 },
  { id: 'comedy', name: 'Comedia', url: 'https://iptv-org.github.io/iptv/categories/comedy.m3u', category: 'category', priority: 60 },
  { id: 'movies', name: 'Películas', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u', category: 'category', priority: 60 },
  { id: 'general', name: 'General', url: 'https://iptv-org.github.io/iptv/categories/general.m3u', category: 'category', priority: 50 },

  // ===== TDTChannels (España - Legal) =====
  { id: 'tdt', name: 'TDT TV España', url: 'https://www.tdtchannels.com/lists/tv.m3u', category: 'extra', priority: 100 },
  { id: 'tdt8', name: 'TDT TV (HLS)', url: 'https://www.tdtchannels.com/lists/tv.m3u8', category: 'extra', priority: 95 },
  { id: 'tdt-radio', name: 'TDT Radio', url: 'https://www.tdtchannels.com/lists/radio.m3u', category: 'extra', priority: 85 },
  { id: 'tdt-radio8', name: 'TDT Radio (HLS)', url: 'https://www.tdtchannels.com/lists/radio.m3u8', category: 'extra', priority: 85 },
  { id: 'tdt-all', name: 'TDT TV + Radio', url: 'https://www.tdtchannels.com/lists/tvradio.m3u8', category: 'extra', priority: 80 },

  // ===== FUENTES ADICIONALES =====
  { id: 'free-tv', name: 'Free-TV Global', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u', category: 'extra', priority: 80 },
  { id: 'free-tv-es', name: 'Free-TV España', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_spain.m3u8', category: 'extra', priority: 85 },
  { id: 'free-tv-mx', name: 'Free-TV México', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_mexico.m3u8', category: 'extra', priority: 85 },
  { id: 'free-tv-ar', name: 'Free-TV Argentina', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_argentina.m3u8', category: 'extra', priority: 80 },
  { id: 'free-tv-cl', name: 'Free-TV Chile', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_chile.m3u8', category: 'extra', priority: 80 },
  { id: 'free-tv-co', name: 'Free-TV Colombia', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_colombia.m3u8', category: 'extra', priority: 90 },
  { id: 'free-tv-pe', name: 'Free-TV Perú', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_peru.m3u8', category: 'extra', priority: 80 },
  { id: 'free-tv-ve', name: 'Free-TV Venezuela', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_venezuela.m3u8', category: 'extra', priority: 80 },
  { id: 'm3ucl-total', name: 'M3U.CL Todos', url: 'https://www.m3u.cl/lista/total.m3u', category: 'extra', priority: 75 },
  { id: 'm3ucl-music', name: 'M3U.CL Música', url: 'https://www.m3u.cl/lista/musica.m3u', category: 'extra', priority: 70 },
  { id: 'telechancho', name: 'telechancho', url: 'https://telechancho.github.io/telechancho-iptv/telechancho-infinity.m3u', category: 'extra', priority: 75 },

  // ===== HBO PREMIUM =====
  { id: 'hbo', name: 'HBO Premium', url: 'https://raw.githubusercontent.com/lupael/IPTV/master/channels/hbo.m3u8', category: 'extra', priority: 95 },

  // ===== PREMIUM LATINO =====
  { id: 'premium', name: 'Premium Latino', url: 'https://raw.githubusercontent.com/vivemastv/IPTV/master/PREMIUN/LATINOS/M3UP001', category: 'extra', priority: 98 },
];

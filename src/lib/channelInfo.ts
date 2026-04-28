// ═══════════════════════════════════════════════════════════════════════
// XuperStream - Channel Info Service
// Extrae metadata, adivina calidad y provee placeholder EPG
// ═══════════════════════════════════════════════════════════════════════

import type { M3UChannel } from './m3uParser';

export interface ChannelExtendedInfo {
  channel: M3UChannel;
  displayQuality: string;
  genre: string;
  countryFlag: string;
  languageLabel: string;
  isLikely247: boolean;
  streamType: 'hls' | 'mpegts' | 'dash' | 'progressive' | 'unknown';
  serverLocation?: string;
  epgNow?: EPGEntry;
  epgNext?: EPGEntry;
}

export interface EPGEntry {
  title: string;
  start: string;
  end: string;
  description?: string;
  icon?: string;
}

// ─── Quality Detection ──────────────────────────────────────────

/**
 * Detecta la calidad del stream basado en la URL y nombre del canal.
 */
export function detectChannelQuality(channel: M3UChannel): string {
  const url = channel.url.toLowerCase();
  const name = channel.name.toLowerCase();
  const combined = `${url} ${name}`;

  if (/4k|2160|uhd/i.test(combined)) return '4K UHD';
  if (/1080|fhd|full.?hd/i.test(combined)) return '1080p Full HD';
  if (/hd|720p?/i.test(combined) && !/sd/i.test(combined)) return '720p HD';
  if (/sd|576|480/i.test(combined)) return '480p SD';

  // Guess by group
  const group = channel.groupTitle.toLowerCase();
  if (group.includes('4k') || group.includes('uhd')) return '4K UHD';
  if (group.includes('hd') && !group.includes('sd')) return '720p HD';
  if (group.includes('sd')) return '480p SD';

  return 'SD';
}

// ─── Stream Type Detection ─────────────────────────────────────

/**
 * Detecta el tipo de stream por la extensión/URL.
 */
export function detectStreamType(url: string): ChannelExtendedInfo['streamType'] {
  const lower = url.toLowerCase();

  if (lower.includes('.m3u8') || lower.includes('hls') || lower.includes('/hls/')) {
    return 'hls';
  }
  if (lower.includes('.mpd') || lower.includes('dash')) {
    return 'dash';
  }
  if (lower.endsWith('.ts') || lower.includes('/live/') || lower.includes('mpegts')) {
    return 'mpegts';
  }
  if (lower.endsWith('.mp4') || lower.endsWith('.mkv') || lower.endsWith('.webm')) {
    return 'progressive';
  }

  return 'unknown';
}

// ─── Genre Classification ──────────────────────────────────────

const GENRE_KEYWORDS: Record<string, string[]> = {
  'Deportes': ['sport', 'deport', 'futbol', 'football', 'soccer', 'basket', 'tennis', 'nba', 'nfl', 'fifa', 'win', 'espn', 'fox sport', 'bein'],
  'Noticias': ['news', 'noticia', 'informe', '24h', '24 hor', 'cnbc', 'cnn', 'bbc', 'telenoticias'],
  'Música': ['music', 'musica', 'mtv', 'vh1', 'hit', 'radio', 'kalle', 'vallenato', 'salsa', 'rumba'],
  'Infantil': ['kids', 'child', 'infant', 'cartoon', 'anime', 'disney', 'nickelodeon', 'toon', 'eureka'],
  'Películas': ['movie', 'pelicula', 'film', 'cinema', 'cine', 'retro', 'terror', 'comedia', 'accion'],
  'Documentales': ['doc', 'document', 'discovery', 'natgeo', 'nasa', 'history', 'smithsonian'],
  'Entretenimiento': ['entreten', 'variety', 'show', 'reality', 'comedy central', 'teve'],
  'Religión': ['relig', 'church', 'iglesia', 'cristo', 'bendicion', 'cmb', 'catolic'],
  'Cultura': ['cultura', 'education', 'educativ', 'senal colombia', 'cosmovision'],
  'Regional': ['regional', 'local', 'canal', 'teleantioquia', 'telecaribe', 'telepacifico'],
};

/**
 * Clasifica el género del canal basado en nombre y grupo.
 */
export function classifyGenre(channel: M3UChannel): string {
  const text = `${channel.name} ${channel.groupTitle}`.toLowerCase();

  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) return genre;
    }
  }

  return 'General';
}

// ─── Country Flag ──────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  CO: '🇨🇴',
  MX: '🇲🇽',
  AR: '🇦🇷',
  ES: '🇪🇸',
  BR: '🇧🇷',
  CL: '🇨🇱',
  PE: '🇵🇪',
  EC: '🇪🇨',
  VE: '🇻🇪',
  US: '🇺🇸',
  UK: '🇬🇧',
  FR: '🇫🇷',
  DE: '🇩🇪',
  IT: '🇮🇹',
  JP: '🇯🇵',
  KR: '🇰🇷',
  INTL: '🌍',
  LATAM: '🌎',
  EU: '🇪🇺',
};

/**
 * Obtiene la bandera del país.
 */
export function getCountryFlag(countryCode: string): string {
  return COUNTRY_FLAGS[countryCode] || '📺';
}

// ─── Language Label ─────────────────────────────────────────────

const LANGUAGE_LABELS: Record<string, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
};

/**
 * Etiqueta legible del idioma.
 */
export function getLanguageLabel(code: string): string {
  return LANGUAGE_LABELS[code.toLowerCase()] || code.toUpperCase();
}

// ─── 24/7 Detection ────────────────────────────────────────────

/**
 * Detecta si un canal es probablemente 24/7 (loops).
 */
export function isLikely247(channel: M3UChannel): boolean {
  const text = `${channel.name} ${channel.groupTitle}`.toLowerCase();
  return (
    text.includes('24/7') ||
    text.includes('24h') ||
    text.includes('24horas') ||
    text.includes('lofi') ||
    text.includes('radio')
  );
}

// ─── EPG Placeholder ───────────────────────────────────────────

/**
 * Genera entradas EPG placeholder basadas en el género del canal.
 * Esto es un placeholder hasta integrar con un EPG real (xmltv).
 */
export function generatePlaceholderEPG(channel: M3UChannel): {
  now: EPGEntry;
  next: EPGEntry;
} {
  const genre = classifyGenre(channel);
  const now = new Date();
  const next = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

  const genrePrograms: Record<string, string[]> = {
    'Deportes': ['Resumen Deportivo', 'Partido en Vivo', 'Análisis Post-Partido'],
    'Noticias': ['Noticiero', 'Informe Especial', 'Panorama Mundial'],
    'Música': ['Top Hits', 'Clásicos', 'Concierto Especial'],
    'Infantil': ['Dibujos Animados', 'Aprende Jugando', 'Aventuras'],
    'Películas': ['Cine de Acción', 'Drama', 'Comedia Nocturna'],
    'Documentales': ['Documental', 'Naturaleza', 'Ciencia y Tecnología'],
    'Entretenimiento': ['Variedades', 'Reality Show', 'Late Night'],
    'General': ['Programación', 'Especial', 'Magazine'],
  };

  const programs = genrePrograms[genre] || genrePrograms['General'];

  return {
    now: {
      title: programs[0],
      start: formatTime(now),
      end: formatTime(next),
      description: `Programación de ${genre} en ${channel.name}`,
    },
    next: {
      title: programs[1] || 'Programación por definir',
      start: formatTime(next),
      end: formatTime(new Date(next.getTime() + 60 * 60 * 1000)),
      description: `Siguiente programa en ${channel.name}`,
    },
  };
}

// ─── Main Function ─────────────────────────────────────────────

/**
 * Obtiene información extendida de un canal.
 */
export function getChannelExtendedInfo(channel: M3UChannel): ChannelExtendedInfo {
  const epg = generatePlaceholderEPG(channel);

  return {
    channel,
    displayQuality: detectChannelQuality(channel),
    genre: classifyGenre(channel),
    countryFlag: getCountryFlag(channel.tvgCountry),
    languageLabel: getLanguageLabel(channel.tvgLanguage),
    isLikely247: isLikely247(channel),
    streamType: detectStreamType(channel.url),
    epgNow: epg.now,
    epgNext: epg.next,
  };
}

// ─── Helpers ───────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

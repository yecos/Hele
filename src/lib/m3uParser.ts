// ═══════════════════════════════════════════════════════════════════════
// XuperStream - M3U/M3U8 Playlist Parser
// Compatible con playlists Xtream Codes, iptv-org y M3U genéricas
// ═══════════════════════════════════════════════════════════════════════

export interface M3UChannel {
  id: string;
  name: string;
  url: string;
  logo: string;
  group: string;
  groupTitle: string;
  tvgId: string;
  tvgName: string;
  tvgLanguage: string;
  tvgCountry: string;
  isHD: boolean;
  isRadio: boolean;
  quality: string;
}

export interface M3UParseResult {
  channels: M3UChannel[];
  groups: { id: string; name: string; count: number }[];
  errors: string[];
  totalLines: number;
  parseTime: number;
}

/**
 * Parsea una playlist M3U/M3U8 y extrae los canales con metadatos.
 *
 * Soporta formatos:
 * - #EXTM3U con atributos estándar (tvg-id, tvg-name, tvg-logo, group-title)
 * - Formato Xtream Codes (http://server/live/user/pass/id.ts)
 * - Formato M3U simple (solo URL)
 */
export function parseM3U(content: string): M3UParseResult {
  const startTime = performance.now();
  const lines = content.split('\n').map((l) => l.trim());
  const errors: string[] = [];
  const channels: M3UChannel[] = [];
  const groupCountMap = new Map<string, number>();

  // Verify M3U header
  const firstLine = lines[0]?.toUpperCase();
  if (!firstLine?.startsWith('#EXTM3U')) {
    // Not a valid M3U file, try to parse anyway (some files don't have header)
    errors.push('Advertencia: El archivo no tiene la cabecera #EXTM3U estándar');
  }

  let currentDirective: Record<string, string> = {};
  let currentName = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines and comments (except EXTINF)
    if (!line || (line.startsWith('#') && !line.startsWith('#EXTINF'))) {
      continue;
    }

    if (line.startsWith('#EXTINF')) {
      // Parse EXTINF directive: #EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="..." group-title="...",Channel Name
      currentDirective = parseExtInf(line);
      // Channel name is after the last comma
      const commaIndex = line.lastIndexOf(',');
      currentName = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : '';
      continue;
    }

    // Non-comment line = stream URL
    if (line && (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('rtsp'))) {
      const group = currentDirective['group-title'] || 'Sin Grupo';
      const groupId = slugify(group);

      const channel: M3UChannel = {
        id: generateChannelId(line, channels.length),
        name: currentName || currentDirective['tvg-name'] || extractNameFromUrl(line),
        url: line,
        logo: currentDirective['tvg-logo'] || '',
        group: groupId,
        groupTitle: group,
        tvgId: currentDirective['tvg-id'] || '',
        tvgName: currentDirective['tvg-name'] || '',
        tvgLanguage: currentDirective['tvg-language'] || '',
        tvgCountry: currentDirective['tvg-country'] || '',
        isHD: detectHD(line, currentName),
        isRadio: detectRadio(line, currentName, group),
        quality: detectQuality(line, currentName),
      };

      channels.push(channel);
      groupCountMap.set(groupId, (groupCountMap.get(groupId) || 0) + 1);

      // Reset for next channel
      currentDirective = {};
      currentName = '';
    }
  }

  // Build groups array
  const groups = Array.from(groupCountMap.entries())
    .map(([id, count]) => ({
      id,
      name: channels.find((ch) => ch.group === id)?.groupTitle || id,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    channels,
    groups,
    errors,
    totalLines: lines.length,
    parseTime: performance.now() - startTime,
  };
}

/**
 * Parsea una URL de playlist M3U y devuelve los canales.
 * Usa un proxy CORS para evitar problemas de cross-origin.
 */
export async function parseM3UFromUrl(url: string): Promise<M3UParseResult> {
  // Try to fetch via the proxy API route
  const proxyUrl = `/api/iptv-proxy?url=${encodeURIComponent(url)}`;

  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      throw new Error(`Error al obtener la playlist: ${res.status}`);
    }
    const content = await res.text();
    return parseM3U(content);
  } catch (error) {
    return {
      channels: [],
      groups: [],
      errors: [
        `No se pudo cargar la playlist: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      ],
      totalLines: 0,
      parseTime: 0,
    };
  }
}

/**
 * Filtra canales por grupo, nombre o calidad.
 */
export function filterChannels(
  channels: M3UChannel[],
  options: {
    group?: string;
    search?: string;
    hdOnly?: boolean;
    excludeRadio?: boolean;
  } = {}
): M3UChannel[] {
  return channels.filter((ch) => {
    if (options.group && ch.group !== options.group && ch.groupTitle !== options.group) {
      return false;
    }
    if (options.search) {
      const query = options.search.toLowerCase();
      if (
        !ch.name.toLowerCase().includes(query) &&
        !ch.groupTitle.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (options.hdOnly && !ch.isHD) {
      return false;
    }
    if (options.excludeRadio && ch.isRadio) {
      return false;
    }
    return true;
  });
}

/**
 * Convierte canales M3U al formato Movie del store de XuperStream.
 */
export function m3uToMovie(ch: M3UChannel): {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  videoUrl: string;
  year: number;
  duration: string;
  rating: number;
  genre: string;
  category: string;
  isLive: boolean;
  featured: boolean;
  trending: boolean;
} {
  return {
    id: `m3u-${ch.id}`,
    title: ch.name,
    description: `Canal: ${ch.groupTitle}${ch.tvgLanguage ? ` | Idioma: ${ch.tvgLanguage}` : ''}${ch.quality ? ` | ${ch.quality}` : ''}`,
    posterUrl: ch.logo || `https://picsum.photos/seed/${ch.id}/400/600`,
    backdropUrl: `https://picsum.photos/seed/${ch.id}-bg/1920/1080`,
    videoUrl: ch.url,
    year: 2025,
    duration: '24/7',
    rating: 0,
    genre: ch.groupTitle,
    category: 'tv',
    isLive: true,
    featured: false,
    trending: false,
  };
}

// ─── Internal Helpers ─────────────────────────────────────────

function parseExtInf(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};

  // Match key="value" or key='value' pairs
  const attrRegex = /([a-zA-Z-]+)=["']([^"']*)["']/g;
  let match;
  while ((match = attrRegex.exec(line)) !== null) {
    attrs[match[1]] = match[2];
  }

  return attrs;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateChannelId(url: string, index: number): string {
  // Try to extract stream ID from Xtream Codes URL
  const xtreamMatch = url.match(/\/live\/[^/]+\/[^/]+\/(\d+)\./);
  if (xtreamMatch) return `xtream-${xtreamMatch[1]}`;

  // Try to extract ID from VOD URL
  const vodMatch = url.match(/\/movie\/[^/]+\/[^/]+\/(\d+)\./);
  if (vodMatch) return `vod-${vodMatch[1]}`;

  // Fallback: hash the URL
  return `ch-${index}-${simpleHash(url)}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 50); i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function extractNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || '';
    const name = filename.split('.')[0];
    return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return 'Canal sin nombre';
  }
}

function detectHD(url: string, name: string): boolean {
  const lower = (url + ' ' + name).toLowerCase();
  return (
    lower.includes('hd') ||
    lower.includes('1080') ||
    lower.includes('720') ||
    lower.includes('4k') ||
    lower.includes('uhd') ||
    lower.includes('fhd')
  );
}

function detectRadio(url: string, name: string, group: string): boolean {
  const lower = (url + ' ' + name + ' ' + group).toLowerCase();
  return (
    lower.includes('radio') ||
    lower.includes('.mp3') ||
    lower.includes('.aac') ||
    lower.includes('/audio/')
  );
}

function detectQuality(url: string, name: string): string {
  const combined = (url + ' ' + name).toLowerCase();
  if (combined.includes('4k') || combined.includes('2160')) return '4K UHD';
  if (combined.includes('1080') || combined.includes('fhd')) return '1080p Full HD';
  if (combined.includes('hd') || combined.includes('720')) return '720p HD';
  if (combined.includes('sd') || combined.includes('576') || combined.includes('480')) return 'SD';
  return '';
}

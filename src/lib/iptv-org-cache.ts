// ═══════════════════════════════════════════════════════════════════════
// XuperStream - Cache Inteligente para API de iptv-org
// Usa Next.js fetch revalidate (serverless-safe) + deduplicacion
// ═══════════════════════════════════════════════════════════════════════

const IPTV_API_BASE = 'https://iptv-org.github.io/api';

// ─── Tipos de la API de iptv-org ──────────────────────────────

export interface IptvStream {
  channel: string | null;
  feed: string | null;
  title: string;
  url: string;
  quality: string | null;
  label: string | null;
  referrer: string | null;
  user_agent: string | null;
}

export interface IptvChannel {
  id: string;
  name: string;
  alt_names: string[];
  network: string | null;
  owners: string[];
  country: string;
  categories: string[];
  is_nsfw: boolean;
  launched: string | null;
  closed: string | null;
  replaced_by: string | null;
  website: string | null;
}

export interface IptvCountry {
  name: string;
  code: string;
  languages: string[];
  flag: string;
}

export interface IptvCategory {
  id: string;
  name: string;
  description: string;
}

export interface IptvLogo {
  channel: string;
  url: string;
}

// ─── Canal enriquecido (lo que devuelve la API interna) ──────

export interface EnrichedStream {
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
  referrer: string | null;
  userAgent: string | null;
  channelName: string;
  website: string | null;
  isNsfw: boolean;
  isClosed: boolean;
}

// ─── Deduplicador de fetches en flight ────────────────────────
// Evita fetches duplicados cuando multiples requests llegan
// simultaneamente en serverless (sin cache en memoria persistente)

const inFlight = new Map<string, Promise<unknown>>();

async function dedupedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

// ─── Funciones de fetch con cache ─────────────────────────────

/**
 * Obtiene todos los streams de la API.
 * Cacheado por 1 hora via Next.js revalidate.
 * ~3.17 MB, 15,165 registros.
 */
export async function getStreams(): Promise<IptvStream[]> {
  return dedupedFetch('streams', async () => {
    const res = await fetch(`${IPTV_API_BASE}/streams.json`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Failed to fetch streams: ${res.status}`);
    return res.json();
  });
}

/**
 * Obtiene todos los canales de la API.
 * Cacheado por 1 hora.
 * ~9.85 MB, 39,457 registros.
 * PRECAUCION: Solo usar cuando sea estrictamente necesario.
 */
export async function getChannels(): Promise<IptvChannel[]> {
  return dedupedFetch('channels', async () => {
    const res = await fetch(`${IPTV_API_BASE}/channels.json`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Failed to fetch channels: ${res.status}`);
    return res.json();
  });
}

/**
 * Obtiene la lista de paises. Cacheado por 6 horas.
 * ~19 KB, 250 registros.
 */
export async function getCountries(): Promise<IptvCountry[]> {
  return dedupedFetch('countries', async () => {
    const res = await fetch(`${IPTV_API_BASE}/countries.json`, {
      next: { revalidate: 21600 },
    });
    if (!res.ok) throw new Error(`Failed to fetch countries: ${res.status}`);
    return res.json();
  });
}

/**
 * Obtiene las categorias. Cacheado por 24 horas.
 * ~3 KB, 30 registros.
 */
export async function getCategories(): Promise<IptvCategory[]> {
  return dedupedFetch('categories', async () => {
    const res = await fetch(`${IPTV_API_BASE}/categories.json`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
    return res.json();
  });
}

/**
 * Obtiene logos de canales. Cacheado por 24 horas.
 */
export async function getLogos(): Promise<IptvLogo[]> {
  return dedupedFetch('logos', async () => {
    const res = await fetch(`${IPTV_API_BASE}/logos.json`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`Failed to fetch logos: ${res.status}`);
    return res.json();
  });
}

// ─── Funciones de alto nivel ──────────────────────────────────

/**
 * Obtiene canales enriquecidos por pais usando la API JSON.
 * Enriquece streams con datos de canales (nombre, categorias, pais).
 * Filtra NSFW y cerrados automaticamente.
 */
export async function getEnrichedStreamsByCountry(
  countryCode: string,
  options?: { category?: string; search?: string; limit?: number }
): Promise<EnrichedStream[]> {
  const [streams, channels] = await Promise.all([getStreams(), getChannels()]);

  // Crear mapa de canales para busqueda rapida
  const channelMap = new Map<string, IptvChannel>();
  const logoMap = new Map<string, string>();
  for (const ch of channels) channelMap.set(ch.id, ch);

  // Filtrar streams
  const filtered = streams.filter((s) => {
    const ch = s.channel ? channelMap.get(s.channel) : null;
    if (!ch) return false;
    if (ch.is_nsfw) return false;
    if (ch.closed) return false;
    if (ch.country?.toLowerCase() !== countryCode.toLowerCase()) return false;

    if (options?.category) {
      if (!ch.categories?.includes(options.category)) return false;
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      const nameMatch = (s.title || '').toLowerCase().includes(q);
      const channelNameMatch = ch.name?.toLowerCase().includes(q) || false;
      const altNameMatch = ch.alt_names?.some((n) => n.toLowerCase().includes(q)) || false;
      if (!nameMatch && !channelNameMatch && !altNameMatch) return false;
    }

    return true;
  });

  // Enriquecer y deduplicar por URL
  const seen = new Set<string>();
  const enriched: EnrichedStream[] = [];

  for (const s of filtered) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);

    const ch = s.channel ? channelMap.get(s.channel) : null;
    enriched.push({
      id: `${s.channel || 'unknown'}-${enriched.length}`,
      name: s.title || ch?.name || 'Unknown',
      description: ch?.name || s.title || '',
      logo: logoMap.get(s.channel || '') || '',
      url: s.url,
      quality: s.quality || 'unknown',
      country: ch ? getCountryNameFromCode(ch.country) : 'unknown',
      countryCode: ch?.country || 'unknown',
      categories: ch?.categories || [],
      label: s.label,
      referrer: s.referrer,
      userAgent: s.user_agent,
      channelName: ch?.name || '',
      website: ch?.website,
      isNsfw: ch?.is_nsfw || false,
      isClosed: !!ch?.closed,
    });
  }

  if (options?.limit) {
    return enriched.slice(0, options.limit);
  }

  return enriched;
}

/**
 * Obtiene conteo de canales por pais.
 * Cacheado por 6 horas.
 */
export async function getCountryChannelCounts(): Promise<Record<string, number>> {
  const channels = await getChannels();
  const counts: Record<string, number> = {};
  for (const ch of channels) {
    if (ch.is_nsfw || ch.closed) continue;
    const code = ch.country?.toLowerCase();
    if (code) counts[code] = (counts[code] || 0) + 1;
  }
  return counts;
}

/**
 * Obtiene canales por pais usando el playlist M3U (mas ligero que JSON API).
 * Recomendado para listar canales de un pais especifico.
 */
export async function getStreamsFromM3U(countryCode: string): Promise<EnrichedStream[]> {
  const m3uUrl = `https://iptv-org.github.io/iptv/countries/${countryCode}.m3u`;
  const res = await fetch(m3uUrl, { next: { revalidate: 3600 } });

  if (!res.ok) return [];

  const { parseM3U } = await import('./m3uParser');
  const content = await res.text();
  const result = parseM3U(content);

  // Deduplicar por URL
  const seen = new Set<string>();
  const streams: EnrichedStream[] = [];

  for (const ch of result.channels) {
    if (seen.has(ch.url)) continue;
    seen.add(ch.url);

    streams.push({
      id: ch.id,
      name: ch.name,
      description: ch.groupTitle,
      logo: ch.logo,
      url: ch.url,
      quality: ch.quality,
      country: countryCode.toUpperCase(),
      countryCode: countryCode.toUpperCase(),
      categories: [ch.groupTitle],
      label: null,
      referrer: null,
      userAgent: null,
      channelName: ch.tvgName || ch.name,
      website: null,
      isNsfw: false,
      isClosed: false,
    });
  }

  return streams;
}

// ─── Helpers ──────────────────────────────────────────────────

const COUNTRY_NAMES: Record<string, string> = {
  CO: 'Colombia', MX: 'Mexico', AR: 'Argentina', VE: 'Venezuela',
  CL: 'Chile', PE: 'Peru', EC: 'Ecuador', BR: 'Brasil', ES: 'Espana',
  US: 'Estados Unidos', GB: 'Reino Unido', FR: 'Francia', DE: 'Alemania',
  IT: 'Italia', PT: 'Portugal', CA: 'Canada', JP: 'Japon', KR: 'Corea del Sur',
  AU: 'Australia', IN: 'India', TR: 'Turquia', RU: 'Rusia',
};

function getCountryNameFromCode(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code.toUpperCase();
}

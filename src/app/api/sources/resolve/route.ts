// Source Resolver API
// Resolves TMDB movie/TV IDs into direct playable .m3u8 video URLs
// Uses multiple parallel strategies: direct APIs, page scraping, multiembed services

export const runtime = 'edge';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ResolvedSource {
  url: string;
  type: 'hls' | 'dash' | 'direct';
  quality: string;
  server: string;
  label: string;
}

interface FallbackSource {
  url: string;
  type: 'embed';
  server: string;
  label: string;
}

interface ResolveResponse {
  sources: ResolvedSource[];
  fallback: FallbackSource[];
}

// ─── Constants ─────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT = 8000; // 8 seconds per request
const MAX_NATIVE_SOURCES = 10;
const MAX_FALLBACK_SOURCES = 5;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
};

// Fallback embed servers (always included in response)
const FALLBACK_EMBED_SERVERS = [
  {
    server: 'vidsrc-pm',
    label: 'Servidor 1 (Iframe)',
    movieUrl: (id: number) => `https://vidsrc.pm/embed/movie/${id}?lang=es`,
    tvUrl: (id: number, s: number, e: number) =>
      `https://vidsrc.pm/embed/tv/${id}/${s}/${e}?lang=es`,
  },
  {
    server: 'moviesapi',
    label: 'Servidor 2 (Iframe)',
    movieUrl: (id: number) => `https://moviesapi.to/movie/${id}`,
    tvUrl: (id: number, s: number, e: number) =>
      `https://moviesapi.to/tv/${id}-${s}-${e}`,
  },
  {
    server: 'vidsrc-me',
    label: 'Servidor 3 (Iframe)',
    movieUrl: (id: number) => `https://vidsrc.me/embed/movie/${id}?lang=es`,
    tvUrl: (id: number, s: number, e: number) =>
      `https://vidsrc.me/embed/tv/${id}/${s}/${e}?lang=es`,
  },
  {
    server: 'vidsrc-io',
    label: 'Servidor 4 (Iframe)',
    movieUrl: (id: number) => `https://vidsrc.io/embed/movie/${id}?lang=es`,
    tvUrl: (id: number, s: number, e: number) =>
      `https://vidsrc.io/embed/tv/${id}/${s}/${e}?lang=es`,
  },
  {
    server: 'vidsrc-dev',
    label: 'Servidor 5 (Iframe)',
    movieUrl: (id: number) => `https://vidsrc.dev/embed/movie/${id}?lang=es`,
    tvUrl: (id: number, s: number, e: number) =>
      `https://vidsrc.dev/embed/tv/${id}/${s}/${e}?lang=es`,
  },
];

// ─── Helper: Quality Detection ─────────────────────────────────────────────

function detectQualityFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('2160') || lower.includes('4k')) return '4K';
  if (lower.includes('1080')) return '1080p';
  if (lower.includes('720')) return '720p';
  if (lower.includes('480')) return '480p';
  if (lower.includes('360')) return '360p';
  return 'Auto';
}

function qualityRank(q: string): number {
  const lower = q.toLowerCase();
  if (lower.includes('4k') || lower.includes('2160')) return 10;
  if (lower.includes('1080')) return 8;
  if (lower.includes('720')) return 6;
  if (lower.includes('480')) return 4;
  if (lower.includes('360')) return 2;
  return 0; // "Auto" gets lowest priority
}

// ─── Helper: URL Cleanup ───────────────────────────────────────────────────

function cleanUrl(url: string): string {
  return url
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .trim();
}

// ─── Helper: Fetch with Timeout ────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Helper: M3U8 Extraction from HTML ─────────────────────────────────────

function extractM3u8FromHtml(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const patterns = [
    /["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/gi,
    /source:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
    /file:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
    /src:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
    /url:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
    /video_url["']?\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
    /source_url["']?\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
    /playlist["']?\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
    /hls_url["']?\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
    /stream[_-]?url["']?\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = cleanUrl(match[1]);
      // Filter out obviously invalid URLs
      if (
        url.startsWith('http') &&
        url.length > 25 &&
        !seen.has(url) &&
        !url.includes('//localhost') &&
        !url.includes('127.0.0.1')
      ) {
        seen.add(url);
        urls.push(url);
      }
    }
  }

  // Also try base64-decoded URLs
  const b64Pattern = /atob\(["']([A-Za-z0-9+/=]{30,})["']\)/gi;
  let b64Match;
  while ((b64Match = b64Pattern.exec(html)) !== null) {
    try {
      const decoded = atob(b64Match[1]);
      if (decoded.includes('m3u8')) {
        const urlMatch = decoded.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/);
        if (urlMatch) {
          const url = cleanUrl(urlMatch[1]);
          if (url.startsWith('http') && !seen.has(url)) {
            seen.add(url);
            urls.push(url);
          }
        }
      }
    } catch {
      // Invalid base64, skip
    }
  }

  return urls;
}

// ─── Helper: MP4 Extraction from HTML ──────────────────────────────────────

function extractMp4FromHtml(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const pattern = /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const url = cleanUrl(match[1]);
    if (url.startsWith('http') && url.length > 25 && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

// ─── Strategy 1: Direct API Calls ──────────────────────────────────────────
// These services expose JSON APIs that return m3u8 source lists directly.

async function strategyDirectApis(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<ResolvedSource[]> {
  const sources: ResolvedSource[] = [];

  const apiCalls: Array<{
    name: string;
    url: string;
    parse: (data: any) => string[];
  }> = [];

  // vidsrc.xyz — returns { sources: [{ file: "url" }] } (movies only)
  if (mediaType === 'movie') {
    apiCalls.push({
      name: 'vidsrc-xyz',
      url: `https://vidsrc.xyz/api/source/${tmdbId}`,
      parse: (data) => {
        if (data?.sources && Array.isArray(data.sources)) {
          return data.sources
            .filter((s: any) => s.file && typeof s.file === 'string')
            .map((s: any) => s.file);
        }
        return [];
      },
    });
  }

  // vidsrc.icu — similar format, supports both movies and TV
  const icuPath =
    mediaType === 'movie'
      ? `${tmdbId}`
      : `${tmdbId}-${season || 1}-${episode || 1}`;
  apiCalls.push({
    name: 'vidsrc-icu',
    url: `https://vidsrc.icu/api/source/${icuPath}`,
    parse: (data) => {
      if (data?.sources && Array.isArray(data.sources)) {
        return data.sources
          .filter((s: any) => s.file && typeof s.file === 'string')
          .map((s: any) => s.file);
      }
      // Some responses use "data" field instead
      if (data?.data && typeof data.data === 'string') {
        try {
          const inner = JSON.parse(data.data);
          if (inner?.sources && Array.isArray(inner.sources)) {
            return inner.sources
              .filter((s: any) => s.file && typeof s.file === 'string')
              .map((s: any) => s.file);
          }
        } catch {
          // Not JSON
        }
      }
      return [];
    },
  });

  // autoembed.cc — POST API, returns sources
  const aeId =
    mediaType === 'tv'
      ? `${tmdbId}-${season || 1}-${episode || 1}`
      : `${tmdbId}`;
  apiCalls.push({
    name: 'autoembed-cc',
    url: `https://autoembed.cc/api/source/${aeId}`,
    parse: (data) => {
      if (data?.sources && Array.isArray(data.sources)) {
        return data.sources
          .filter((s: any) => s.file && typeof s.file === 'string')
          .map((s: any) => s.file);
      }
      if (data?.data && typeof data.data === 'string') {
        try {
          const inner = JSON.parse(data.data);
          if (inner?.sources && Array.isArray(inner.sources)) {
            return inner.sources
              .filter((s: any) => s.file && typeof s.file === 'string')
              .map((s: any) => s.file);
          }
        } catch {
          // Not JSON
        }
      }
      return [];
    },
  });

  // Execute all API calls in parallel
  const results = await Promise.allSettled(
    apiCalls.map(async (call) => {
      const resp = await fetchWithTimeout(call.url, {
        method: 'GET',
        headers: {
          ...BROWSER_HEADERS,
          Referer: new URL(call.url).origin + '/',
        },
      });

      if (!resp.ok) return null;

      const data = await resp.json();
      return { name: call.name, urls: call.parse(data) };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const { name, urls } = result.value;
      for (const url of urls) {
        const cleaned = cleanUrl(url);
        if (cleaned.includes('.m3u8')) {
          sources.push({
            url: cleaned,
            type: 'hls',
            quality: detectQualityFromUrl(cleaned),
            server: name,
            label: `Servidor (${name})`,
          });
        } else if (cleaned.includes('.mp4')) {
          sources.push({
            url: cleaned,
            type: 'direct',
            quality: detectQualityFromUrl(cleaned),
            server: name,
            label: `Servidor (${name})`,
          });
        }
      }
    }
  }

  return sources;
}

// ─── Strategy 2: Scrape Embed Pages ────────────────────────────────────────
// Fetch the actual embed page HTML and extract m3u8/mp4 URLs via regex.

async function strategyScrapeEmbeds(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<ResolvedSource[]> {
  const sources: ResolvedSource[] = [];

  // Build embed URLs to scrape
  const embeds: Array<{ server: string; url: string }> = [];

  // vidsrc.pm embeds
  if (mediaType === 'movie') {
    embeds.push({
      server: 'vidsrc-pm-scrape',
      url: `https://vidsrc.pm/embed/movie/${tmdbId}?lang=es`,
    });
  } else {
    embeds.push({
      server: 'vidsrc-pm-scrape',
      url: `https://vidsrc.pm/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?lang=es`,
    });
  }

  // moviesapi.to
  if (mediaType === 'movie') {
    embeds.push({
      server: 'moviesapi-scrape',
      url: `https://moviesapi.to/movie/${tmdbId}`,
    });
  } else {
    embeds.push({
      server: 'moviesapi-scrape',
      url: `https://moviesapi.to/tv/${tmdbId}-${season || 1}-${episode || 1}`,
    });
  }

  // vidsrc.me
  if (mediaType === 'movie') {
    embeds.push({
      server: 'vidsrc-me-scrape',
      url: `https://vidsrc.me/embed/movie/${tmdbId}?lang=es`,
    });
  } else {
    embeds.push({
      server: 'vidsrc-me-scrape',
      url: `https://vidsrc.me/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?lang=es`,
    });
  }

  // vidsrc.dev
  if (mediaType === 'movie') {
    embeds.push({
      server: 'vidsrc-dev-scrape',
      url: `https://vidsrc.dev/embed/movie/${tmdbId}?lang=es`,
    });
  } else {
    embeds.push({
      server: 'vidsrc-dev-scrape',
      url: `https://vidsrc.dev/embed/tv/${tmdbId}/${season || 1}/${episode || 1}?lang=es`,
    });
  }

  // Fetch all embed pages in parallel
  const results = await Promise.allSettled(
    embeds.map(async ({ server, url }) => {
      const resp = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          ...BROWSER_HEADERS,
          Referer: url,
        },
      });

      if (!resp.ok) return null;

      const html = await resp.text();
      return { server, html, url };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const { server, html } = result.value;

      // Extract m3u8 URLs
      const m3u8Urls = extractM3u8FromHtml(html);
      for (const m3u8Url of m3u8Urls) {
        sources.push({
          url: m3u8Url,
          type: 'hls',
          quality: detectQualityFromUrl(m3u8Url),
          server,
          label: `Servidor (${server.replace('-scrape', '')})`,
        });
      }

      // Extract mp4 URLs
      const mp4Urls = extractMp4FromHtml(html);
      for (const mp4Url of mp4Urls) {
        sources.push({
          url: mp4Url,
          type: 'direct',
          quality: detectQualityFromUrl(mp4Url),
          server,
          label: `Servidor (${server.replace('-scrape', '')})`,
        });
      }
    }
  }

  return sources;
}

// ─── Strategy 3: Multiembed / Autoembed Services ───────────────────────────
// These services aggregate multiple sources and sometimes expose them in-page.

async function strategyMultiembed(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<ResolvedSource[]> {
  const sources: ResolvedSource[] = [];

  const embeds: Array<{ server: string; url: string }> = [];

  // multiembed.mov
  embeds.push({
    server: 'multiembed',
    url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
  });

  // embed.su
  if (mediaType === 'movie') {
    embeds.push({
      server: 'embed-su',
      url: `https://embed.su/embed/movie/${tmdbId}`,
    });
  } else {
    embeds.push({
      server: 'embed-su',
      url: `https://embed.su/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
    });
  }

  // vidsrc.xyz embed page (not API) — may have inline sources
  if (mediaType === 'movie') {
    embeds.push({
      server: 'vidsrc-xyz-embed',
      url: `https://vidsrc.xyz/embed/movie/${tmdbId}`,
    });
  } else {
    embeds.push({
      server: 'vidsrc-xyz-embed',
      url: `https://vidsrc.xyz/embed/tv/${tmdbId}/${season || 1}/${episode || 1}`,
    });
  }

  // 2embed.cc alternative
  if (mediaType === 'movie') {
    embeds.push({
      server: '2embed',
      url: `https://www.2embed.cc/embed/${tmdbId}`,
    });
  } else {
    embeds.push({
      server: '2embed',
      url: `https://www.2embed.cc/embed/${tmdbId}/${season || 1}/${episode || 1}`,
    });
  }

  const results = await Promise.allSettled(
    embeds.map(async ({ server, url }) => {
      const resp = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          ...BROWSER_HEADERS,
          Referer: url,
        },
      });

      if (!resp.ok) return null;

      const html = await resp.text();
      return { server, html, url };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const { server, html } = result.value;

      // Extract m3u8 URLs from multiembed pages
      const m3u8Urls = extractM3u8FromHtml(html);
      for (const m3u8Url of m3u8Urls) {
        sources.push({
          url: m3u8Url,
          type: 'hls',
          quality: detectQualityFromUrl(m3u8Url),
          server,
          label: `Servidor (${server})`,
        });
      }

      // Extract mp4 URLs
      const mp4Urls = extractMp4FromHtml(html);
      for (const mp4Url of mp4Urls) {
        sources.push({
          url: mp4Url,
          type: 'direct',
          quality: detectQualityFromUrl(mp4Url),
          server,
          label: `Servidor (${server})`,
        });
      }

      // Look for JSON source data blobs that some multiembed services inject
      const jsonBlobPatterns = [
        /(?:sources|tracks)\s*[:=]\s*(\[[\s\S]*?\])\s*[;,}]/,
        /(?:playerOptions|options)\s*[:=]\s*\{[\s\S]*?sources\s*:\s*(\[[\s\S]*?\])/,
      ];
      for (const pattern of jsonBlobPatterns) {
        const blobMatch = pattern.exec(html);
        if (blobMatch) {
          try {
            const sourcesArr = JSON.parse(blobMatch[1]);
            if (Array.isArray(sourcesArr)) {
              for (const item of sourcesArr) {
                const file =
                  item.file || item.src || item.url || item.source;
                if (file && typeof file === 'string') {
                  const cleaned = cleanUrl(file);
                  if (cleaned.includes('.m3u8')) {
                    sources.push({
                      url: cleaned,
                      type: 'hls',
                      quality: detectQualityFromUrl(cleaned),
                      server,
                      label: `Servidor (${server})`,
                    });
                  } else if (cleaned.includes('.mp4')) {
                    sources.push({
                      url: cleaned,
                      type: 'direct',
                      quality: detectQualityFromUrl(cleaned),
                      server,
                      label: `Servidor (${server})`,
                    });
                  }
                }
              }
            }
          } catch {
            // Invalid JSON, skip
          }
        }
      }
    }
  }

  return sources;
}

// ─── Fallback Generation ───────────────────────────────────────────────────
// Always include embed iframe URLs as fallbacks.

function generateFallbacks(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): FallbackSource[] {
  return FALLBACK_EMBED_SERVERS.slice(0, MAX_FALLBACK_SOURCES).map((srv) => ({
    url:
      mediaType === 'movie'
        ? srv.movieUrl(tmdbId)
        : srv.tvUrl(tmdbId, season || 1, episode || 1),
    type: 'embed' as const,
    server: srv.server,
    label: srv.label,
  }));
}

// ─── Deduplication ─────────────────────────────────────────────────────────

function deduplicateSources(sources: ResolvedSource[]): ResolvedSource[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    // Deduplicate by URL (normalize trailing slashes)
    const key = s.url.replace(/\/+$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Sorting ───────────────────────────────────────────────────────────────
// HLS first, then by quality descending (1080p > 720p > 480p > Auto)

function sortSources(sources: ResolvedSource[]): ResolvedSource[] {
  return [...sources].sort((a, b) => {
    // HLS streams get priority over direct
    const typeOrder: Record<string, number> = { hls: 0, dash: 1, direct: 2 };
    const aType = typeOrder[a.type] ?? 3;
    const bType = typeOrder[b.type] ?? 3;
    if (aType !== bType) return aType - bType;

    // Within same type, sort by quality descending
    return qualityRank(b.quality) - qualityRank(a.quality);
  });
}

// ─── Quality Label Enhancement ─────────────────────────────────────────────

function enhanceLabels(sources: ResolvedSource[]): ResolvedSource[] {
  let nativeCounter = 0;
  return sources.map((source) => {
    nativeCounter++;
    const qualityPart = source.quality !== 'Auto' ? ` ${source.quality}` : '';
    return {
      ...source,
      label: `Servidor ${nativeCounter} (Nativo${qualityPart})`,
    };
  });
}

// ─── Main GET Handler ──────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  // Validate required params
  if (!id || !type) {
    return Response.json(
      { error: 'Parameters "id" and "type" are required', sources: [], fallback: [] },
      {
        status: 400,
        headers: corsHeaders(),
      }
    );
  }

  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId)) {
    return Response.json(
      { error: 'Invalid TMDB ID', sources: [], fallback: [] },
      {
        status: 400,
        headers: corsHeaders(),
      }
    );
  }

  if (type !== 'movie' && type !== 'tv') {
    return Response.json(
      { error: 'Type must be "movie" or "tv"', sources: [], fallback: [] },
      {
        status: 400,
        headers: corsHeaders(),
      }
    );
  }

  const seasonNum = season ? parseInt(season, 10) : undefined;
  const episodeNum = episode ? parseInt(episode, 10) : undefined;

  try {
    // Run all three strategies in parallel
    const [directResults, scrapeResults, multiembedResults] = await Promise.allSettled([
      strategyDirectApis(tmdbId, type, seasonNum, episodeNum),
      strategyScrapeEmbeds(tmdbId, type, seasonNum, episodeNum),
      strategyMultiembed(tmdbId, type, seasonNum, episodeNum),
    ]);

    // Collect all native sources from successful strategies
    const allSources: ResolvedSource[] = [];

    if (directResults.status === 'fulfilled') {
      allSources.push(...directResults.value);
    }
    if (scrapeResults.status === 'fulfilled') {
      allSources.push(...scrapeResults.value);
    }
    if (multiembedResults.status === 'fulfilled') {
      allSources.push(...multiembedResults.value);
    }

    // Deduplicate, sort, enhance, and limit
    const unique = deduplicateSources(allSources);
    const sorted = sortSources(unique);
    const limited = sorted.slice(0, MAX_NATIVE_SOURCES);
    const labeled = enhanceLabels(limited);

    // Always generate fallback embed URLs
    const fallback = generateFallbacks(tmdbId, type, seasonNum, episodeNum);

    const response: ResolveResponse = {
      sources: labeled,
      fallback,
    };

    return Response.json(response, {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (error: any) {
    console.error('Source resolve error:', error?.message || error);

    // Even on error, return fallback embed URLs
    const fallback = generateFallbacks(tmdbId, type, seasonNum, episodeNum);

    return Response.json(
      {
        sources: [],
        fallback,
        error: 'Failed to resolve native sources, showing embed fallbacks',
      },
      {
        status: 200, // Still 200 — we have fallbacks
        headers: corsHeaders(),
      }
    );
  }
}

// ─── CORS Headers ──────────────────────────────────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  };
}

// Handle CORS preflight
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

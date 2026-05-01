import { NextRequest, NextResponse } from 'next/server';
import { TMDB_SERVERS } from '@/lib/sources';

const TIMEOUT_MS = 8000;

// Textos que indican que el contenido NO está disponible
const UNAVAILABLE_PATTERNS = [
  'not found',
  'no source',
  'no sources',
  'unavailable',
  'error loading',
  'could not find',
  'does not exist',
  'removed',
  'deleted',
  'this content is',
  'page not found',
  'movie not found',
  'episode not found',
  'video not found',
  'server error',
  'not available',
  'no stream',
  'no results',
];

// Indicadores de que SÍ hay un player de video funcional
const PLAYER_INDICATORS = [
  'player',
  '<video',
  'hls',
  '.m3u8',
  'source src',
  'jwplayer',
  'videojs',
  'plyr',
  'flowplayer',
  'iframe',
  'embed',
  'vidstack',
  'mediaelement',
  '.mp4',
  'autoplay',
  'react-player',
  'playback',
  'stream',
  'data-id',
  'tmdb',
];

// Patrones de servidores específicos que sabemos que devuelven contenido válido
const VALID_PAGE_INDICATORS = [
  'root',           // React apps mount point
  'app',            // Next.js/Vite app mount
  'vite',           // Vite-based players
  'webpack',        // Webpack bundles
  'chunk',          // Code splitting
  '__next',         // Next.js
  'nuxt',           // Nuxt.js
];

interface ProbeResult {
  id: string;
  name: string;
  available: boolean;
  latency: number;
  reason?: string;
}

async function probeServer(
  server: typeof TMDB_SERVERS[0],
  tmdbId: number,
  type: 'movie' | 'tv',
  season?: number,
  episode?: number
): Promise<ProbeResult> {
  const url = server.getUrl(tmdbId, type, season, episode);
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': url,
      },
    });

    clearTimeout(timeout);
    const latency = Date.now() - start;

    // Status code check - 3xx redirects were followed, so >=400 is bad
    if (res.status >= 400) {
      return { id: server.id, name: server.name, available: false, latency, reason: `HTTP ${res.status}` };
    }

    // Read body with a size limit
    const reader = res.body?.getReader();
    if (!reader) {
      return { id: server.id, name: server.name, available: false, latency, reason: 'No body' };
    }

    let bodyLength = 0;
    let bodyChunk = '';
    const maxRead = 20000; // read up to 20KB for better analysis
    let done = false;

    while (!done && bodyLength < maxRead) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) {
        bodyLength += value.length;
        bodyChunk += new TextDecoder().decode(value, { stream: true });
      }
    }

    reader.cancel();

    // Very small response = probably an error page or empty redirect
    if (bodyLength < 500) {
      return { id: server.id, name: server.name, available: false, latency, reason: 'Too small' };
    }

    const lowerBody = bodyChunk.toLowerCase();

    // Check for unavailable indicators (but only count strong signals)
    const unavailableMatches = UNAVAILABLE_PATTERNS.filter(p => lowerBody.includes(p));
    const hasPlayerIndicators = PLAYER_INDICATORS.some(p => lowerBody.includes(p));
    const hasValidPage = VALID_PAGE_INDICATORS.some(p => lowerBody.includes(p));

    // Large response with player/app indicators = definitely working
    if (bodyLength > 5000 && (hasPlayerIndicators || hasValidPage)) {
      return { id: server.id, name: server.name, available: true, latency };
    }

    // If there are strong unavailable signals and no positive indicators
    if (unavailableMatches.length >= 3 && !hasPlayerIndicators && !hasValidPage) {
      return { id: server.id, name: server.name, available: false, latency, reason: 'Not found' };
    }

    // If there's a player indicator, it's very likely working
    if (hasPlayerIndicators) {
      return { id: server.id, name: server.name, available: true, latency };
    }

    // Medium response with valid page indicators
    if (bodyLength > 1000 && hasValidPage) {
      return { id: server.id, name: server.name, available: true, latency };
    }

    // Default: if status is 200 and body is substantial, assume available
    if (bodyLength > 800) {
      return { id: server.id, name: server.name, available: true, latency };
    }

    return { id: server.id, name: server.name, available: false, latency, reason: 'Uncertain' };
  } catch (err) {
    const latency = Date.now() - start;
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    return {
      id: server.id,
      name: server.name,
      available: false,
      latency,
      reason: isTimeout ? 'Timeout' : 'Connection error',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tmdbId, type, season, episode } = body;

    if (!tmdbId || !type) {
      return NextResponse.json({ error: 'Missing tmdbId or type' }, { status: 400 });
    }

    // Probe all servers in parallel
    const probes = TMDB_SERVERS.map(server =>
      probeServer(server, tmdbId, type, season, episode)
    );

    const results = await Promise.all(probes);

    const available = results.filter(r => r.available).sort((a, b) => a.latency - b.latency);
    const unavailable = results.filter(r => !r.available);

    return NextResponse.json({
      servers: results,
      available,
      unavailable,
      total: results.length,
      workingCount: available.length,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

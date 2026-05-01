import { NextRequest, NextResponse } from 'next/server';
import { TMDB_SERVERS } from '@/lib/sources';

const TIMEOUT_MS = 7000;

// Textos que indican que el contenido NO está disponible
const UNAVAILABLE_PATTERNS = [
  'not found',
  '404',
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
  '500',
  '502',
  '503',
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
  'videojs',
  'flowplayer',
  'iframe',
  'embed',
  'vidstack',
  'mediaelement',
  'dash',
  'mp4',
  'autoplay',
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
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(timeout);
    const latency = Date.now() - start;

    // Status code check
    if (res.status >= 400) {
      return { id: server.id, name: server.name, available: false, latency, reason: `HTTP ${res.status}` };
    }

    // Read body with a size limit (10KB is enough to determine availability)
    const reader = res.body?.getReader();
    if (!reader) {
      return { id: server.id, name: server.name, available: false, latency, reason: 'No body' };
    }

    let bodyLength = 0;
    let bodyChunk = '';
    const maxRead = 15000; // read up to 15KB
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

    // Very small response = probably an error page or redirect
    if (bodyLength < 800) {
      return { id: server.id, name: server.name, available: false, latency, reason: 'Too small' };
    }

    const lowerBody = bodyChunk.toLowerCase();

    // Check for unavailable indicators
    const unavailableMatches = UNAVAILABLE_PATTERNS.filter(p => lowerBody.includes(p));
    const hasPlayerIndicators = PLAYER_INDICATORS.some(p => lowerBody.includes(p));

    // If there are strong unavailable signals and no player indicators
    if (unavailableMatches.length >= 2 && !hasPlayerIndicators) {
      return { id: server.id, name: server.name, available: false, latency, reason: 'Not found' };
    }

    // If there's a player indicator, it's very likely working
    if (hasPlayerIndicators) {
      return { id: server.id, name: server.name, available: true, latency };
    }

    // Default: if status is 200 and body is substantial, assume available
    return { id: server.id, name: server.name, available: true, latency };
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

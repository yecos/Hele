// Torrent Search API - Searches YTS and The Pirate Bay
// No API key needed - uses public APIs

export const runtime = 'edge';

interface TorrentResult {
  title: string;
  magnet: string;
  size: string;
  sizeBytes: number;
  seeders: number;
  leechers: number;
  quality: string;
  source: string;
  year?: number;
  hash?: string;
}

// ─── YTS API (Movies only, high quality) ──────────────────────────────────

async function searchYTS(query: string, limit: number): Promise<TorrentResult[]> {
  try {
    const url = `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}&limit=${limit}&sort_by=seeders`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (data.status !== 'ok' || !data.data?.movies) return [];

    const results: TorrentResult[] = [];

    for (const movie of data.data.movies) {
      for (const torrent of movie.torrents || []) {
        results.push({
          title: `${movie.title_long || movie.title} (${torrent.quality})`,
          magnet: torrent.url || '',
          size: torrent.size || 'N/A',
          sizeBytes: parseSizeBytes(torrent.size || '0'),
          seeders: torrent.seeds || 0,
          leechers: torrent.peers || 0,
          quality: torrent.quality || 'Unknown',
          source: 'YTS',
          year: movie.year,
          hash: torrent.hash,
        });
      }
    }

    return results;
  } catch (err) {
    console.error('YTS search error:', err);
    return [];
  }
}

// ─── The Pirate Bay API (apibay.org - Movies + TV shows) ──────────────────

async function searchTPB(query: string, limit: number): Promise<TorrentResult[]> {
  try {
    const url = `https://apibay.org/q.php?q=${encodeURIComponent(query)}&cat=0`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    // Filter out "No results returned" entry
    const results: TorrentResult[] = [];

    for (const item of data) {
      if (!item.name || item.name === 'No results returned') continue;

      // Try to detect quality from name
      const name = item.name.toString();
      const quality = detectQuality(name);

      // Build magnet link from info_hash
      const hash = item.info_hash?.toString().trim();
      const magnet = hash
        ? `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://open.tracker.cl:1337/announce&tr=udp://tracker.openbittorrent.com:6969/announce&tr=udp://tracker.torrent.eu.org:451/announce&tr=udp://explodie.org:6969/announce`
        : '';

      const seeders = parseInt(item.seeders?.toString() || '0');
      const leechers = parseInt(item.leechers?.toString() || '0');

      // Skip torrents with 0 seeders
      if (seeders === 0) continue;

      results.push({
        title: cleanTitle(name),
        magnet,
        size: formatBytes(parseInt(item.size?.toString() || '0')),
        sizeBytes: parseInt(item.size?.toString() || '0'),
        seeders,
        leechers,
        quality,
        source: 'TPB',
      });
    }

    // Sort by seeders and limit
    results.sort((a, b) => b.seeders - a.seeders);
    return results.slice(0, limit);
  } catch (err) {
    console.error('TPB search error:', err);
    return [];
  }
}

// ─── 1337x HTML scraping (fallback) ───────────────────────────────────────

async function search1337x(query: string, limit: number): Promise<TorrentResult[]> {
  try {
    // Use solidtorrents API as a reliable alternative
    const url = `https://api.solidtorrents.to/api/v1/search?q=${encodeURIComponent(query)}&sort=seeders&category=video&skip=0&limit=${limit}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.results) return [];

    return data.results
      .filter((item: any) => item.magnet)
      .map((item: any) => ({
        title: item.title || 'Unknown',
        magnet: item.magnet,
        size: formatBytes(item.size || 0),
        sizeBytes: item.size || 0,
        seeders: item.swarm?.seeders || item.seeders || 0,
        leechers: item.swarm?.leechers || item.leechers || 0,
        quality: detectQuality(item.title || ''),
        source: 'SolidTorrents',
      }))
      .slice(0, limit);
  } catch (err) {
    console.error('SolidTorrents search error:', err);
    return [];
  }
}

// ─── Helper Functions ─────────────────────────────────────────────────────

function detectQuality(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('2160p') || lower.includes('4k')) return '4K';
  if (lower.includes('1080p') || lower.includes('1080')) return '1080p';
  if (lower.includes('720p') || lower.includes('720')) return '720p';
  if (lower.includes('480p') || lower.includes('480')) return '480p';
  if (lower.includes('webrip') || lower.includes('web-dl') || lower.includes('webdl')) return 'WEB-DL';
  if (lower.includes('bluray') || lower.includes('blu-ray') || lower.includes('brip')) return 'BluRay';
  if (lower.includes('camrip') || lower.includes('cam')) return 'CAM';
  if (lower.includes('hdrip')) return 'HDRip';
  if (lower.includes('dvdrip') || lower.includes('dvd')) return 'DVDRip';
  if (lower.includes('hdtv')) return 'HDTV';
  if (lower.includes('web')) return 'WEB';
  return 'Unknown';
}

function cleanTitle(name: string): string {
  // Remove common tracker tags and clean up
  return name
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, (match) => {
      // Keep year and quality info
      if (/^\(\d{4}\)$/.test(match)) return match;
      if (match.includes('1080p') || match.includes('720p') || match.includes('2160p') || match.includes('4K')) return match;
      return '';
    })
    .replace(/www\..*?\s/g, '')
    .replace(/\.+(avi|mkv|mp4|mov|wmv|flv|webm)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSizeBytes(size: string): number {
  const match = size.match(/([\d.]+)\s*(GB|MB|KB|TB)/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  switch (unit) {
    case 'TB': return num * 1024 * 1024 * 1024 * 1024;
    case 'GB': return num * 1024 * 1024 * 1024;
    case 'MB': return num * 1024 * 1024;
    case 'KB': return num * 1024;
    default: return 0;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const type = searchParams.get('type') || 'all'; // 'movie', 'tv', 'all'
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!query) {
    return Response.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  if (query.length < 2) {
    return Response.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    // Search all sources in parallel
    const searchPromises: Promise<TorrentResult[]>[] = [];

    // YTS only has movies, always search it for movies
    if (type === 'movie' || type === 'all') {
      searchPromises.push(searchYTS(query, limit));
    }

    // TPB has everything
    searchPromises.push(searchTPB(query, limit));

    // SolidTorrents as fallback
    searchPromises.push(search1337x(query, limit));

    const [ytsResults, tpbResults, solidResults] = await Promise.allSettled(searchPromises);

    const allResults: TorrentResult[] = [
      ...(ytsResults.status === 'fulfilled' ? ytsResults.value : []),
      ...(tpbResults.status === 'fulfilled' ? tpbResults.value : []),
      ...(solidResults.status === 'fulfilled' ? solidResults.value : []),
    ];

    // De-duplicate by magnet hash (first occurrence wins - usually highest seeder source)
    const seen = new Set<string>();
    const uniqueResults: TorrentResult[] = [];

    for (const result of allResults) {
      const hash = extractHash(result.magnet);
      if (hash && seen.has(hash)) continue;
      if (hash) seen.add(hash);

      // Prefer known quality info
      uniqueResults.push(result);
    }

    // Sort by seeders (desc), then by quality (4K > 1080p > 720p > ...)
    uniqueResults.sort((a, b) => {
      if (b.seeders !== a.seeders) return b.seeders - a.seeders;
      return qualityRank(b.quality) - qualityRank(a.quality);
    });

    // Limit total results
    const finalResults = uniqueResults.slice(0, limit);

    return Response.json({
      query,
      results: finalResults,
      total: finalResults.length,
      sources: {
        yts: ytsResults.status === 'fulfilled' ? ytsResults.value.length : 0,
        tpb: tpbResults.status === 'fulfilled' ? tpbResults.value.length : 0,
        solid: solidResults.status === 'fulfilled' ? solidResults.value.length : 0,
      },
    });
  } catch (err: any) {
    console.error('Torrent search error:', err);
    return Response.json(
      { error: 'Failed to search torrents', results: [] },
      { status: 500 }
    );
  }
}

function extractHash(magnet: string): string | null {
  const match = magnet.match(/btih:([a-fA-F0-9]{40})/);
  if (match) return match[1].toLowerCase();
  const match32 = magnet.match(/btih:([A-Z2-7]{32})/i);
  if (match32) return match32[1].toLowerCase();
  return null;
}

function qualityRank(quality: string): number {
  const q = quality.toLowerCase();
  if (q.includes('4k') || q.includes('2160')) return 10;
  if (q.includes('1080')) return 8;
  if (q.includes('720')) return 6;
  if (q.includes('480')) return 4;
  if (q.includes('bluray')) return 7;
  if (q.includes('web-dl') || q.includes('webdl')) return 5;
  if (q.includes('hdtv')) return 5;
  if (q.includes('hdrip')) return 4;
  if (q.includes('dvdrip') || q.includes('dvd')) return 3;
  if (q.includes('cam')) return 1;
  return 2;
}

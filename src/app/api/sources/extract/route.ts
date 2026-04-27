// Source Extractor API
// Fetches embed pages and extracts direct video URLs (.m3u8, .mp4)

export const runtime = 'edge';

interface ExtractedSource {
  url: string;
  type: 'hls' | 'dash' | 'direct';
  quality: string;
  label: string;
}

// Known embed patterns and how to extract video URLs from them
const EMBED_PATTERNS: Record<string, {
  domains: string[];
  extract: (html: string, url: string) => ExtractedSource[];
}> = {
  vidsrc: {
    domains: ['vidsrc.pm', 'vidsrc.me', 'vidsrc.io', 'vidsrc.dev', 'vidsrc.to', 'vidsrc.cc'],
    extract: (html, _url) => {
      const sources: ExtractedSource[] = [];

      // Pattern 1: Direct m3u8 in the page source
      const m3u8Patterns = [
        /["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/gi,
        /source:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
        /file:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
        /src:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
        /url:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
        /video_url["']?\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
        /source_url["']?\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
        /playlist["']?\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
        /hls_url["']?\s*[:=]\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
      ];

      for (const pattern of m3u8Patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const m3u8Url = match[1]
            .replace(/\\u002F/g, '/')
            .replace(/\\\//g, '/')
            .replace(/&amp;/g, '&');
          if (!sources.some(s => s.url === m3u8Url)) {
            const quality = detectQualityFromUrl(m3u8Url);
            sources.push({
              url: m3u8Url,
              type: 'hls',
              quality,
              label: quality === 'Unknown' ? 'Auto' : quality,
            });
          }
        }
      }

      // Pattern 2: MP4 direct links
      const mp4Pattern = /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/gi;
      let mp4Match;
      while ((mp4Match = mp4Pattern.exec(html)) !== null) {
        const mp4Url = mp4Match[1].replace(/&amp;/g, '&');
        if (!sources.some(s => s.url === mp4Url)) {
          sources.push({
            url: mp4Url,
            type: 'direct',
            quality: detectQualityFromUrl(mp4Url),
            label: 'MP4',
          });
        }
      }

      // Pattern 3: Base64 encoded URLs
      const b64Pattern = /atob\(["']([A-Za-z0-9+/=]+)["']\)/gi;
      let b64Match;
      while ((b64Match = b64Pattern.exec(html)) !== null) {
        try {
          const decoded = atob(b64Match[1]);
          if (decoded.includes('m3u8') || decoded.includes('.mp4')) {
            const cleanUrl = decoded.replace(/\\u002F/g, '/');
            if (!sources.some(s => s.url === cleanUrl)) {
              sources.push({
                url: cleanUrl,
                type: cleanUrl.includes('.m3u8') ? 'hls' : 'direct',
                quality: detectQualityFromUrl(cleanUrl),
                label: 'Decoded',
              });
            }
          }
        } catch {}
      }

      // Pattern 4: Look for JSON objects containing video URLs
      const jsonPatterns = [
        /(?:source|file|url|stream)["']?\s*:\s*["']([^"']+?(?:m3u8|mp4)[^"']*)/gi,
        /(?:source|file|url|stream)["']?\s*:\s*["']([^"']+)/gi,
      ];

      for (const pattern of jsonPatterns) {
        let jMatch;
        while ((jMatch = pattern.exec(html)) !== null) {
          const candidateUrl = jMatch[1]
            .replace(/\\u002F/g, '/')
            .replace(/\\\//g, '/')
            .replace(/&amp;/g, '&');
          if (
            (candidateUrl.includes('.m3u8') || candidateUrl.includes('.mp4')) &&
            candidateUrl.startsWith('http') &&
            !sources.some(s => s.url === candidateUrl)
          ) {
            sources.push({
              url: candidateUrl,
              type: candidateUrl.includes('.m3u8') ? 'hls' : 'direct',
              quality: detectQualityFromUrl(candidateUrl),
              label: candidateUrl.includes('.m3u8') ? 'HLS' : 'MP4',
            });
          }
        }
      }

      return sources;
    },
  },
  moviesapi: {
    domains: ['moviesapi.to', 'moviesapi.cx', 'moviesapi.co'],
    extract: (html, _url) => {
      const sources: ExtractedSource[] = [];
      // MoviesAPI typically has m3u8 sources in the page
      const patterns = [
        /["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/gi,
        /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)/gi,
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const url = match[1].replace(/&amp;/g, '&').replace(/\\u002F/g, '/');
          if (!sources.some(s => s.url === url)) {
            sources.push({
              url,
              type: 'hls',
              quality: detectQualityFromUrl(url),
              label: detectQualityFromUrl(url) === 'Unknown' ? 'Auto' : detectQualityFromUrl(url),
            });
          }
        }
      }
      return sources;
    },
  },
  generic: {
    domains: [],
    extract: (html, _url) => {
      const sources: ExtractedSource[] = [];

      // Generic m3u8 extraction
      const m3u8Pattern = /["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/gi;
      let match;
      while ((match = m3u8Pattern.exec(html)) !== null) {
        const url = match[1]
          .replace(/\\u002F/g, '/')
          .replace(/\\\//g, '/')
          .replace(/&amp;/g, '&');
        // Filter out short/invalid URLs
        if (url.length > 20 && url.startsWith('http') && !sources.some(s => s.url === url)) {
          sources.push({
            url,
            type: 'hls',
            quality: detectQualityFromUrl(url),
            label: 'HLS',
          });
        }
      }

      // Generic mp4 extraction
      const mp4Pattern = /["'](https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/gi;
      while ((match = mp4Pattern.exec(html)) !== null) {
        const url = match[1].replace(/&amp;/g, '&');
        if (url.length > 20 && !sources.some(s => s.url === url)) {
          sources.push({
            url,
            type: 'direct',
            quality: detectQualityFromUrl(url),
            label: 'MP4',
          });
        }
      }

      return sources;
    },
  },
};

function detectQualityFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('2160') || lower.includes('4k')) return '4K';
  if (lower.includes('1080')) return '1080p';
  if (lower.includes('720')) return '720p';
  if (lower.includes('480')) return '480p';
  if (lower.includes('360')) return '360p';
  return 'Auto';
}

function identifyDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const [key, config] of Object.entries(EMBED_PATTERNS)) {
      if (config.domains.some(d => hostname.includes(d))) return key;
    }
  } catch {}
  return 'generic';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const embedUrl = searchParams.get('url');

  if (!embedUrl) {
    return Response.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    const domainKey = identifyDomain(embedUrl);
    const extractor = EMBED_PATTERNS[domainKey] || EMBED_PATTERNS.generic;

    // Fetch the embed page
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(embedUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        'Referer': embedUrl,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return Response.json({ error: `Failed to fetch embed: ${res.status}`, sources: [] });
    }

    const html = await res.text();

    // Try to extract sources using domain-specific extractor
    let sources = extractor.extract(html, embedUrl);

    // If domain-specific extractor found nothing, try generic
    if (sources.length === 0 && domainKey !== 'generic') {
      sources = EMBED_PATTERNS.generic.extract(html, embedUrl);
    }

    // If still nothing, try aggressive parsing
    if (sources.length === 0) {
      // Look for encoded data
      const encodedPattern = /(?:data|content|src)\s*[:=]\s*["']([A-Za-z0-9+/=%]{50,})["']/gi;
      let encMatch;
      while ((encMatch = encodedPattern.exec(html)) !== null) {
        try {
          const decoded = decodeURIComponent(encMatch[1]);
          if (decoded.includes('http') && (decoded.includes('.m3u8') || decoded.includes('.mp4'))) {
            const urlMatch = decoded.match(/(https?:\/\/[^\s"'<>]+(?:\.m3u8|\.mp4)[^\s"'<>]*)/);
            if (urlMatch) {
              sources.push({
                url: urlMatch[1],
                type: urlMatch[1].includes('.m3u8') ? 'hls' : 'direct',
                quality: detectQualityFromUrl(urlMatch[1]),
                label: 'Extracted',
              });
            }
          }
        } catch {}
      }
    }

    // Deduplicate and sort (prefer m3u8 over mp4, higher quality first)
    const seen = new Set<string>();
    const unique = sources.filter(s => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });

    // Sort: m3u8 first, then by quality rank
    unique.sort((a, b) => {
      if (a.type === 'hls' && b.type !== 'hls') return -1;
      if (a.type !== 'hls' && b.type === 'hls') return 1;
      return qualityRank(b.quality) - qualityRank(a.quality);
    });

    return Response.json({
      embedUrl,
      domain: domainKey,
      sources: unique.slice(0, 10),
      total: unique.length,
    });
  } catch (err: any) {
    console.error('Source extraction error:', err);
    return Response.json(
      {
        error: err.name === 'AbortError' ? 'Timeout fetching embed' : 'Failed to extract sources',
        sources: [],
      },
      { status: 500 }
    );
  }
}

function qualityRank(q: string): number {
  const lower = q.toLowerCase();
  if (lower.includes('4k') || lower.includes('2160')) return 10;
  if (lower.includes('1080')) return 8;
  if (lower.includes('720')) return 6;
  if (lower.includes('480')) return 4;
  if (lower.includes('360')) return 2;
  return 0;
}

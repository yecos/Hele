import { NextRequest, NextResponse } from 'next/server';

// Cache: URL -> { working: boolean, timestamp: number }
const verifyCache: Record<string, { working: boolean; timestamp: number }> = {};
const VERIFY_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Timeout for each stream check
const CHECK_TIMEOUT = 4000; // 4 seconds
// Max concurrent checks
const CONCURRENCY = 15;

interface VerifyRequest {
  urls: string[];
}

async function checkStream(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT);

    const isHLS = url.includes('.m3u8');

    // For non-HLS URLs, try HEAD first (faster, no body download)
    if (!isHLS) {
      try {
        const headResponse = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
          },
        });
        clearTimeout(timeout);
        return headResponse.ok || headResponse.status === 206;
      } catch {
        // HEAD failed, fall through to GET
        clearTimeout(timeout);
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), CHECK_TIMEOUT);
        try {
          const getResponse = await fetch(url, {
            method: 'GET',
            signal: controller2.signal,
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': '*/*',
            },
          });
          clearTimeout(timeout2);
          return getResponse.ok || getResponse.status === 206;
        } catch {
          clearTimeout(timeout2);
          return false;
        }
      }
    }

    // For HLS streams, we need to do a GET and check for valid response
    // HEAD requests often don't work with streaming servers
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
    });

    clearTimeout(timeout);

    // If we get a 2xx or 3xx response, the stream is accessible
    // We also accept 200, 206 (partial content - common for streams)
    if (response.ok || response.status === 206) {
      // For HLS manifests, check if it starts with valid content
      if (url.includes('.m3u8')) {
        const contentType = response.headers.get('content-type') || '';
        if (
          contentType.includes('mpegurl') ||
          contentType.includes('mpegURL') ||
          contentType.includes('application/vnd.apple') ||
          contentType.includes('video/') ||
          contentType.includes('audio/') ||
          contentType.includes('octet-stream')
        ) {
          return true;
        }
        // If content-type is not informative, try reading a small chunk
        try {
          const reader = response.body?.getReader();
          if (reader) {
            const { value } = await reader.read();
            if (value) {
              const text = new TextDecoder().decode(value);
              // Valid HLS manifest starts with #EXTM3U
              if (text.includes('#EXTM3U') || text.includes('#EXTINF') || text.includes('#EXT-X')) {
                return true;
              }
              // If it starts with binary or has reasonable content, consider it working
              if (text.length > 0 && !text.includes('<html') && !text.includes('<!DOCTYPE')) {
                return true;
              }
            }
          }
        } catch {
          // If we can't read body but got 200, it's likely working
          return true;
        }
      }
      // Non-m3u8 URLs (mp4, etc.)
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// Process URLs in parallel with concurrency limit
async function checkBatch(urls: string[]): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  const pending: { url: string; promise: Promise<void> }[] = [];

  for (const url of urls) {
    // Check cache first
    const cached = verifyCache[url];
    if (cached && Date.now() - cached.timestamp < VERIFY_CACHE_TTL) {
      results[url] = cached.working;
      continue;
    }

    const promise = checkStream(url).then(working => {
      results[url] = working;
      verifyCache[url] = { working, timestamp: Date.now() };
    });

    pending.push({ url, promise });

    // Limit concurrency
    if (pending.length >= CONCURRENCY) {
      await Promise.race(pending.map(p => p.promise));
      // Remove completed promises
      for (let i = pending.length - 1; i >= 0; i--) {
        // Check if this promise's result is already in results
        if (results[pending[i].url] !== undefined) {
          pending.splice(i, 1);
        }
      }
    }
  }

  // Wait for all remaining
  await Promise.all(pending.map(p => p.promise));

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as VerifyRequest;
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere una lista de URLs',
        results: {},
        total: 0,
        working: 0,
      });
    }

    // Limit to 300 URLs per request to prevent timeouts
    const urlsToCheck = urls.slice(0, 300);
    const results = await checkBatch(urlsToCheck);

    const workingUrls = Object.entries(results)
      .filter(([, v]) => v)
      .map(([k]) => k);

    return NextResponse.json({
      success: true,
      results,
      working: workingUrls,
      total: urlsToCheck.length,
      workingCount: workingUrls.length,
    });
  } catch (error) {
    console.error('Verify API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error verificando canales',
      results: {},
      total: 0,
      working: 0,
    });
  }
}

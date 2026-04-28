// ═══════════════════════════════════════════════════════════════════════
// XuperStream - IPTV Proxy API Route
// Proxy para fetch de playlists M3U y HEAD checks de streams
// Evita problemas de CORS en el navegador
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';

// Allowed domains for security (prevent SSRF)
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  const method = searchParams.get('method'); // 'head' for health checks

  if (!targetUrl) {
    return NextResponse.json({ error: 'Se requiere el parámetro "url"' }, { status: 400 });
  }

  // Validate URL protocol
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
    return NextResponse.json(
      { error: 'Solo se permiten protocolos HTTP y HTTPS' },
      { status: 400 }
    );
  }

  // Block private/internal IPs (basic SSRF protection)
  const hostname = parsedUrl.hostname;
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('172.') ||
    hostname === '::1'
  ) {
    return NextResponse.json(
      { error: 'No se permite acceder a direcciones privadas' },
      { status: 403 }
    );
  }

  try {
    const fetchOptions: RequestInit = {
      headers: {
        'User-Agent': 'XuperStream/1.0 IPTV-Proxy',
        Accept: '*/*',
      },
      signal: AbortSignal.timeout(10000),
    };

    if (method === 'head') {
      // HEAD request for health checking
      const response = await fetch(targetUrl, {
        ...fetchOptions,
        method: 'HEAD',
      });

      return NextResponse.json(
        {
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
        },
        {
          status: 200,
        }
      );
    }

    // Full GET request (for M3U playlist fetching)
    const response = await fetch(targetUrl, fetchOptions);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Error del servidor remoto: ${response.status}`,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();

    // Check if it's an M3U playlist or a media stream
    if (body.includes('#EXTM3U') || body.includes('#EXTINF') || contentType.includes('mpegurl') || contentType.includes('audio/x-mpegurl')) {
      // Return as M3U playlist text
      return new NextResponse(body, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'public, max-age=300', // Cache for 5 min
        },
      });
    }

    // For other content, return as-is
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al acceder al stream';

    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}

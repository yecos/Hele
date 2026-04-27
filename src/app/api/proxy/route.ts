import { NextRequest, NextResponse } from 'next/server';

// Allowed streaming domains for the proxy
const ALLOWED_DOMAINS = [
  'vidsrc.to', 'vidsrc.cc', 'vidsrc.xyz', 'vidsrc.rip',
  'embed.su', '2embed.cc', 'multiembed.mov',
  'moviesapi.club', 'smashystream.com', 'vidsrc.icu',
  'vidsrc.pl', 'autoembed.cc', 'playtube.ws',
];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const parsedUrl = new URL(decodedUrl);

    // Verify domain is allowed
    const isAllowed = ALLOWED_DOMAINS.some(d =>
      parsedUrl.hostname === d || parsedUrl.hostname.endsWith('.' + d)
    );
    if (!isAllowed) {
      return NextResponse.json({ error: 'Dominio no permitido' }, { status: 403 });
    }

    // Fetch the embed page from the server (no browser origin headers)
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        'Referer': decodedUrl,
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `El servidor respondió con ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'text/html';
    const body = await response.text();

    // For HTML: inject <base> tag so relative URLs resolve correctly
    let modifiedBody = body;
    if (contentType.includes('text/html')) {
      modifiedBody = body.replace(
        /<head([^>]*)>/i,
        `<head$1><base href="${parsedUrl.origin}/">`
      );

      // Add meta referrer policy
      modifiedBody = modifiedBody.replace(
        /<head([^>]*)>/i,
        `<head$1><meta name="referrer" content="no-referrer">`
      );
    }

    return new Response(modifiedBody, {
      status: 200,
      headers: {
        'Content-Type': contentType.includes('charset')
          ? contentType
          : `${contentType}; charset=utf-8`,
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy':
          "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; frame-src *; frame-ancestors *; img-src * data: blob:; media-src * blob:; connect-src *; style-src * 'unsafe-inline'; script-src * 'unsafe-inline' 'unsafe-eval';",
        'Referrer-Policy': 'no-referrer',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Error en el proxy', details: String(error) },
      { status: 500 }
    );
  }
}

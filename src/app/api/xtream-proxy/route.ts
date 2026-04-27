import { NextRequest, NextResponse } from 'next/server';

// Proxy for Xtream Codes API calls to avoid CORS issues
// The IPTV server may not have CORS headers, so we proxy through our server

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiUrl = searchParams.get('url');

  if (!apiUrl) {
    return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
  }

  // Validate URL format (only allow Xtream Codes compatible endpoints)
  try {
    const parsedUrl = new URL(apiUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Solo HTTP/HTTPS permitido' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'XuperStream/1.0',
        'Accept': 'application/json, */*',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Servidor respondió con ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/json';
    const body = await response.text();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Xtream proxy error:', error);
    return NextResponse.json(
      { error: 'Error al conectar con el servidor IPTV' },
      { status: 502 }
    );
  }
}

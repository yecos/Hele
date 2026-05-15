import { NextRequest, NextResponse } from 'next/server';

// Proxy TMDB API calls from the backend (API key is hidden)
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';

// Allowed TMDB API endpoint prefixes (SSRF prevention)
const ALLOWED_ENDPOINT_PREFIXES = [
  '/movie/',
  '/tv/',
  '/trending/',
  '/search/',
  '/discover/',
  '/genre/',
  '/configuration/',
  '/certification/',
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const endpoint = searchParams.get('endpoint');
  if (!endpoint) return NextResponse.json({ success: false, error: 'Missing endpoint' }, { status: 400 });

  // SSRF protection: validate endpoint parameter with whitelist
  if (!endpoint.startsWith('/') || endpoint.includes('..')) {
    return NextResponse.json({ success: false, error: 'Invalid endpoint format' }, { status: 400 });
  }

  // Only allow specific TMDB API endpoints
  const isAllowed = ALLOWED_ENDPOINT_PREFIXES.some(prefix => endpoint.startsWith(prefix));
  if (!isAllowed) {
    return NextResponse.json({ success: false, error: 'Endpoint not allowed' }, { status: 400 });
  }

  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'es-ES');

  // Forward all other params (excluding internal ones)
  searchParams.forEach((v, k) => {
    if (k !== 'endpoint' && k !== 'api_key') url.searchParams.set(k, v);
  });

  try {
    const res = await fetch(url.toString(), {
      headers: { 'Accept-Encoding': 'gzip' },
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

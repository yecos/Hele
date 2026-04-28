import { NextRequest, NextResponse } from 'next/server';

// Proxy TMDB API calls from the backend (API key is hidden)
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || '2dca580c2a14b55200e784d157207b4d';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const endpoint = searchParams.get('endpoint');
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });

  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'es-ES');

  // Forward all other params
  searchParams.forEach((v, k) => {
    if (k !== 'endpoint') url.searchParams.set(k, v);
  });

  try {
    const res = await fetch(url.toString(), {
      headers: { 'Accept-Encoding': 'gzip' },
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

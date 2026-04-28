import { NextRequest, NextResponse } from 'next/server';

// Busca películas en pelisjuanita.com usando su API interna y devuelve el slug

const BASE = 'https://pelisjuanita.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface PJSearchResult {
  slug: string;
  title: string;
  year: string;
  posterUrl: string;
}

async function searchPelisjuanita(query: string): Promise<PJSearchResult[]> {
  const res = await fetch(`${BASE}/movies/movies.php?s=${encodeURIComponent(query)}`, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html',
      'Referer': `${BASE}/movies/`,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];

  const html = await res.text();
  const results: PJSearchResult[] = [];

  // Parse grid items: <a href='/movies/pelicula/slug'>
  const regex = /href=['"]\/movies\/pelicula\/([^'"]+)['"][^>]*>.*?<img[^>]+src=['"]([^'"]+)['"][^>]+alt=['"]([^'"]+)['"]/gs;
  let match;

  while ((match = regex.exec(html)) !== null) {
    results.push({
      slug: match[1],
      title: match[3],
      posterUrl: match[2],
      year: '',
    });
  }

  return results;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    const results = await searchPelisjuanita(query);
    return NextResponse.json({ query, results });
  } catch (err) {
    console.error('Pelisjuanita search error:', err);
    return NextResponse.json({ query, results: [], error: String(err) }, { status: 500 });
  }
}

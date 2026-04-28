import { NextRequest, NextResponse } from 'next/server';

// Scrapes pelisjuanita.com to get server embed URLs for a given content

interface PJSource {
  id: string;
  name: string;
  server: string;
  url: string;
  lang: string;
  quality: string;
  type: string;
}

interface PJResponse {
  tmdbId: string;
  sources: PJSource[];
  error?: string;
}

const BASE = 'https://pelisjuanita.com';

function parseSources(html: string): PJSource[] {
  const sources: PJSource[] = [];
  const regex = /class=['"]row-download['"][^>]*?data-idioma=['"]([^'"]+)['"][^>]*?data-tipo=['"]([^'"]+)['"][^>]*?(?:data-url=['"]([^'"]*?)['"]|onclick=['"]cargarServior\(['"]([^'"]*?)['"]\))/g;
  let match;
  let idx = 0;

  while ((match = regex.exec(html)) !== null) {
    const lang = match[1];
    const tipo = match[2];
    const url = match[3] || match[4];
    if (!url) continue;

    const chunk = html.substring(match.index, match.index + 600);
    const spans = chunk.match(/<span[^>]*>([\s\S]*?)<\/span>/g);
    let serverName = 'Servidor';
    let quality = 'HD';
    if (spans && spans.length >= 2) {
      serverName = spans[0].replace(/<[^>]+>/g, '').trim();
      const q = spans[1].replace(/<[^>]+>/g, '').trim();
      if (q && q.length <= 5) quality = q;
    }

    sources.push({
      id: `pj-${idx++}`,
      name: serverName,
      server: serverName.toLowerCase().replace(/\s+/g, '-'),
      url,
      lang,
      quality,
      type: tipo,
    });
  }
  return sources;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Referer': `${BASE}/`,
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get('slug');
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
  }

  try {
    let url: string;
    if (season && episode) {
      url = `${BASE}/series/serieInfo.php?nombreSerie=${encodeURIComponent(slug)}&nroTemporada=${season}&nroEpisodio=${episode}`;
    } else {
      url = `${BASE}/movies/ver-pelicula/${encodeURIComponent(slug)}`;
    }

    const html = await fetchHtml(url);
    const tmdbMatch = html.match(/name=["']tmdb-id["']\s+content=["'](\d+)["']/);
    const tmdbId = tmdbMatch ? tmdbMatch[1] : '';
    const sources = parseSources(html);

    return NextResponse.json({ tmdbId, sources });
  } catch (err) {
    console.error('Pelisjuanita scraper error:', err);
    return NextResponse.json({ tmdbId: '', sources: [], error: String(err) }, { status: 500 });
  }
}

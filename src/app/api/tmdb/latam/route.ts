import { NextResponse } from 'next/server';
import {
  getLatamMovies,
  getLatamTV,
  getSpanishTopRated,
  getSpanishTVTopRated,
  getNowPlayingLatam,
  getLatinGenreMovies,
  getLatinGenreTV,
  mapTmdbToMovie,
  isTmdbConfigured,
} from '@/lib/tmdb';

export async function GET(request: Request) {
  try {
    if (!isTmdbConfigured()) {
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const section = searchParams.get('section') || 'popular';
    const genre = searchParams.get('genre') || undefined;
    const page = parseInt(searchParams.get('page') || '1');

    let results: ReturnType<typeof mapTmdbToMovie>[] = [];

    if (type === 'movie' || type === 'all') {
      switch (section) {
        case 'popular': {
          const data = genre
            ? await getLatinGenreMovies(genre, page)
            : await getLatamMovies(page);
          results.push(...data.results.map(mapTmdbToMovie));
          break;
        }
        case 'top_rated': {
          const data = await getSpanishTopRated(page);
          results.push(...data.results.map(mapTmdbToMovie));
          break;
        }
        case 'now_playing': {
          const data = await getNowPlayingLatam(page);
          results.push(...data.results.map(mapTmdbToMovie));
          break;
        }
      }
    }

    if (type === 'tv' || type === 'all') {
      switch (section) {
        case 'popular': {
          const data = genre
            ? await getLatinGenreTV(genre, page)
            : await getLatamTV(page);
          results.push(...data.results.map(mapTmdbToMovie));
          break;
        }
        case 'top_rated': {
          const data = await getSpanishTVTopRated(page);
          results.push(...data.results.map(mapTmdbToMovie));
          break;
        }
      }
    }

    return NextResponse.json({
      results,
      page,
      total_results: results.length,
    });
  } catch (error) {
    console.error('TMDB LATAM error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch LATAM content' },
      { status: 500 }
    );
  }
}

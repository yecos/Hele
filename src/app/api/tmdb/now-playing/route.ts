import { NextResponse } from 'next/server';
import {
  getNowPlayingMovies,
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
    const page = parseInt(searchParams.get('page') || '1');

    const data = await getNowPlayingMovies(page);
    const movies = data.results.map(mapTmdbToMovie);

    return NextResponse.json({
      results: movies,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
    });
  } catch (error) {
    console.error('TMDB now-playing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch now playing' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import {
  getPopularMovies,
  getPopularTV,
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
    const type = searchParams.get('type') || 'movie';
    const page = parseInt(searchParams.get('page') || '1');

    let movies;
    if (type === 'tv') {
      const data = await getPopularTV(page);
      movies = data.results.map(mapTmdbToMovie);
      return NextResponse.json({
        results: movies,
        page: data.page,
        total_pages: data.total_pages,
        total_results: data.total_results,
      });
    } else {
      const data = await getPopularMovies(page);
      movies = data.results.map(mapTmdbToMovie);
      return NextResponse.json({
        results: movies,
        page: data.page,
        total_pages: data.total_pages,
        total_results: data.total_results,
      });
    }
  } catch (error) {
    console.error('TMDB popular error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch popular' },
      { status: 500 }
    );
  }
}

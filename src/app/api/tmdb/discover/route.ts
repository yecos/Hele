import { NextResponse } from 'next/server';
import {
  discoverMovies,
  discoverTV,
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
    const genre = searchParams.get('genre') || undefined;
    const yearStr = searchParams.get('year');
    const year = yearStr ? parseInt(yearStr) : undefined;
    const sort_by = searchParams.get('sort_by') || undefined;
    const page = parseInt(searchParams.get('page') || '1');

    if (type === 'tv') {
      const data = await discoverTV({ genre, sort_by, page });
      const movies = data.results.map(mapTmdbToMovie);
      return NextResponse.json({
        results: movies,
        page: data.page,
        total_pages: data.total_pages,
        total_results: data.total_results,
      });
    } else {
      const data = await discoverMovies({ genre, year, sort_by, page });
      const movies = data.results.map(mapTmdbToMovie);
      return NextResponse.json({
        results: movies,
        page: data.page,
        total_pages: data.total_pages,
        total_results: data.total_results,
      });
    }
  } catch (error) {
    console.error('TMDB discover error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to discover' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import {
  getTrending,
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
    const type = (searchParams.get('type') as 'movie' | 'tv' | 'all') || 'all';
    const time = (searchParams.get('time') as 'day' | 'week') || 'week';
    const page = parseInt(searchParams.get('page') || '1');

    const data = await getTrending(type, time, page);
    const movies = data.results
      .filter((item) => item.media_type !== 'person')
      .map(mapTmdbToMovie);

    return NextResponse.json({
      results: movies,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
    });
  } catch (error) {
    console.error('TMDB trending error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch trending' },
      { status: 500 }
    );
  }
}

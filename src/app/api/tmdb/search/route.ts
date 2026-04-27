import { NextResponse } from 'next/server';
import {
  searchMulti,
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
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');

    if (!q.trim()) {
      return NextResponse.json({ results: [], page: 1, total_pages: 0, total_results: 0 });
    }

    const data = await searchMulti(q, page);
    const movies = data.results
      .filter((item) => {
        const mediaType = (item as { media_type?: string }).media_type;
        return mediaType === 'movie' || mediaType === 'tv';
      })
      .map(mapTmdbToMovie);

    return NextResponse.json({
      results: movies,
      page: data.page,
      total_pages: data.total_pages,
      total_results: data.total_results,
    });
  } catch (error) {
    console.error('TMDB search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import {
  getMovieGenres,
  getTVGenres,
  isTmdbConfigured,
} from '@/lib/tmdb';

export async function GET() {
  try {
    if (!isTmdbConfigured()) {
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 503 }
      );
    }

    const [movieGenres, tvGenres] = await Promise.all([
      getMovieGenres(),
      getTVGenres(),
    ]);

    return NextResponse.json({
      movie_genres: movieGenres.genres,
      tv_genres: tvGenres.genres,
    });
  } catch (error) {
    console.error('TMDB genres error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch genres' },
      { status: 500 }
    );
  }
}

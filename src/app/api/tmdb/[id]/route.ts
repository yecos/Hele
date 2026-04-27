import { NextResponse } from 'next/server';
import {
  getMovieDetails,
  getTVDetails,
  getMovieVideos,
  getSimilarMovies,
  getSimilarTV,
  mapTmdbToMovie,
  isTmdbConfigured,
} from '@/lib/tmdb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isTmdbConfigured()) {
      return NextResponse.json(
        { error: 'TMDB API key not configured' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'movie';
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }

    // Fetch details, videos, and similar in parallel
    const promises: Promise<unknown>[] = [];
    if (type === 'tv') {
      promises.push(getTVDetails(itemId));
      promises.push(getSimilarTV(itemId));
    } else {
      promises.push(getMovieDetails(itemId));
      promises.push(getSimilarMovies(itemId));
      promises.push(getMovieVideos(itemId));
    }

    const results = await Promise.all(promises);

    const details = results[0] as Record<string, unknown>;
    const similar = results[1] as { results: unknown[] };

    // Build genre string
    const genres = (details.genres as { name: string }[] || []).map(
      (g) => g.name
    );
    const genreStr = genres.join(', ');

    // Build duration string
    let durationStr = '';
    if (type === 'movie') {
      const runtime = details.runtime as number | undefined;
      if (runtime) {
        const hours = Math.floor(runtime / 60);
        const mins = runtime % 60;
        durationStr = `${hours}h ${mins}min`;
      }
    } else {
      const seasons = details.number_of_seasons as number | undefined;
      const episodes = details.number_of_episodes as number | undefined;
      if (seasons && episodes) {
        durationStr = `${seasons} Temporadas · ${episodes} Episodios`;
      }
    }

    // Get trailer video
    let trailerUrl: string | null = null;
    if (type === 'movie' && results[2]) {
      const videos = results[2] as { results: { key: string; site: string; type: string }[] };
      const trailer = videos.results?.find(
        (v) => v.site === 'YouTube' && v.type === 'Trailer'
      );
      if (trailer) {
        trailerUrl = `https://www.youtube.com/embed/${trailer.key}`;
      }
    }

    // Map similar items
    const similarMovies = (similar.results || []).map(mapTmdbToMovie);

    // Map the main item
    const movie = mapTmdbToMovie(details as never);

    return NextResponse.json({
      ...movie,
      description: (details.overview as string) || movie.description,
      genre: genreStr,
      duration: durationStr || movie.duration,
      videoUrl: trailerUrl || movie.videoUrl,
      tagline: (details.tagline as string) || '',
      similar: similarMovies,
    });
  } catch (error) {
    console.error('TMDB details error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch details' },
      { status: 500 }
    );
  }
}

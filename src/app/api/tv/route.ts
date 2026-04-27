import { NextRequest, NextResponse } from 'next/server';
import { getTVDetails, getSeasonDetails, isTmdbConfigured } from '@/lib/tmdb';

interface SeasonDetail {
  season_number: number;
  name: string;
  air_date: string;
  episode_count: number;
  overview: string;
  poster_path: string | null;
  episodes: {
    episode_number: number;
    name: string;
    overview: string;
    still_path: string | null;
    air_date: string;
    runtime: number;
    vote_average: number;
  }[];
}

async function getSeasonDetailsFromApi(
  tvId: number,
  seasonNumber: number
): Promise<SeasonDetail> {
  const res = await fetch(
    `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=${process.env.TMDB_API_KEY}&language=es-ES`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status}`);
  }
  return res.json();
}

export async function GET(request: NextRequest) {
  if (!isTmdbConfigured()) {
    return NextResponse.json(
      { error: 'TMDB_API_KEY no configurada' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const season = searchParams.get('season');

  if (!id) {
    return NextResponse.json(
      { error: 'ID de serie requerido' },
      { status: 400 }
    );
  }

  try {
    const tvId = parseInt(id);

    if (season) {
      // Get specific season details with episodes
      const seasonNumber = parseInt(season);
      const seasonData = await getSeasonDetailsFromApi(tvId, seasonNumber);

      return NextResponse.json({
        season: {
          season_number: seasonData.season_number,
          name: seasonData.name,
          air_date: seasonData.air_date,
          episode_count: seasonData.episode_count,
          overview: seasonData.overview,
          poster_path: seasonData.poster_path,
        },
        episodes: seasonData.episodes.map((ep) => ({
          episode_number: ep.episode_number,
          name: ep.name,
          overview: ep.overview,
          still_path: ep.still_path,
          air_date: ep.air_date,
          runtime: ep.runtime || 0,
          vote_average: ep.vote_average,
        })),
      });
    }

    // Get TV show overview with all seasons
    const details = await getTVDetails(tvId);

    // Get episodes for season 1 by default
    let episodes: SeasonDetail['episodes'] = [];
    try {
      const season1Data = await getSeasonDetailsFromApi(tvId, 1);
      episodes = season1Data.episodes.map((ep) => ({
        episode_number: ep.episode_number,
        name: ep.name,
        overview: ep.overview,
        still_path: ep.still_path,
        air_date: ep.air_date,
        runtime: ep.runtime || 0,
        vote_average: ep.vote_average,
      }));
    } catch {
      // Season 1 might not exist
    }

    const seasons = (details.seasons || [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        season_number: s.season_number,
        name: s.name,
        episode_count: s.episode_count || 0,
        air_date: s.air_date || '',
        overview: s.overview || '',
        poster_path: s.poster_path,
      }));

    return NextResponse.json({
      tvShow: {
        id: details.id,
        name: details.name,
        overview: details.overview,
        backdrop_path: details.backdrop_path,
        poster_path: details.poster_path,
        vote_average: details.vote_average,
        first_air_date: details.first_air_date,
        number_of_seasons: details.number_of_seasons,
        number_of_episodes: details.number_of_episodes,
        status: details.status,
        genres: details.genres,
        created_by: details.created_by,
        networks: details.networks,
        tagline: details.tagline,
        episode_run_time: details.episode_run_time,
      },
      seasons,
      currentSeasonEpisodes: episodes,
    });
  } catch (error) {
    console.error('Error fetching TV details:', error);
    return NextResponse.json(
      { error: 'Error al obtener detalles de la serie' },
      { status: 500 }
    );
  }
}

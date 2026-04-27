import { NextRequest, NextResponse } from 'next/server';
import { getMovieSources, getTVSources, type VideoSourceGroup } from '@/lib/sources';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type'); // 'movie' or 'tv'
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');

  if (!id || !type) {
    return NextResponse.json(
      { error: 'ID y tipo requeridos' },
      { status: 400 }
    );
  }

  const tmdbId = parseInt(id);
  if (isNaN(tmdbId)) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400 }
    );
  }

  try {
    let sources: VideoSourceGroup[];

    if (type === 'tv') {
      sources = getTVSources(tmdbId, parseInt(season || '1'), parseInt(episode || '1'));
    } else {
      sources = getMovieSources(tmdbId);
    }

    return NextResponse.json({ sources, tmdbId, type });
  } catch (error) {
    console.error('Error getting sources:', error);
    return NextResponse.json(
      { error: 'Error al obtener fuentes de video' },
      { status: 500 }
    );
  }
}

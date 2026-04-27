import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const genres = await db.movie.findMany({
      distinct: ['genre'],
      select: { genre: true },
    });

    const categories = [
      { id: 'peliculas', name: 'Películas', icon: 'Film' },
      { id: 'series', name: 'Series', icon: 'Tv' },
      { id: 'deportes', name: 'Deportes', icon: 'Trophy' },
      { id: 'tv', name: 'TV en Vivo', icon: 'Radio' },
    ];

    return NextResponse.json({
      genres: genres.map((g) => g.genre),
      categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

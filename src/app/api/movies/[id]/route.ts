import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const movie = await db.movie.findUnique({
      where: { id },
    });

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    const related = await db.movie.findMany({
      where: {
        category: movie.category,
        id: { not: movie.id },
      },
      take: 6,
    });

    return NextResponse.json({ movie, related });
  } catch (error) {
    console.error('Error fetching movie:', error);
    return NextResponse.json({ error: 'Failed to fetch movie' }, { status: 500 });
  }
}

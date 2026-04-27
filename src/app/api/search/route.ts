import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!q.trim()) {
      return NextResponse.json({ results: [], query: q });
    }

    const movies = await db.movie.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { genre: { contains: q } },
        ],
      },
      take: limit,
    });

    return NextResponse.json({ results: movies, query: q });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

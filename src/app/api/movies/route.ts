import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const genre = searchParams.get('genre') || 'all';
    const featured = searchParams.get('featured');
    const trending = searchParams.get('trending');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const where: Prisma.MovieWhereInput = {};

    if (category !== 'all') {
      where.category = category;
    }
    if (genre !== 'all') {
      where.genre = genre;
    }
    if (featured === 'true') {
      where.featured = true;
    }
    if (trending === 'true') {
      where.trending = true;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { genre: { contains: search } },
      ];
    }

    const [movies, total] = await Promise.all([
      db.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.movie.count({ where }),
    ]);

    return NextResponse.json({
      movies,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
  }
}

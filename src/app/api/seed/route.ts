import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { movies } from '@/lib/seed-data';

export async function POST() {
  try {
    // Clean up existing data
    await db.favorite.deleteMany();
    await db.movie.deleteMany();
    await db.user.deleteMany();

    // Create demo user
    const demoUser = await db.user.create({
      data: {
        email: 'demo@xuperstream.com',
        name: 'Usuario Demo',
        password: 'demo123',
        plan: 'vip',
      },
    });

    // Create movies
    for (const movie of movies) {
      await db.movie.create({ data: movie });
    }

    // Add some favorites for the demo user
    const firstMovies = await db.movie.findMany({ take: 5 });
    for (const movie of firstMovies) {
      await db.favorite.create({
        data: { userId: demoUser.id, movieId: movie.id },
      });
    }

    return NextResponse.json({
      success: true,
      moviesCount: movies.length,
      userId: demoUser.id,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { movies } from '@/lib/seed-data';

export async function POST() {
  try {
    // Simple cleanup - only use core models
    await db.favorite.deleteMany();
    await db.movie.deleteMany();
    await db.user.deleteMany();

    // Create demo user
    const demoUser = await db.user.create({
      data: {
        email: 'demo@xuperstream.com',
        name: 'Usuario Demo',
        passwordHash: 'seed:demo123',
        plan: 'vip',
        role: 'user',
      },
    });

    // Create admin user
    const adminUser = await db.user.create({
      data: {
        email: 'admin@xuperstream.com',
        name: 'Administrador',
        passwordHash: 'seed:admin123',
        plan: 'vip',
        role: 'admin',
      },
    });

    // Create movies
    for (const movie of movies) {
      await db.movie.create({ data: movie });
    }

    // Add some favorites
    const firstMovies = await db.movie.findMany({ take: 5 });
    for (const movie of firstMovies) {
      await db.favorite.create({
        data: { userId: demoUser.id, movieId: movie.id },
      });
    }

    // Add watch history
    const historyMovies = await db.movie.findMany({ take: 8 });
    for (let i = 0; i < historyMovies.length; i++) {
      await db.watchHistory.create({
        data: {
          userId: demoUser.id,
          movieId: historyMovies[i].id,
          progress: [72, 45, 100, 30, 15, 60, 88, 50][i] || 50,
        },
      });
    }

    return NextResponse.json({
      success: true,
      moviesCount: movies.length,
      demoUserId: demoUser.id,
      adminUserId: adminUser.id,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}

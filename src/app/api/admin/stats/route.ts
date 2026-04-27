import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
    }

    const [totalUsers, totalMovies, totalFavorites, totalHistory, recentUsers] =
      await Promise.all([
        db.user.count(),
        db.movie.count(),
        db.favorite.count(),
        db.watchHistory.count(),
        db.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      ]);

    const categoryStats = await db.movie.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    const genreStats = await db.movie.groupBy({
      by: ['genre'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    });

    const planStats = await db.user.groupBy({
      by: ['plan'],
      _count: { id: true },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalMovies,
        totalFavorites,
        totalHistory,
      },
      categoryStats,
      genreStats,
      planStats,
      recentUsers,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}

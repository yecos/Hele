import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const history = await db.watchHistory.findMany({
      where: { userId: payload.id },
      include: { movie: true },
      orderBy: { watchedAt: 'desc' },
    });

    return NextResponse.json({
      history: history.map((h) => ({
        id: h.id,
        movieId: h.movieId,
        progress: h.progress,
        watchedAt: h.watchedAt,
        movie: h.movie,
      })),
    });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { movieId, progress } = await request.json();
    if (!movieId) return NextResponse.json({ error: 'movieId es obligatorio' }, { status: 400 });

    const existing = await db.watchHistory.findUnique({
      where: { userId_movieId: { userId: payload.id, movieId } },
    });

    if (existing) {
      const updated = await db.watchHistory.update({
        where: { id: existing.id },
        data: {
          progress: progress ?? existing.progress,
          watchedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, id: updated.id });
    }

    const created = await db.watchHistory.create({
      data: {
        userId: payload.id,
        movieId,
        progress: progress ?? 0,
      },
    });

    return NextResponse.json({ success: true, id: created.id });
  } catch (error) {
    console.error('History update error:', error);
    return NextResponse.json({ error: 'Error al guardar historial' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    await db.watchHistory.deleteMany({ where: { userId: payload.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('History clear error:', error);
    return NextResponse.json({ error: 'Error al borrar historial' }, { status: 500 });
  }
}

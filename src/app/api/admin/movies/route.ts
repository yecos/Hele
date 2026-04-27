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

    const movies = await db.movie.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ movies });
  } catch (error) {
    console.error('Admin movies fetch error:', error);
    return NextResponse.json({ error: 'Error al obtener películas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
    }

    const data = await request.json();
    const { title, description, posterUrl, backdropUrl, videoUrl, year, duration, rating, genre, category, isLive, featured, trending } = data;

    if (!title || !description || !posterUrl || !backdropUrl || !year || !duration || !genre || !category) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const movie = await db.movie.create({
      data: {
        title,
        description,
        posterUrl,
        backdropUrl,
        videoUrl: videoUrl || null,
        year: parseInt(year),
        duration,
        rating: parseFloat(rating) || 0,
        genre,
        category,
        isLive: isLive || false,
        featured: featured || false,
        trending: trending || false,
      },
    });

    return NextResponse.json({ movie });
  } catch (error) {
    console.error('Admin movie create error:', error);
    return NextResponse.json({ error: 'Error al crear película' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID es obligatorio' }, { status: 400 });

    await db.movie.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin movie delete error:', error);
    return NextResponse.json({ error: 'Error al eliminar película' }, { status: 500 });
  }
}

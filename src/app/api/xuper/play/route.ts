import { NextRequest, NextResponse } from 'next/server';
import { getXuperClient } from '@/lib/guardian/xuper-client';

/**
 * POST /api/xuper/play
 * Iniciar reproducción de un canal Xuper
 * 
 * Body: { channelId: string }
 * 
 * Retorna la URL del stream para el reproductor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId } = body;

    if (!channelId) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere channelId',
      }, { status: 400 });
    }

    const client = getXuperClient();

    if (!client.getStatus().isLoggedIn) {
      return NextResponse.json({
        success: false,
        error: 'No hay sesión activa. Haz login primero.',
      }, { status: 401 });
    }

    const stream = await client.startPlayLive(channelId);

    if (stream) {
      return NextResponse.json({
        success: true,
        url: stream.url,
        format: stream.format,
        token: stream.token,
      });
    }

    return NextResponse.json({
      success: false,
      error: 'No se pudo obtener el stream del canal',
    }, { status: 404 });
  } catch (error) {
    console.error('[Xuper API] Play error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error iniciando reproducción',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/xuper/play
 * Detener reproducción
 * 
 * Body: { channelId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId } = body;

    const client = getXuperClient();
    await client.stopPlay(channelId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Xuper API] Stop play error:', error);
    return NextResponse.json({ success: false, error: 'Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getXuperClient } from '@/lib/guardian/xuper-client';

/**
 * GET /api/xuper/channels
 * Obtener canales en vivo de Xuper TV
 * 
 * Query params:
 * - categoryId: Filtrar por categoría
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId') || undefined;

    const client = getXuperClient();

    if (!client.getStatus().isLoggedIn) {
      return NextResponse.json({
        success: false,
        error: 'No hay sesión activa. Haz login primero.',
        channels: [],
        total: 0,
      }, { status: 401 });
    }

    // Obtener categorías y canales
    const [categories, channels] = await Promise.all([
      client.getChannelCategories(),
      client.getLiveChannels(categoryId),
    ]);

    // Formatear canales para la UI
    const formattedChannels = channels.map(ch => ({
      id: `xuper-${ch.id}`,
      name: ch.name,
      logo: ch.logo,
      group: ch.group,
      url: '', // Se obtiene al reproducir
      source: 'xuper',
      xuperId: ch.id,
      epgCode: ch.epgCode,
      quality: ch.quality,
    }));

    return NextResponse.json({
      success: true,
      channels: formattedChannels,
      total: formattedChannels.length,
      categories,
      source: 'xuper',
    });
  } catch (error) {
    console.error('[Xuper API] Channels error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo canales',
      channels: [],
      total: 0,
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedChannels } from '@/lib/guardian/scanner';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/**
 * GET /api/guardian/channels
 * Devuelve los canales verificados por el Guardian
 *
 * Query params:
 * - format=m3u → Devuelve un archivo M3U descargable
 * - playlist=co → Filtra por playlist específico
 * - group=Deportes → Filtra por grupo
 * - limit=100 → Limita resultados
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const playlist = searchParams.get('playlist') || undefined;
    const group = searchParams.get('group') || undefined;
    const limit = parseInt(searchParams.get('limit') || '5000');

    const channels = await getVerifiedChannels({ playlist, group, limit });

    // Si piden formato M3U, devolver como archivo descargable
    if (format === 'm3u') {
      let m3u = '#EXTM3U\n';

      for (const ch of channels) {
        const logoAttr = ch.logo ? `tvg-logo="${ch.logo}"` : '';
        const groupAttr = ch.group ? `group-title="${ch.group}"` : '';
        const countryAttr = ch.country ? `tvg-country="${ch.country}"` : '';

        m3u += `#EXTINF:-1 ${countryAttr} ${logoAttr} ${groupAttr},${ch.name}\n`;
        m3u += `${ch.url}\n`;
      }

      return new NextResponse(m3u, {
        headers: {
          'Content-Type': 'audio/mpegurl',
          'Content-Disposition': 'attachment; filename="guardian-channels.m3u"',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Devolver como JSON
    return NextResponse.json({
      success: true,
      channels: channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        logo: ch.logo,
        group: ch.group,
        url: ch.url,
        country: ch.country,
        quality: ch.quality,
        playlist: ch.playlist,
      })),
      total: channels.length,
      playlist,
      group,
    });
  } catch (error) {
    console.error('[Guardian API] Error en channels:', error);
    return NextResponse.json({
      success: true,
      channels: [],
      total: 0,
    });
  }
}

/**
 * DELETE /api/guardian/channels
 * Limpia todos los canales verificados (útil para forzar re-escaneo)
 */
export async function DELETE() {
  try {
    await db.verifiedChannel.deleteMany({});
    return NextResponse.json({
      success: true,
      message: 'Canales verificados eliminados',
    });
  } catch (error) {
    console.error('[Guardian API] Error eliminando canales:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al eliminar canales',
    });
  }
}

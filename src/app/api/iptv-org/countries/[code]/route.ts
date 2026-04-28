import { NextResponse } from 'next/server';
import { getStreamsFromM3U, getEnrichedStreamsByCountry, getCountryChannelCounts } from '@/lib/iptv-org-cache';

// Cache por 1 hora
export const revalidate = 3600;

/**
 * GET /api/iptv-org/countries/[code]?category=news&search=xxx&limit=200
 *
 * Devuelve los canales disponibles para un pais especifico.
 * Incluye conteo por categoria y metadatos del pais.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    if (!/^[a-z]{2,3}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid country code. Use 2-3 lowercase letters.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '200');

    // Si no hay filtros avanzados, usar M3U (mas rapido)
    let streams;
    if (!category && !search) {
      streams = await getStreamsFromM3U(code);
    } else {
      streams = await getEnrichedStreamsByCountry(code, {
        category: category || undefined,
        search: search || undefined,
        limit,
      });
    }

    // Agrupar por categoria
    const categoryCounts: Record<string, number> = {};
    for (const s of streams) {
      for (const cat of s.categories) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    }

    // Conteo total de canales del pais (de la API, no solo del M3U)
    let totalChannelsInApi = 0;
    try {
      const counts = await getCountryChannelCounts();
      totalChannelsInApi = counts[code] || 0;
    } catch {
      totalChannelsInApi = streams.length;
    }

    return NextResponse.json({
      country: code.toUpperCase(),
      totalStreams: streams.length,
      totalChannelsInApi,
      categories: categoryCounts,
      streams: streams.slice(0, limit),
    });
  } catch (error) {
    console.error(`IPTV-Org country [${code}] error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch country data' },
      { status: 500 }
    );
  }
}

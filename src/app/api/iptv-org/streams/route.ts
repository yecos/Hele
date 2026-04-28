import { NextResponse } from 'next/server';
import { getStreamsFromM3U, getEnrichedStreamsByCountry } from '@/lib/iptv-org-cache';

// Cache por 1 hora
export const revalidate = 3600;

/**
 * GET /api/iptv-org/streams?country=co&category=news&search=caracol&limit=100&offset=0&source=m3u|api
 *
 * Obtiene streams de TV filtrados por pais, categoria y busqueda.
 *
 * source=m3u (default): Usa playlist M3U por pais (~24 KB). Mas rapido.
 * source=api: Usa streams.json + channels.json (~13 MB). Mas rico pero mas lento.
 *
 * La opcion M3U es la recomendada para la UI principal.
 * La opcion API se usa cuando se necesita buscar por texto o filtrar por categoria.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '200');
    const offset = parseInt(searchParams.get('offset') || '0');
    const source = searchParams.get('source') || 'm3u';

    if (!country) {
      return NextResponse.json(
        { error: 'Missing required parameter: country (e.g. "co", "mx", "ar")' },
        { status: 400 }
      );
    }

    if (!/^[a-z]{2,3}$/.test(country)) {
      return NextResponse.json(
        { error: 'Invalid country code. Use 2-3 lowercase letters.' },
        { status: 400 }
      );
    }

    // Estrategia M3U (rapida, ~24 KB por pais)
    // Solo sirve filtros basicos de pais
    if (source === 'm3u' && !category && !search) {
      const streams = await getStreamsFromM3U(country);
      const paginated = streams.slice(offset, offset + limit);

      // Agrupar por categorias para la UI
      const categoryCounts: Record<string, number> = {};
      for (const s of streams) {
        for (const cat of s.categories) {
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }
      }

      return NextResponse.json({
        success: true,
        source: 'm3u',
        stats: {
          totalAvailable: streams.length,
          returned: paginated.length,
          country: country.toUpperCase(),
          category: 'all',
          search: null,
          categories: categoryCounts,
        },
        streams: paginated,
      });
    }

    // Estrategia API (lenta pero con filtros avanzados)
    // Descarga streams.json (~3 MB) + channels.json (~10 MB) la primera vez
    const streams = await getEnrichedStreamsByCountry(country, {
      category: category || undefined,
      search: search || undefined,
      limit: limit + offset,
    });

    const paginated = streams.slice(offset, offset + limit);

    // Agrupar por categorias para la UI
    const categoryCounts: Record<string, number> = {};
    for (const s of streams) {
      for (const cat of s.categories) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    }

    return NextResponse.json({
      success: true,
      source: 'api',
      stats: {
        totalAvailable: streams.length,
        returned: paginated.length,
        country: country.toUpperCase(),
        category: category || 'all',
        search: search || null,
        categories: categoryCounts,
      },
      streams: paginated,
    });
  } catch (error) {
    console.error('IPTV-Org streams error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

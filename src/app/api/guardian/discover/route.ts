import { NextResponse } from 'next/server';
import { getDiscoveryStatus, getDiscoveryStats, getDiscoveredSources } from '@/lib/guardian/discovery';

/**
 * GET /api/guardian/discover
 * Estado del descubrimiento web + fuentes descubiertas
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const validOnly = searchParams.get('valid') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');

    const [status, stats, sources] = await Promise.all([
      getDiscoveryStatus(),
      getDiscoveryStats(),
      getDiscoveredSources({ validOnly, limit }),
    ]);

    return NextResponse.json({
      success: true,
      status,
      stats,
      sources,
    });
  } catch (error) {
    console.error('[Discovery API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener estado del descubrimiento',
    });
  }
}

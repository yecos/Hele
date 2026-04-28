import { NextResponse } from 'next/server';
import { validateChannelsBatch, getValidationStats } from '@/lib/channelValidator';
import { parseM3U } from '@/lib/m3uParser';
import type { M3UChannel } from '@/lib/m3uParser';

// Sin cache - cada request es una validacion en tiempo real

interface ValidateResponse {
  total: number;
  online: number;
  offline: number;
  stats: ReturnType<typeof getValidationStats>;
  results: {
    name: string;
    url: string;
    status: string;
    statusCode?: number;
    latency?: number;
  }[];
}

/**
 * GET /api/iptv-org/validate?urls=url1,url2,url3
 * GET /api/iptv-org/validate?country=co&limit=20
 *
 * Valida si los streams estan online o offline.
 * Usa el channelValidator existente (HEAD requests con proxy).
 *
 * Opcion 1: Pasar URLs directamente (max 20)
 * Opcion 2: Pasar un country code y se validan los primeros N canales del M3U
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const urls = searchParams.get('urls')?.split(',').filter(Boolean);
    const country = searchParams.get('country');
    const limit = parseInt(searchParams.get('limit') || '20');

    let channelsToValidate: M3UChannel[] = [];

    // Opcion 1: URLs directas
    if (urls && urls.length > 0) {
      if (urls.length > 20) {
        return NextResponse.json(
          { error: 'Maximum 20 URLs per request' },
          { status: 400 }
        );
      }
      channelsToValidate = urls.map((url, i) => ({
        id: `validate-${i}`,
        name: `Stream ${i + 1}`,
        url,
        logo: '',
        group: '',
        groupTitle: '',
        tvgId: '',
        tvgName: '',
        tvgLanguage: '',
        tvgCountry: '',
        isHD: false,
        isRadio: false,
        quality: '',
      }));
    }
    // Opcion 2: Validar canales de un pais
    else if (country) {
      const m3uUrl = `https://iptv-org.github.io/iptv/countries/${country}.m3u`;
      const res = await fetch(m3uUrl, { next: { revalidate: 3600 } });

      if (!res.ok) {
        return NextResponse.json(
          { error: `No playlist found for country "${country}"` },
          { status: 404 }
        );
      }

      const content = await res.text();
      const parseResult = parseM3U(content);
      channelsToValidate = parseResult.channels.slice(0, limit);
    }
    // Sin parametros
    else {
      return NextResponse.json(
        { error: 'Provide ?urls=url1,url2,... or ?country=co&limit=20' },
        { status: 400 }
      );
    }

    if (channelsToValidate.length === 0) {
      return NextResponse.json({
        total: 0,
        online: 0,
        offline: 0,
        stats: {
          total: 0,
          online: 0,
          offline: 0,
          timeouts: 0,
          errors: 0,
          successRate: '0',
          avgLatency: 0,
        },
        results: [],
      });
    }

    // Usar el validador existente con concurrencia controlada
    const results = await validateChannelsBatch(channelsToValidate, {
      concurrency: 6,
      timeout: 6000,
    });

    const stats = getValidationStats(results);
    const online = results.filter((r) => r.status === 'online').length;

    const response: ValidateResponse = {
      total: results.length,
      online,
      offline: results.length - online,
      stats,
      results: results.map((r) => ({
        name: r.channel.name,
        url: r.channel.url,
        status: r.status,
        statusCode: r.statusCode,
        latency: r.latency ? Math.round(r.latency) : undefined,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('IPTV-Org validate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Validation failed' },
      { status: 500 }
    );
  }
}

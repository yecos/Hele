import { NextResponse } from 'next/server';
import { parseM3U } from '@/lib/m3uParser';

// Revalidate cached responses every 1 hour
export const revalidate = 3600;

const IPTV_M3U_BASE = 'https://iptv-org.github.io/iptv';

interface PlaylistChannel {
  id: string;
  tvgId: string;
  tvgName: string;
  tvgLogo: string;
  groupTitle: string;
  name: string;
  url: string;
  country: string;
  quality: string;
  isHD: boolean;
}

/**
 * Convierte los canales del M3U parser al formato de playlist de la app.
 */
function toPlaylistChannels(channels: ReturnType<typeof parseM3U>['channels'], country: string): PlaylistChannel[] {
  return channels.map((ch, idx) => ({
    id: `${country}-${idx}`,
    tvgId: ch.tvgId,
    tvgName: ch.tvgName,
    tvgLogo: ch.logo,
    groupTitle: ch.groupTitle,
    name: ch.name,
    url: ch.url,
    country,
    quality: ch.quality,
    isHD: ch.isHD,
  }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');

    if (!country) {
      return NextResponse.json(
        { error: 'Missing required query parameter: country' },
        { status: 400 }
      );
    }

    // Validate country code (2-3 lowercase letters)
    if (!/^[a-z]{2,3}$/.test(country)) {
      return NextResponse.json(
        { error: 'Invalid country code. Use a 2 or 3 letter lowercase code (e.g. "co", "mx", "ar")' },
        { status: 400 }
      );
    }

    const m3uUrl = `https://iptv-org.github.io/iptv/countries/${country}.m3u`;

    const response = await fetch(m3uUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `No playlist found for country "${country}"`, country, available: false },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Failed to fetch playlist for country "${country}"`, status: response.status },
        { status: 502 }
      );
    }

    const content = await response.text();

    if (!content.includes('#EXTINF')) {
      return NextResponse.json(
        { error: `Empty or invalid playlist for country "${country}"` },
        { status: 200 }
      );
    }

    // Usar el parser M3U compartido (soporta todos los formatos)
    const parseResult = parseM3U(content);
    const playlistChannels = toPlaylistChannels(parseResult.channels, country);

    // Deduplicar por URL
    const seen = new Set<string>();
    const uniqueChannels = playlistChannels.filter((ch) => {
      if (seen.has(ch.url)) return false;
      seen.add(ch.url);
      return true;
    });

    // Contar por grupo
    const groups: Record<string, number> = {};
    for (const ch of uniqueChannels) {
      groups[ch.groupTitle] = (groups[ch.groupTitle] || 0) + 1;
    }

    return NextResponse.json({
      country,
      totalChannels: uniqueChannels.length,
      groups,
      channels: uniqueChannels,
      parseErrors: parseResult.errors,
      parseTime: Math.round(parseResult.parseTime),
    });
  } catch (error) {
    console.error('IPTV-Org playlist fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch playlist' },
      { status: 500 }
    );
  }
}

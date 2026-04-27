import { NextResponse } from 'next/server';

// Revalidate cached responses every 1 hour
export const revalidate = 3600;

interface M3UChannel {
  id: string;
  tvgId: string;
  tvgName: string;
  tvgLogo: string;
  groupTitle: string;
  name: string;
  url: string;
  country: string;
}

function parseM3U(content: string, country: string): M3UChannel[] {
  const channels: M3UChannel[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line.startsWith('#EXTINF:')) continue;

    // Parse attributes from the #EXTINF line
    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
    const groupTitleMatch = line.match(/group-title="([^"]*)"/);

    // Channel name is the text after the last comma
    const lastCommaIndex = line.lastIndexOf(',');
    const rawName = lastCommaIndex !== -1 ? line.substring(lastCommaIndex + 1).trim() : 'Unknown';

    // The next non-empty line should be the stream URL
    let url = '';
    for (let j = i + 1; j < lines.length; j++) {
      const nextLine = lines[j].trim();
      if (nextLine && !nextLine.startsWith('#')) {
        url = nextLine;
        break;
      }
    }

    if (!url) continue;

    const channel: M3UChannel = {
      id: `${country}-${channels.length}`,
      tvgId: tvgIdMatch?.[1] || '',
      tvgName: tvgNameMatch?.[1] || rawName,
      tvgLogo: tvgLogoMatch?.[1] || '',
      groupTitle: groupTitleMatch?.[1] || 'Uncategorized',
      name: rawName,
      url,
      country,
    };

    channels.push(channel);
  }

  return channels;
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

    const m3uUrl = `https://raw.githubusercontent.com/iptv-org/iptv/master/streams/${country}.m3u`;

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

    const channels = parseM3U(content, country);

    // Deduplicate channels by URL (same stream, different entries)
    const seen = new Set<string>();
    const uniqueChannels = channels.filter((ch) => {
      if (seen.has(ch.url)) return false;
      seen.add(ch.url);
      return true;
    });

    // Group channel counts
    const groups: Record<string, number> = {};
    for (const ch of uniqueChannels) {
      groups[ch.groupTitle] = (groups[ch.groupTitle] || 0) + 1;
    }

    return NextResponse.json({
      country,
      totalChannels: uniqueChannels.length,
      groups,
      channels: uniqueChannels,
    });
  } catch (error) {
    console.error('IPTV-Org playlist fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch playlist' },
      { status: 500 }
    );
  }
}

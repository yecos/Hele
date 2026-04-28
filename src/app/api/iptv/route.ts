import { NextRequest, NextResponse } from 'next/server';

// Cache parsed playlists
const cache: Record<string, { data: any[]; timestamp: number }> = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface IPTVChannel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  country: string;
  quality: string;
  status: string;
}

// Custom channels - these get prepended to Colombia playlist
const CUSTOM_CHANNELS_CO: IPTVChannel[] = [
  {
    id: 'ch-custom-winsports-hd',
    name: 'Win Sports HD',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Winsports.svg',
    group: 'Deportes',
    url: 'http://190.60.39.198:8000/play/a033/index.m3u8',
    country: 'CO',
    quality: 'HD',
    status: 'online',
  },
  {
    id: 'ch-custom-winsports-plus-hd',
    name: 'Win Sports+ HD',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Win_Sports%2B_logo.svg',
    group: 'Deportes',
    url: 'http://190.60.39.198:8000/play/a0b6/index.m3u8',
    country: 'CO',
    quality: 'HD',
    status: 'online',
  },
];

function parseM3U(content: string, countryCode: string): IPTVChannel[] {
  const lines = content.split('\n');
  const channels: IPTVChannel[] = [];
  let current: Partial<IPTVChannel> | null = null;
  let idCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF')) {
      current = {};

      // Parse tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      if (logoMatch) current.logo = logoMatch[1];

      // Parse tvg-id
      const idMatch = line.match(/tvg-id="([^"]*)"/);
      if (idMatch) {
        // Extract country from tvg-id like "CanalTRO.co@SD"
        const parts = idMatch[1].split('.');
        if (parts.length > 1) {
          current.country = parts[parts.length - 1].split('@')[0].toUpperCase();
        }
      }

      // Parse group-title
      const groupMatch = line.match(/group-title="([^"]*)"/);
      if (groupMatch) current.group = groupMatch[1];

      // Parse display name (after the last comma)
      const commaIdx = line.lastIndexOf(',');
      if (commaIdx !== -1) {
        current.name = line.substring(commaIdx + 1).trim();
      }
    } else if (line.startsWith('#EXTVLCOPT')) {
      // Skip VLC options
      continue;
    } else if (line && !line.startsWith('#') && current) {
      // This is the stream URL
      const url = line;

      // Determine status from name
      let status = 'online';
      if (current.name?.includes('[Offline]')) status = 'offline';
      else if (current.name?.includes('[Geo-blocked]')) status = 'geo-blocked';
      else if (current.name?.includes('[Not 24/7]')) status = 'partial';

      // Determine quality from name
      let quality = 'SD';
      if (current.name?.includes('(1080p)') || current.name?.includes('(4K)')) quality = 'HD';
      else if (current.name?.includes('(720p)')) quality = 'HD';
      else if (current.name?.includes('(540p)') || current.name?.includes('(480p)')) quality = 'SD';
      else if (current.name?.includes('(360p)')) quality = 'LD';

      // Clean name
      let cleanName = current.name || 'Unknown';
      cleanName = cleanName.replace(/\s*\[(Geo-blocked|Not 24\/7|Offline)\]\s*/g, '').trim();
      cleanName = cleanName.replace(/\s*\(\d{3,4}p\)\s*/g, '').trim();

      channels.push({
        id: `ch-${countryCode}-${idCounter++}`,
        name: cleanName,
        logo: current.logo || '',
        group: current.group || 'General',
        url: url,
        country: current.country || countryCode.toUpperCase(),
        quality,
        status,
      });

      current = null;
    }
  }

  return channels;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playlist = searchParams.get('playlist') || 'co'; // Default to Colombia

    const playlistUrls: Record<string, string> = {
      co: 'https://iptv-org.github.io/iptv/countries/co.m3u',
      mx: 'https://iptv-org.github.io/iptv/countries/mx.m3u',
      ar: 'https://iptv-org.github.io/iptv/countries/ar.m3u',
      es: 'https://iptv-org.github.io/iptv/countries/es.m3u',
      cl: 'https://iptv-org.github.io/iptv/countries/cl.m3u',
      ve: 'https://iptv-org.github.io/iptv/countries/ve.m3u',
      pe: 'https://iptv-org.github.io/iptv/countries/pe.m3u',
      spa: 'https://iptv-org.github.io/iptv/languages/spa.m3u',
      news: 'https://iptv-org.github.io/iptv/categories/news.m3u',
      sports: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
      music: 'https://iptv-org.github.io/iptv/categories/music.m3u',
    };

    // Support multiple playlists comma-separated
    const playlists = playlist.split(',').map(p => p.trim().toLowerCase());

    const allChannels: IPTVChannel[] = [];

    for (const pl of playlists) {
      const url = playlistUrls[pl];
      if (!url) continue;

      // Check cache
      const cached = cache[pl];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        allChannels.push(...cached.data);
        continue;
      }

      try {
        const res = await fetch(url, {
          next: { revalidate: 1800 }, // 30 min
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (!res.ok) continue;

        const content = await res.text();
        const channels = parseM3U(content, pl);

        // Cache
        cache[pl] = { data: channels, timestamp: Date.now() };
        allChannels.push(...channels);
      } catch (err) {
        console.error(`Error fetching playlist ${pl}:`, err);
      }
    }

    // Prepend custom channels for Colombia playlist
    if (playlists.includes('co')) {
      allChannels.unshift(...CUSTOM_CHANNELS_CO);
    }
    // Also add to Deportes and sports playlists
    if (playlists.includes('sports') || playlists.includes('spa')) {
      allChannels.unshift(...CUSTOM_CHANNELS_CO);
    }

    return NextResponse.json({
      success: true,
      channels: allChannels,
      total: allChannels.length,
      playlists: playlists,
    });
  } catch (error) {
    console.error('IPTV API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error loading channels',
      channels: [],
      total: 0,
    });
  }
}

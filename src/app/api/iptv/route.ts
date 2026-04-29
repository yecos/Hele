import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface IPTVChannel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  country: string;
  quality: string;
  status: string;
  verified?: boolean;
}

const cache: Record<string, { data: IPTVChannel[]; timestamp: number }> = {};
const CACHE_TTL = 30 * 60 * 1000;

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
  const seenNames = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF')) {
      current = {};

      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      if (logoMatch) current.logo = logoMatch[1];

      const idMatch = line.match(/tvg-id="([^"]*)"/);
      if (idMatch) {
        const parts = idMatch[1].split('.');
        if (parts.length > 1) {
          current.country = parts[parts.length - 1].split('@')[0].toUpperCase();
        }
      }

      const groupMatch = line.match(/group-title="([^"]*)"/);
      if (groupMatch) current.group = groupMatch[1];

      const commaIdx = line.lastIndexOf(',');
      if (commaIdx !== -1) {
        current.name = line.substring(commaIdx + 1).trim();
      }
    } else if (line.startsWith('#EXTVLCOPT')) {
      continue;
    } else if (line && !line.startsWith('#') && current) {
      const url = line;
      const rawName = current.name || 'Unknown';
      const isGeo = /\bGEO\b/i.test(rawName);

      let cleanName = rawName;
      cleanName = cleanName.replace(/\s*\bGEO\b\s*/gi, '').trim();
      cleanName = cleanName.replace(/\s*\[(Geo-blocked|Not 24\/7|Offline)\]\s*/g, '').trim();
      cleanName = cleanName.replace(/\s*\(\d{3,4}p\)\s*/g, '').trim();
      cleanName = cleanName.replace(/\s+[A-Z]{2}\s*$/, '').trim();

      let status = 'online';
      if (current.name?.includes('[Offline]')) status = 'offline';
      else if (current.name?.includes('[Geo-blocked]')) status = 'geo-blocked';
      else if (current.name?.includes('[Not 24/7]')) status = 'partial';

      let quality = 'SD';
      if (rawName.includes('(1080p)') || rawName.includes('(4K)')) quality = 'HD';
      else if (rawName.includes('(720p)')) quality = 'HD';
      else if (rawName.includes('(540p)') || rawName.includes('(480p)')) quality = 'SD';
      else if (rawName.includes('(360p)')) quality = 'LD';
      else if (/hd[\s/_.-]|high/i.test(url)) quality = 'HD';

      const existingIdx = seenNames.get(cleanName.toLowerCase());
      if (existingIdx !== undefined) {
        const existing = channels[existingIdx];
        if (existing.status === 'geo-blocked' && !isGeo && status !== 'offline') {
          channels[existingIdx] = {
            id: 'ch-' + countryCode + '-' + existingIdx,
            name: cleanName,
            logo: current.logo || existing.logo,
            group: current.group || existing.group,
            url,
            country: current.country || countryCode.toUpperCase(),
            quality,
            status,
          };
        }
        current = null;
        continue;
      }

      const channelIdx = channels.length;
      channels.push({
        id: 'ch-' + countryCode + '-' + idCounter++,
        name: cleanName,
        logo: current.logo || '',
        group: current.group || 'General',
        url,
        country: current.country || countryCode.toUpperCase(),
        quality,
        status,
      });
      seenNames.set(cleanName.toLowerCase(), channelIdx);
      current = null;
    }
  }

  return channels;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playlist = searchParams.get('playlist') || 'co';
    const useGuardian = searchParams.get('guardian') !== 'false'; // Por defecto usa guardian

    // ===== SI HAY CANALES VERIFICADOS POR EL GUARDIAN, USARLOS =====
    if (useGuardian) {
      try {
        const playlists = playlist.split(',').map(p => p.trim().toLowerCase());
        const guardianChannels: IPTVChannel[] = [];

        // Construir condiciones OR para playlists
        const conditions = playlists.map(pl => ({ playlist: pl }));

        const verified = await db.verifiedChannel.findMany({
          where: {
            OR: conditions.length > 0 ? conditions : undefined,
          },
          orderBy: { createdAt: 'desc' },
          take: 2000,
        });

        if (verified.length > 0) {
          // Marcar URLs verificadas
          const verifiedUrls = new Set(verified.map(c => c.url));

          for (const ch of verified) {
            guardianChannels.push({
              id: ch.id,
              name: ch.name,
              logo: ch.logo,
              group: ch.group,
              url: ch.url,
              country: ch.country,
              quality: ch.quality,
              status: 'online',
              verified: true,
            });
          }

          // Agregar canales personalizados
          if (playlists.includes('co')) guardianChannels.unshift(...CUSTOM_CHANNELS_CO);

          return NextResponse.json({
            success: true,
            channels: guardianChannels,
            total: guardianChannels.length,
            playlists,
            source: 'guardian',
            guardianVerified: verifiedUrls.size,
          });
        }
      } catch (err) {
        console.error('Error consultando Guardian, fallback a IPTV normal:', err);
      }
    }

    // ===== FALLBACK: IPTV normal (sin Guardian) =====
    const playlistUrls: Record<string, string> = {
      // ===== PAÍSES HISPANOS =====
      co: 'https://iptv-org.github.io/iptv/countries/co.m3u',
      mx: 'https://iptv-org.github.io/iptv/countries/mx.m3u',
      ar: 'https://iptv-org.github.io/iptv/countries/ar.m3u',
      es: 'https://iptv-org.github.io/iptv/countries/es.m3u',
      cl: 'https://iptv-org.github.io/iptv/countries/cl.m3u',
      ve: 'https://iptv-org.github.io/iptv/countries/ve.m3u',
      pe: 'https://iptv-org.github.io/iptv/countries/pe.m3u',
      bo: 'https://iptv-org.github.io/iptv/countries/bo.m3u',
      cr: 'https://iptv-org.github.io/iptv/countries/cr.m3u',
      cu: 'https://iptv-org.github.io/iptv/countries/cu.m3u',
      do: 'https://iptv-org.github.io/iptv/countries/do.m3u',
      ec: 'https://iptv-org.github.io/iptv/countries/ec.m3u',
      sv: 'https://iptv-org.github.io/iptv/countries/sv.m3u',
      gt: 'https://iptv-org.github.io/iptv/countries/gt.m3u',
      hn: 'https://iptv-org.github.io/iptv/countries/hn.m3u',
      ni: 'https://iptv-org.github.io/iptv/countries/ni.m3u',
      pa: 'https://iptv-org.github.io/iptv/countries/pa.m3u',
      py: 'https://iptv-org.github.io/iptv/countries/py.m3u',
      uy: 'https://iptv-org.github.io/iptv/countries/uy.m3u',
      pr: 'https://iptv-org.github.io/iptv/countries/pr.m3u',

      // ===== IDIOMA / REGIÓN =====
      spa: 'https://iptv-org.github.io/iptv/languages/spa.m3u',
      latam: 'https://iptv-org.github.io/iptv/regions/latam.m3u',

      // ===== CATEGORÍAS (iptv-org) =====
      news: 'https://iptv-org.github.io/iptv/categories/news.m3u',
      sports: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
      music: 'https://iptv-org.github.io/iptv/categories/music.m3u',
      kids: 'https://iptv-org.github.io/iptv/categories/kids.m3u',
      documentary: 'https://iptv-org.github.io/iptv/categories/documentary.m3u',
      entertainment: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
      lifestyle: 'https://iptv-org.github.io/iptv/categories/lifestyle.m3u',
      education: 'https://iptv-org.github.io/iptv/categories/education.m3u',
      religious: 'https://iptv-org.github.io/iptv/categories/religious.m3u',
      comedy: 'https://iptv-org.github.io/iptv/categories/comedy.m3u',
      movies: 'https://iptv-org.github.io/iptv/categories/movies.m3u',
      general: 'https://iptv-org.github.io/iptv/categories/general.m3u',

      // ===== TDTChannels (España - Legal) =====
      tdt: 'https://www.tdtchannels.com/lists/tv.m3u',
      tdt8: 'https://www.tdtchannels.com/lists/tv.m3u8',
      'tdt-radio': 'https://www.tdtchannels.com/lists/radio.m3u',
      'tdt-radio8': 'https://www.tdtchannels.com/lists/radio.m3u8',
      'tdt-all': 'https://www.tdtchannels.com/lists/tvradio.m3u8',

      // ===== FUENTES ADICIONALES =====
      'free-tv': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u',
      'free-tv-es': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_spain.m3u8',
      'free-tv-mx': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_mexico.m3u8',
      'free-tv-ar': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_argentina.m3u8',
      'free-tv-cl': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_chile.m3u8',
      'free-tv-co': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_colombia.m3u8',
      'free-tv-pe': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_peru.m3u8',
      'free-tv-ve': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_venezuela.m3u8',
      'm3ucl-total': 'https://www.m3u.cl/lista/total.m3u',
      'm3ucl-music': 'https://www.m3u.cl/lista/musica.m3u',
      'telechancho': 'https://telechancho.github.io/telechancho-iptv/telechancho-infinity.m3u',
    };

    const playlists = playlist.split(',').map(p => p.trim().toLowerCase());
    const allChannels: IPTVChannel[] = [];

    for (const pl of playlists) {
      const url = playlistUrls[pl];
      if (!url) continue;

      const cached = cache[pl];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        allChannels.push(...cached.data);
        continue;
      }

      try {
        const res = await fetch(url, {
          next: { revalidate: 1800 },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (!res.ok) continue;

        const content = await res.text();
        const parsed = parseM3U(content, pl);
        cache[pl] = { data: parsed, timestamp: Date.now() };
        allChannels.push(...parsed);
      } catch (err) {
        console.error('Error fetching playlist ' + pl + ':', err);
      }
    }

    if (playlists.includes('co')) {
      allChannels.unshift(...CUSTOM_CHANNELS_CO);
    }
    if (playlists.includes('sports') || playlists.includes('spa')) {
      allChannels.unshift(...CUSTOM_CHANNELS_CO);
    }
    if (playlists.includes('tdt')) {
      allChannels.unshift(...CUSTOM_CHANNELS_CO);
    }

    return NextResponse.json({
      success: true,
      channels: allChannels,
      total: allChannels.length,
      playlists: playlists,
      source: 'direct',
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

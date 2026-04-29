import { NextRequest, NextResponse } from 'next/server';

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

    const playlistUrls: Record<string, string> = {
      // ===== PAÍSES HISPANOS =====
      co: 'https://iptv-org.github.io/iptv/countries/co.m3u',          // Colombia
      mx: 'https://iptv-org.github.io/iptv/countries/mx.m3u',          // México
      ar: 'https://iptv-org.github.io/iptv/countries/ar.m3u',          // Argentina
      es: 'https://iptv-org.github.io/iptv/countries/es.m3u',          // España
      cl: 'https://iptv-org.github.io/iptv/countries/cl.m3u',          // Chile
      ve: 'https://iptv-org.github.io/iptv/countries/ve.m3u',          // Venezuela
      pe: 'https://iptv-org.github.io/iptv/countries/pe.m3u',          // Perú
      bo: 'https://iptv-org.github.io/iptv/countries/bo.m3u',          // Bolivia
      cr: 'https://iptv-org.github.io/iptv/countries/cr.m3u',          // Costa Rica
      cu: 'https://iptv-org.github.io/iptv/countries/cu.m3u',          // Cuba
      do: 'https://iptv-org.github.io/iptv/countries/do.m3u',          // Rep. Dominicana
      ec: 'https://iptv-org.github.io/iptv/countries/ec.m3u',          // Ecuador
      sv: 'https://iptv-org.github.io/iptv/countries/sv.m3u',          // El Salvador
      gt: 'https://iptv-org.github.io/iptv/countries/gt.m3u',          // Guatemala
      hn: 'https://iptv-org.github.io/iptv/countries/hn.m3u',          // Honduras
      ni: 'https://iptv-org.github.io/iptv/countries/ni.m3u',          // Nicaragua
      pa: 'https://iptv-org.github.io/iptv/countries/pa.m3u',          // Panamá
      py: 'https://iptv-org.github.io/iptv/countries/py.m3u',          // Paraguay
      uy: 'https://iptv-org.github.io/iptv/countries/uy.m3u',          // Uruguay
      pr: 'https://iptv-org.github.io/iptv/countries/pr.m3u',          // Puerto Rico

      // ===== IDIOMA / REGIÓN =====
      spa: 'https://iptv-org.github.io/iptv/languages/spa.m3u',        // Todos en español
      latam: 'https://iptv-org.github.io/iptv/regions/latam.m3u',      // Toda Latinoamérica

      // ===== CATEGORÍAS (iptv-org) =====
      news: 'https://iptv-org.github.io/iptv/categories/news.m3u',     // Noticias
      sports: 'https://iptv-org.github.io/iptv/categories/sports.m3u', // Deportes
      music: 'https://iptv-org.github.io/iptv/categories/music.m3u',   // Música
      kids: 'https://iptv-org.github.io/iptv/categories/kids.m3u',     // Infantil
      documentary: 'https://iptv-org.github.io/iptv/categories/documentary.m3u', // Documentales
      entertainment: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u', // Entretenimiento
      lifestyle: 'https://iptv-org.github.io/iptv/categories/lifestyle.m3u', // Estilo de vida
      education: 'https://iptv-org.github.io/iptv/categories/education.m3u', // Educación
      religious: 'https://iptv-org.github.io/iptv/categories/religious.m3u', // Religión
      comedy: 'https://iptv-org.github.io/iptv/categories/comedy.m3u', // Comedia
      movies: 'https://iptv-org.github.io/iptv/categories/movies.m3u', // Películas
      general: 'https://iptv-org.github.io/iptv/categories/general.m3u', // General

      // ===== TDTChannels (España - Legal) =====
      tdt: 'https://www.tdtchannels.com/lists/tv.m3u',                 // TDT TV España
      tdt8: 'https://www.tdtchannels.com/lists/tv.m3u8',               // TDT TV España (m3u8)
      'tdt-radio': 'https://www.tdtchannels.com/lists/radio.m3u',      // TDT Radio España
      'tdt-radio8': 'https://www.tdtchannels.com/lists/radio.m3u8',      // TDT Radio España (m3u8)
      'tdt-all': 'https://www.tdtchannels.com/lists/tvradio.m3u8',     // TDT TV + Radio

      // ===== FUENTES ADICIONALES =====
      'free-tv': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u', // Free-TV Global
      'free-tv-es': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_spain.m3u8', // Free-TV España
      'free-tv-mx': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_mexico.m3u8', // Free-TV México
      'free-tv-ar': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_argentina.m3u8', // Free-TV Argentina
      'free-tv-cl': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_chile.m3u8', // Free-TV Chile
      'free-tv-co': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_colombia.m3u8', // Free-TV Colombia
      'free-tv-pe': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_peru.m3u8', // Free-TV Perú
      'free-tv-ve': 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_venezuela.m3u8', // Free-TV Venezuela
      'm3ucl-total': 'https://www.m3u.cl/lista/total.m3u',            // M3U.CL Todos
      'm3ucl-music': 'https://www.m3u.cl/lista/musica.m3u',            // M3U.CL Música
      'telechancho': 'https://telechancho.github.io/telechancho-iptv/telechancho-infinity.m3u', // telechancho
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

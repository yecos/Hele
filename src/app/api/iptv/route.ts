import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { IPTVChannel, CUSTOM_CHANNELS_CO, CUSTOM_CHANNELS_HBO, CUSTOM_CHANNELS_PREMIUM } from '@/lib/iptv-channels';

const cache: Record<string, { data: IPTVChannel[]; timestamp: number }> = {};
const CACHE_TTL = 30 * 60 * 1000;

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
    const playlist = searchParams.get('playlist') || 'all-spa';
    const useGuardian = searchParams.get('guardian') !== 'false'; // Por defecto usa guardian

    // ===== SI HAY CANALES VERIFICADOS POR EL GUARDIAN, USARLOS =====
    if (useGuardian) {
      try {
        const rawPlaylists = playlist.split(',').map(p => p.trim().toLowerCase());
        // Expand virtual playlist all-spa
        const ALL_SPA = ['co','mx','ar','es','cl','ve','pe','bo','cr','cu','do','ec','sv','gt','hn','ni','pa','py','uy','pr','spa','eng','latam','premium','hbo'];
        const playlists = rawPlaylists.includes('all-spa') ? ALL_SPA : rawPlaylists;
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
          if (playlists.includes('hbo')) guardianChannels.unshift(...CUSTOM_CHANNELS_HBO);
          if (playlists.includes('premium')) guardianChannels.unshift(...CUSTOM_CHANNELS_PREMIUM);

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
      eng: 'https://iptv-org.github.io/iptv/languages/eng.m3u',
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

      // ===== HBO PREMIUM =====
      'hbo': 'https://raw.githubusercontent.com/lupael/IPTV/master/channels/hbo.m3u8',

      // ===== PREMIUM LATINO =====
      'premium': 'https://raw.githubusercontent.com/vivemastv/IPTV/master/PREMIUN/LATINOS/M3UP001',
    };

    // ===== VIRTUAL PLAYLIST: all-spa (todos los países hispanos + premium) =====
    const ALL_SPA_PLAYLISTS = 'co,mx,ar,es,cl,ve,pe,bo,cr,cu,do,ec,sv,gt,hn,ni,pa,py,uy,pr,spa,eng,latam,premium,hbo';
    const expandedPlaylist = playlist === 'all-spa' ? ALL_SPA_PLAYLISTS : playlist;

    const playlists = expandedPlaylist.split(',').map(p => p.trim().toLowerCase());
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

    // Add custom channels for relevant playlists
    if (playlists.includes('co') || playlists.includes('spa')) {
      allChannels.unshift(...CUSTOM_CHANNELS_CO);
    }
    if (playlists.includes('hbo')) {
      allChannels.unshift(...CUSTOM_CHANNELS_HBO);
    }
    if (playlists.includes('premium')) {
      allChannels.unshift(...CUSTOM_CHANNELS_PREMIUM);
    }

    // Filter to only Spanish and English channels
    const VALID_COUNTRIES = new Set(['CO','MX','AR','ES','CL','VE','PE','BO','CR','CU','DO','EC','SV','GT','HN','NI','PA','PY','UY','PR','LAT','ASIA','IN','US','UK','GB','AU','CA','IE','NZ']);

    // For category playlists, filter channels by language
    const isCategoryOnly = playlists.every(pl => ['news','sports','entertainment','music','movies','kids','documentary','education','comedy','lifestyle','religious','general'].includes(pl));
    if (isCategoryOnly) {
      const filtered = allChannels.filter(ch => {
        const country = ch.country.toUpperCase();
        if (VALID_COUNTRIES.has(country)) return true;
        // Check if channel name or group has Spanish/English indicators
        const nameLower = (ch.name + ' ' + ch.group).toLowerCase();
        if (nameLower.match(/spanish|español|latino|latin america|es |mx |ar |co |cl |pe |hisp/)) return true;
        return false;
      });
      allChannels.length = 0;
      allChannels.push(...filtered);
    }

    // Deduplicate channels by URL (keep first occurrence)
    const seenUrls = new Set<string>();
    const dedupedChannels = allChannels.filter(ch => {
      if (seenUrls.has(ch.url)) return false;
      seenUrls.add(ch.url);
      return true;
    });

    return NextResponse.json({
      success: true,
      channels: dedupedChannels,
      total: dedupedChannels.length,
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

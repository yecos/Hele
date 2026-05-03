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

const CUSTOM_CHANNELS_HBO: IPTVChannel[] = [
  {
    id: 'ch-custom-hbo-asia-fhd',
    name: 'HBO Asia (1080p)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/HBO_logo.svg',
    group: 'HBO Premium',
    url: 'https://liveorigin01.hbogoasia.com:8443/origin/live/main/HBO/4.m3u8?token=Zalogi',
    country: 'ASIA',
    quality: 'HD',
    status: 'online',
  },
  {
    id: 'ch-custom-hbo-asia-hd',
    name: 'HBO Asia (540p)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/HBO_logo.svg',
    group: 'HBO Premium',
    url: 'https://liveorigin01.hbogoasia.com:8443/origin/live/main/HBO/3.m3u8?token=Zalogi',
    country: 'ASIA',
    quality: 'HD',
    status: 'online',
  },
  {
    id: 'ch-custom-hbo-asia-sd',
    name: 'HBO Asia (360p)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/HBO_logo.svg',
    group: 'HBO Premium',
    url: 'https://liveorigin01.hbogoasia.com:8443/origin/live/main/HBO/2.m3u8?token=Zalogi',
    country: 'ASIA',
    quality: 'SD',
    status: 'online',
  },
  {
    id: 'ch-custom-hbo-asia-ld',
    name: 'HBO Asia (270p)',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/HBO_logo.svg',
    group: 'HBO Premium',
    url: 'https://liveorigin01.hbogoasia.com:8443/origin/live/main/HBO/1.m3u8?token=Zalogi',
    country: 'ASIA',
    quality: 'LD',
    status: 'online',
  },
  {
    id: 'ch-custom-hbo-hd-india',
    name: 'HBO HD India',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/HBO_logo.svg',
    group: 'HBO Premium',
    url: 'http://jiotv.live.cdn.jio.com/HBO_HD/HBO_HD_1200.m3u8',
    country: 'IN',
    quality: 'HD',
    status: 'online',
  },
];

const CUSTOM_CHANNELS_PREMIUM: IPTVChannel[] = [
  // ===== PELÍCULAS / CINE PREMIUM =====
  { id: 'ch-premium-fox1-hd', name: 'Fox 1 HD', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/Fox1HD/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-fox1-720p', name: 'Fox 1 (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/FOX1_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxaction', name: 'Fox Action', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/FoxAction/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxaction-720p', name: 'Fox Action (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/FOXACTION_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxaction-mx', name: 'Fox Action MX', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/FOX_ACTION_MEXICO_HD/demoUwD/OV0/hd.m3u8', country: 'MX', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxcinema', name: 'Fox Cinema', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/FoxCinema/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxcinema-720p', name: 'Fox Cinema (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/FOX_CINEMA_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxclassics', name: 'Fox Classics', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/FoxClassics/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxclassics-720p', name: 'Fox Classics (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/FOX_CLASSICS_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxcomedy-720p', name: 'Fox Comedy (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/FOX_COMEDY_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxfamily', name: 'Fox Family', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src5/FoxFamily/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxfamily-720p', name: 'Fox Family (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/FOXFAMILY_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxmovies', name: 'Fox Movies', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/FoxMovies/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxmovies-720p', name: 'Fox Movies (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/FOXMOVIES_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cinemax', name: 'Cinemax', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Cinemax_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/Cinemax/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cinemax-720p', name: 'Cinemax (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Cinemax_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/CINEMAX/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cinecanal', name: 'Cinecanal+', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Cinecanal_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/CinecanalHD/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cinecanal-720p', name: 'Cinecanal (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Cinecanal_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/CINECANAL_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cinelatino-720p', name: 'Cine Latino (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Cine_Latino_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/CINELATINO/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cinemadinamita-720p', name: 'Cinema Dinamita (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Cinema_Dinamita_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/CINEMA_DINAMITA/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-tnt', name: 'TNT', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/TNT_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/TNT/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-tnt-720p', name: 'TNT (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/TNT_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/TNT_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-space', name: 'Space HD', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Space_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/SpaceHD/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-space-720p', name: 'Space (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Space_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/SPACE_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-golden', name: 'Golden HD', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Golden_Channel_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/GoldenHD/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-golden-720p', name: 'Golden (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Golden_Channel_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/GOLDEN_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-goldenedge', name: 'Golden Edge', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Golden_Channel_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/GoldenEdge/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-goldenpremier-720p', name: 'Golden Premier (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Golden_Channel_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/GOLDEN_PREMIER_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-paramount', name: 'Paramount', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Paramount_Network_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src5/Paramount/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-paramount-720p', name: 'Paramount (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Paramount_Network_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/PARAMOUNT_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-studiouniversal', name: 'Studio Universal', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Universal_Channel_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/StudioUniversal/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-studiouniversal-720p', name: 'Studio Universal (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Universal_Channel_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/STUDIO_UNIVERSAL/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-universal', name: 'Universal Channel', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Universal_Channel_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src1/Universal/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-universal-720p', name: 'Universal (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Universal_Channel_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src2/UNIVERSAL_CHANNEL/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-multipremier', name: 'MultiPremier', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Multipremier_2017.png/200px-Multipremier_2017.png', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src5/MultiPremier/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-azcinema', name: 'Az Cinema', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Az_Cinema_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src5/AzCinema/demoUwD/OV0.m3u8', country: 'MX', quality: 'HD', status: 'online' },
  { id: 'ch-premium-megacine', name: 'MegaCine HD', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Mega_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src5/MegaCineHD/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-canalaccion', name: 'Canal+ Accion', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Movistar_Plus%2B_logo.svg', group: 'Cine Premium', url: 'http://usuarios.club/usuarios/src5/MoviAccion/demoUwD/OV0.m3u8', country: 'ES', quality: 'HD', status: 'online' },

  // ===== ENTRETENIMIENTO PREMIUM =====
  { id: 'ch-premium-fox', name: 'Fox', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src5/Fox/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-fox-720p', name: 'Fox (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src2/FOX_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxlife', name: 'Fox Life', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src1/FoxLife/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxlife-720p', name: 'Fox Life (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Fox_Broadcasting_Company_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src2/FOX_LIFE_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-sony', name: 'Sony HD', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Sony_Channel_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src1/SonyHD/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-sony-720p', name: 'Sony (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Sony_Channel_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src2/SONY_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-warner', name: 'Warner Channel HD', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Warner_Channel_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src1/WarnerChannelHD/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-warner-720p', name: 'Warner Channel (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Warner_Channel_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src2/WARNER_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-axn', name: 'AXN', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/81/AXN_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src5/AXN/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-axn-720p', name: 'AXN (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/81/AXN_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src2/AXN_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-amc', name: 'AMC', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/AMC_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src1/AMC/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-amc-720p', name: 'AMC (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/AMC_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src2/AMC_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-tntseries', name: 'TNT Series', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/TNT_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src1/TNTSeries/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-tntseries-720p', name: 'TNT Series (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/TNT_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src2/TNT_SERIES_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-ae', name: 'A&E', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/df/A%26E_Network_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src1/AEHD/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-ae-720p', name: 'A&E (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/df/A%26E_Network_logo.svg', group: 'Entretenimiento Premium', url: 'http://usuarios.club/usuarios/src2/AE_MUNDO_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },

  // ===== DEPORTES PREMIUM =====
  { id: 'ch-premium-espn', name: 'ESPN', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/ESPN_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src1/ESPN/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-espn-720p', name: 'ESPN (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/ESPN_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src2/ESPN_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-espnplus', name: 'ESPN+', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/ESPN_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src1/ESPNHD/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-espnplus-720p', name: 'ESPN+ (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/ESPN_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src2/ESPN_PLUS_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxsports', name: 'Fox Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Fox_Sports_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src1/FoxSports/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxsports-720p', name: 'Fox Sports (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Fox_Sports_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src2/FOX_SPORTS_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxsports2', name: 'Fox Sports 2', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Fox_Sports_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src1/FoxSports2/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxsports2-720p', name: 'Fox Sports 2 (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Fox_Sports_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src2/FOX_SPORTS2_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxsports3-720p', name: 'Fox Sports 3 (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Fox_Sports_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src2/FOX_SPORTS3_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-foxsportspremium', name: 'Fox Sports Premium', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Fox_Sports_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src5/FoxSportsPremium/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-beinsports', name: 'BeinSports', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/BeIn_Sports_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src5/BeinSports/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-beinsports1', name: 'BeinSports 1', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/BeIn_Sports_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src5/Deportes1/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-goltv', name: 'Gol TV', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Gol_TV_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src5/GolTV/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-tntsports', name: 'TNT Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/TNT_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src5/TNTSports/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-aymsports', name: 'AyM Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/AyM_Sports_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src5/AyMSports/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-deportv', name: 'DeporTV', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/DeporTV_logo.svg', group: 'Deportes Premium', url: 'http://usuarios.club/usuarios/src4/DeporTV/demoUwD/OV0.m3u8', country: 'AR', quality: 'HD', status: 'online' },

  // ===== INFANTIL PREMIUM =====
  { id: 'ch-premium-disney', name: 'Disney Channel', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Disney_Channel_logo.svg', group: 'Infantil Premium', url: 'http://usuarios.club/usuarios/src1/DisneyChannel/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-disney-720p', name: 'Disney Channel (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f4/Disney_Channel_logo.svg', group: 'Infantil Premium', url: 'http://usuarios.club/usuarios/src2/DISNEY_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-disneyjr-720p', name: 'Disney Junior (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Disney_Junior_logo.svg', group: 'Infantil Premium', url: 'http://usuarios.club/usuarios/src2/DISNEY_JR/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-disneyxd-720p', name: 'Disney XD (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Disney_XD_logo.svg', group: 'Infantil Premium', url: 'http://usuarios.club/usuarios/src2/DISNEY_XD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cartoonnetwork', name: 'Cartoon Network', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Cartoon_Network_logo.svg', group: 'Infantil Premium', url: 'http://usuarios.club/usuarios/src1/CartoonNetwork/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cartoonnetwork-720p', name: 'Cartoon Network (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Cartoon_Network_logo.svg', group: 'Infantil Premium', url: 'http://usuarios.club/usuarios/src2/CARTOON_NETWORK_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-nickelodeon', name: 'Nickelodeon', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Nickelodeon_logo.svg', group: 'Infantil Premium', url: 'http://usuarios.club/usuarios/src1/Nickelodeon/demoUwD/OV0.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-nickelodeon-720p', name: 'Nickelodeon (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Nickelodeon_logo.svg', group: 'Infantil Premium', url: 'http://usuarios.club/usuarios/src2/NICKELODEON_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-boomerang-720p', name: 'Boomerang (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Boomerang_logo.svg', group: 'Infantil Premium', url: 'http://usuarios.club/usuarios/src2/BOOMERANG/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-discoverykids-720p', name: 'Discovery Kids (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Discovery_Kids_logo.svg', group: 'Infantil Premium', url: 'http://usuarios.club/usuarios/src2/DISCOVERY_KIDS_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },

  // ===== CULTURA / DOCUMENTALES PREMIUM =====
  { id: 'ch-premium-discoverychannel-720p', name: 'Discovery Channel (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Discovery_Channel_logo.svg', group: 'Cultura Premium', url: 'http://usuarios.club/usuarios/src2/DISCOVERY_CHANNEL_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-discoveryciv-720p', name: 'Discovery Civilization (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Discovery_Channel_logo.svg', group: 'Cultura Premium', url: 'http://usuarios.club/usuarios/src2/DISCOVERY_CIVILIZATION/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-discoveryhh-720p', name: 'Discovery H&H (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Discovery_Channel_logo.svg', group: 'Cultura Premium', url: 'http://usuarios.club/usuarios/src2/DISCOVERY_HOME_HEALTH_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-discoverysci-720p', name: 'Discovery Science (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Discovery_Channel_logo.svg', group: 'Cultura Premium', url: 'http://usuarios.club/usuarios/src2/DISCOVERY_SCIENCE/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-discoverytheater-720p', name: 'Discovery Theater (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Discovery_Channel_logo.svg', group: 'Cultura Premium', url: 'http://usuarios.club/usuarios/src2/DISCOVERY_THEATER_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-discoveryturbo-720p', name: 'Discovery Turbo (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Discovery_Channel_logo.svg', group: 'Cultura Premium', url: 'http://usuarios.club/usuarios/src2/DISCOVERY_TURBO/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-discoveryworld-720p', name: 'Discovery World (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Discovery_Channel_logo.svg', group: 'Cultura Premium', url: 'http://usuarios.club/usuarios/src2/DISCOVERY_WORLD_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-animalplanet-720p', name: 'Animal Planet (720p)', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Animal_Planet_logo.svg', group: 'Cultura Premium', url: 'http://usuarios.club/usuarios/src2/ANIMAL_PLANET_HD/demoUwD/OV0/hd.m3u8', country: 'LAT', quality: 'HD', status: 'online' },

  // ===== CANALES PREMIUM ADICIONALES DESDE IPTV-ORG =====
  // Cine Premium
  { id: 'ch-premium-amc-lat', name: 'AMC Latin America', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/AMC_logo_2019.svg/960px-AMC_logo_2019.svg.png', group: 'Cine Premium', url: 'https://pb-fmbyorn1d0n1n.akamaized.net/v1/amc_amcespanol_3/samsungheadend_us/latest/main/hls/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-axn-lat', name: 'AXN Latinoamérica', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/AXN_logo_%282015%29.svg/960px-AXN_logo_%282015%29.svg.png', group: 'Cine Premium', url: 'https://d2ve48i6j4q0rm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-s7jtszpsde6hwz/AXN_LATAM/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-atrescine', name: 'Atrescine', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Atrescine_logo.svg/960px-Atrescine_logo.svg.png', group: 'Cine Premium', url: 'https://atres-live1.akamaized.net/atrescine/live/master.m3u8', country: 'ES', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cinecanal-south', name: 'Cinecanal South', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/CinecanalLA.png/960px-CinecanalLA.png', group: 'Cine Premium', url: 'https://d2ve48i6j4q0rm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-wwxw3fvjpkqb5/Cinecanal_South/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cine-adrenalina', name: 'Cine Adrenalina', logo: 'https://i.imgur.com/njCKaMv.png', group: 'Cine Premium', url: 'https://dai2.xumo.tv/amagi_hls_data_xumo1212A-cineadrenalina/CDN/master.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cine-premiere', name: 'Cine Premiere', logo: 'https://i.imgur.com/PdhWTO6.png', group: 'Cine Premium', url: 'https://dai2.xumo.tv/amagi_hls_data_xumo1212A-cinepremiere/CDN/master.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cine-terror', name: 'Cine Terror', logo: 'https://i.imgur.com/I5XxyLI.png', group: 'Cine Premium', url: 'https://dai2.xumo.tv/amagi_hls_data_xumo1212A-cineterror/CDN/master.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cine-romantico', name: 'Cine Romantico', logo: 'https://i.imgur.com/FUrrDrb.png', group: 'Cine Premium', url: 'https://dai2.xumo.tv/amagi_hls_data_xumo1212A-cineromantico/CDN/master.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cine-classico', name: 'Cine Clásico', logo: 'https://i.imgur.com/hCA5BRr.png', group: 'Cine Premium', url: 'https://dai2.xumo.tv/amagi_hls_data_xumo1212A-cineclasico/CDN/master.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-star-channel', name: 'Star Channel Latinoamérica', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Star_Channel_2020.svg/960px-Star_Channel_2020.svg.png', group: 'Cine Premium', url: 'https://d2ve48i6j4q0rm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-ucntv3w2gmtes/Star_Channel_LATAM_South/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-studio-universal', name: 'Studio Universal', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/StudioUniversal2016.png/960px-StudioUniversal2016.png', group: 'Cine Premium', url: 'https://d2ve48i6j4q0rm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-wwxw3fvjpkqb5/Studio_Universal_South/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-filmex', name: 'Filmex', logo: 'https://i.imgur.com/Hiz2OyC.png', group: 'Cine Premium', url: 'https://dai2.xumo.tv/amagi_hls_data_xumo1212A-filmex/CDN/master.m3u8', country: 'MX', quality: 'HD', status: 'online' },
  { id: 'ch-premium-filmex-classico', name: 'Filmex Clásico', logo: 'https://i.imgur.com/D3dj4mv.png', group: 'Cine Premium', url: 'https://dai2.xumo.tv/amagi_hls_data_xumo1212A-filmexclassico/CDN/master.m3u8', country: 'MX', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cine-ar', name: 'Cine.Ar', logo: 'https://i.imgur.com/Iozv4tT.png', group: 'Cine Premium', url: 'https://live-01-02-arl.vod.cine.ar:1935/live_ar/livestream/playlist.m3u8', country: 'AR', quality: 'HD', status: 'online' },

  // Entretenimiento Premium adicional
  { id: 'ch-premium-comedy-central-lat', name: 'Comedy Central Latinoamérica', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Comedy_Central_2018.svg/960px-Comedy_Central_2018.svg.png', group: 'Entretenimiento Premium', url: 'https://d2ve48i6j4q0rm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-2r4fbb7u8ly3k/Comedy_Central_LATAM/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-novelisima', name: 'Novelisima', logo: 'https://i.imgur.com/8dUS3Ih.png', group: 'Entretenimiento Premium', url: 'https://dai2.xumo.tv/amagi_hls_data_xumo1212A-novelisima/CDN/master.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-ae-lat', name: 'A&E Latinoamérica', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/A%26E_Network_logo.svg/960px-A%26E_Network_logo.svg.png', group: 'Entretenimiento Premium', url: 'https://d2ve48i6j4q0rm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-2r4fbb7u8ly3k/AE_LATAM/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },

  // Deportes Premium adicional
  { id: 'ch-premium-fox-sports-ar', name: 'Fox Sports Argentina', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/FOX_Sports_logo.svg/960px-FOX_Sports_logo.svg.png', group: 'Deportes Premium', url: 'https://foxsports-main.akamaized.net/hls/live/2094720/fsarg/live/playlist.m3u8', country: 'AR', quality: 'HD', status: 'online' },
  { id: 'ch-premium-fox-sports-3-lat', name: 'Fox Sports 3 Latinoamérica', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Fox_sports_3_logo.svg/960px-Fox_sports_3_logo.svg.png', group: 'Deportes Premium', url: 'https://d2ve48i6j4q0rm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-2r4fbb7u8ly3k/Fox_Sports_3_LATAM/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-directv-sports', name: 'DirecTV Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/DirecTV_Sports_Latin_America_%282018%29.png/960px-DirecTV_Sports_Latin_America_%282018%29.png', group: 'Deportes Premium', url: 'https://d2ve48i6j4q0rm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-q2j6fp3jysj7c/DirecTV_Sports/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-espn-deportes', name: 'ESPN Deportes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/ESPN_Deportes.svg/960px-ESPN_Deportes.svg.png', group: 'Deportes Premium', url: 'https://linear-153.frequency.stream/dist/plex/153/hls/master/playlist.m3u8', country: 'US', quality: 'SD', status: 'online' },
  { id: 'ch-premium-fox-deportes', name: 'Fox Deportes', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/FOX_Deportes_logo.png/960px-FOX_Deportes_logo.png', group: 'Deportes Premium', url: 'https://linear-161.frequency.stream/dist/plex/161/hls/master/playlist.m3u8', country: 'US', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cdn-deportes', name: 'CDN Deportes', logo: 'https://i.imgur.com/yU5LqTL.png', group: 'Deportes Premium', url: 'https://cdn-deportes-01.primumglobal.com/live/cdndeporteshd/stream.m3u8', country: 'DO', quality: 'HD', status: 'online' },
  { id: 'ch-premium-golf-channel-lat', name: 'Golf Channel Latinoamérica', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Golf_Channel_Logo_2018.png/960px-Golf_Channel_Logo_2018.png', group: 'Deportes Premium', url: 'https://d2ve48i6j4q0rm.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-2r4fbb7u8ly3k/Golf_Channel_LATAM/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-fifa-plus-hisp', name: 'FIFA+ Hispanic America', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/FIFA%2B_(2025).svg/960px-FIFA%2B_(2025).svg.png', group: 'Deportes Premium', url: 'https://fifa-fantasy-games-gdc.cdn.vimeo.com/fifa-live/linear-hisp/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },

  // Cultura Premium adicional
  { id: 'ch-premium-red-bull-tv-es', name: 'Red Bull TV Español', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Red_Bull_TV_logo.svg/960px-Red_Bull_TV_logo.svg.png', group: 'Cultura Premium', url: 'https://rbmn-live.akamaized.net/hls/live/590964/rokchannel1/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
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

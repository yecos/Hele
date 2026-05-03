export interface IPTVChannel {
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

export const CUSTOM_CHANNELS_CO: IPTVChannel[] = [
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

export const CUSTOM_CHANNELS_HBO: IPTVChannel[] = [
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

// Premium channels — only verified/third-party URLs (usuarios.club URLs removed as dead)
export const CUSTOM_CHANNELS_PREMIUM: IPTVChannel[] = [
  // ===== CINE PREMIUM — URLs verificadas desde iptv-org/LATAM =====
  { id: 'ch-premium-amc-lat', name: 'AMC Latin America', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/AMC_logo_2019.svg/960px-AMC_logo_2019.svg.png', group: 'Cine Premium', url: 'http://201.217.246.42:44310/Live/3fcb6e26785fd8d415571b26dc3cf5d3/local-76.playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-axn-lat', name: 'AXN Latinoamérica', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/AXN_logo_%282015%29.svg/960px-AXN_logo_%282015%29.svg.png', group: 'Cine Premium', url: 'http://201.217.246.42:44310/Live/3fcb6e26785fd8d415571b26dc3cf5d3/local-77.playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-atrescine', name: 'Atrescine', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Atrescine_logo.svg/960px-Atrescine_logo.svg.png', group: 'Cine Premium', url: 'http://181.114.57.246:4000/play/KgkA9tT2SpLYm86J/index.m3u8', country: 'ES', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cinecanal-south', name: 'Cinecanal South', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/CinecanalLA.png/960px-CinecanalLA.png', group: 'Cine Premium', url: 'http://201.217.246.42:44310/Live/3fcb6e26785fd8d415571b26dc3cf5d3/local-62.playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cine-adrenalina', name: 'Cine Adrenalina', logo: 'https://i.imgur.com/njCKaMv.png', group: 'Cine Premium', url: 'https://jmp2.uk/plu-5d8d164d92e97a5e107638d2.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cine-premiere', name: 'Cine Premiere', logo: 'https://i.imgur.com/PdhWTO6.png', group: 'Cine Premium', url: 'https://jmp2.uk/plu-5cf968040ab7d8f181e6a68b.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cine-terror', name: 'Cine Terror', logo: 'https://i.imgur.com/I5XxyLI.png', group: 'Cine Premium', url: 'https://jmp2.uk/plu-5d8d180092e97a5e107638d3.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cine-romantico', name: 'Cine Romantico', logo: 'https://i.imgur.com/FUrrDrb.png', group: 'Cine Premium', url: 'https://jmp2.uk/plu-5f171f988ab9780007fa95ea.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cine-classico', name: 'Cine Clásico', logo: 'https://i.imgur.com/hCA5BRr.png', group: 'Cine Premium', url: 'https://jmp2.uk/plu-64b9671cdac71b0008f371df.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-filmex', name: 'Filmex', logo: 'https://i.imgur.com/Hiz2OyC.png', group: 'Cine Premium', url: 'https://filmex-filmex-xumo.amagi.tv/playlist.m3u8', country: 'MX', quality: 'HD', status: 'online' },
  { id: 'ch-premium-filmex-classico', name: 'Filmex Clásico', logo: 'https://i.imgur.com/D3dj4mv.png', group: 'Cine Premium', url: 'https://filmex-filmexclasico-xumo.amagi.tv/playlist.m3u8', country: 'MX', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cine-ar', name: 'Cine.Ar', logo: 'https://i.imgur.com/Iozv4tT.png', group: 'Cine Premium', url: 'http://201.217.246.42:44310/Live/3fcb6e26785fd8d415571b26dc3cf5d3/local-20.playlist.m3u8', country: 'AR', quality: 'HD', status: 'online' },
  { id: 'ch-premium-adrenalina-pura', name: 'Adrenalina Pura TV', logo: 'https://i.imgur.com/Pvid2iH.png', group: 'Cine Premium', url: 'https://jmp2.uk/plu-61b790b985706b00072cb797.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-xtrema-accion', name: 'Xtrema Accion', logo: 'https://i.imgur.com/njCKaMv.png', group: 'Cine Premium', url: 'https://stmv6.voxtvhd.com.br/cineaccion/cineaccion/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-xtrema-terror', name: 'Xtrema Terror', logo: 'https://i.imgur.com/I5XxyLI.png', group: 'Cine Premium', url: 'https://stmv6.voxtvhd.com.br/cineterror/cineterror/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-mega-cine', name: 'Mega Cine TV', logo: 'https://i.imgur.com/njCKaMv.png', group: 'Cine Premium', url: 'https://cnn.hostlagarto.com/megacinetv/playlist.m3u8', country: 'DO', quality: 'HD', status: 'online' },
  { id: 'ch-premium-dust', name: 'DUST Sci-Fi', logo: 'https://i.imgur.com/FxYhME9.png', group: 'Cine Premium', url: 'https://dqi7ayt2o24fn.cloudfront.net/playlist.m3u8', country: 'US', quality: 'HD', status: 'online' },
  { id: 'ch-premium-aurora-films', name: 'Aurora Media Films', logo: 'https://i.imgur.com/DVC5w6H.png', group: 'Cine Premium', url: 'https://cdn.streamhispanatv.net:3417/live/auroramflive.m3u8', country: 'GT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-memorias-film', name: 'Memorias TV Film', logo: 'https://i.imgur.com/vNfjW6Y.png', group: 'Cine Premium', url: 'https://video.xtrematv.com:3725/live/memoriasfilmlive.m3u8', country: 'CO', quality: 'HD', status: 'online' },
  { id: 'ch-premium-filmes-suspense', name: 'Filmes Suspense', logo: 'https://i.imgur.com/45V9MKk.png', group: 'Cine Premium', url: 'https://jmp2.uk/plu-5f171d3442a0500007362f22.m3u8', country: 'LAT', quality: 'HD', status: 'online' },

  // ===== ENTRETENIMIENTO PREMIUM — URLs verificadas =====
  { id: 'ch-premium-novelisima', name: 'Novelisima', logo: 'https://i.imgur.com/8dUS3Ih.png', group: 'Entretenimiento Premium', url: 'https://dai2.xumo.tv/amagi_hls_data_xumo1212A-novelisima/CDN/master.m3u8', country: 'LAT', quality: 'HD', status: 'online' },

  // ===== DEPORTES PREMIUM — URLs verificadas desde iptv-org =====
  { id: 'ch-premium-fox-sports-lat', name: 'Fox Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/FOX_Sports_logo.svg/960px-FOX_Sports_logo.svg.png', group: 'Deportes Premium', url: 'http://201.217.246.42:44310/Live/b10474c9b1ba4a0986b574d1211c065b/local-91.playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-fox-sports-3-lat', name: 'Fox Sports 3 Latinoamérica', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Fox_sports_3_logo.svg/960px-Fox_sports_3_logo.svg.png', group: 'Deportes Premium', url: 'http://201.217.246.42:44310/Live/b10474c9b1ba4a0986b574d1211c065b/local-92.playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-tyc-sports', name: 'TyC Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/TyC_Sports_logo.svg/960px-TyC_Sports_logo.svg.png', group: 'Deportes Premium', url: 'http://201.217.246.42:44310/Live/d93a7c495cb5f5d236b25a3ffea95003/local-90.playlist.m3u8', country: 'AR', quality: 'HD', status: 'online' },
  { id: 'ch-premium-tyc-sports-usa', name: 'TyC Sports USA', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/TyC_Sports_logo.svg/960px-TyC_Sports_logo.svg.png', group: 'Deportes Premium', url: 'https://amg26268-amg26268c14-freelivesports-emea-10267.playouts.now.amagi.tv/ts-us-e2-n2/playlist/amg26268-sportsstudio-tycsports-freelivesportsemea/playlist.m3u8', country: 'US', quality: 'HD', status: 'online' },
  { id: 'ch-premium-deportv', name: 'DeporTV', logo: 'https://i.imgur.com/THk9ARS.png', group: 'Deportes Premium', url: 'http://201.217.246.42:44310/Live/3fcb6e26785fd8d415571b26dc3cf5d3/deportv_720.m3u8', country: 'AR', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cdn-deportes', name: 'CDN Deportes', logo: 'https://i.imgur.com/yU5LqTL.png', group: 'Deportes Premium', url: 'http://200.125.170.122:8000/play/a03j/index.m3u8', country: 'DO', quality: 'HD', status: 'online' },
  { id: 'ch-premium-golf-channel-lat', name: 'Golf Channel Latinoamérica', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Golf_Channel_Logo_2018.png/960px-Golf_Channel_Logo_2018.png', group: 'Deportes Premium', url: 'http://181.114.57.246:4000/play/BHGDIhvdyuw/index.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-combate-global', name: 'Combate Global', logo: 'https://i.imgur.com/ZPYK5jr.png', group: 'Deportes Premium', url: 'https://stream.ads.ottera.tv/playlist.m3u8?network_id=960', country: 'US', quality: 'HD', status: 'online' },
  { id: 'ch-premium-cazetv', name: 'CazeTV', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/64/Caz%C3%A9TV_logo.svg/1280px-Caz%C3%A9TV_logo.svg.png', group: 'Deportes Premium', url: 'https://dfr80qz435crc.cloudfront.net/MNOP/Amagi/Caze/Caze_TV_BR/Caze_TV.m3u8', country: 'BR', quality: 'HD', status: 'online' },
  { id: 'ch-premium-tigo-sports', name: 'Tigo Sports', logo: 'https://i.imgur.com/t35zhM9.png', group: 'Deportes Premium', url: 'https://live.enhdtv.com:8081/8160/index.m3u8', country: 'PY', quality: 'HD', status: 'online' },
  { id: 'ch-premium-fifa-plus-hisp', name: 'FIFA+ Hispanic America', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/FIFA%2B_(2025).svg/960px-FIFA%2B_(2025).svg.png', group: 'Deportes Premium', url: 'https://6c849fb3.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/TEctbXhfRklGQVBsdXNTcGFuaXNoLTFfS0xT/playlist.m3u8', country: 'LAT', quality: 'HD', status: 'online' },
  { id: 'ch-premium-l1-max', name: 'L1 Max', logo: 'https://i.imgur.com/yU5LqTL.png', group: 'Deportes Premium', url: 'https://live20.bozztv.com/akamaissh101/ssh101/l1maxhd/playlist.m3u8', country: 'PE', quality: 'HD', status: 'online' },

  // ===== DEPORTES PREMIUM adicional =====
  { id: 'ch-premium-as3-sport', name: 'AS3 Sport TV', logo: 'https://i.ibb.co/bRmGbsyV/A3-SPORTTV.jpg', group: 'Deportes Premium', url: 'https://streamtv.as3sport.online:3394/hybrid/play.m3u8', country: 'VE', quality: 'HD', status: 'online' },
];

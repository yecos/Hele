/**
 * IPTV Guardian - Motor de Descubrimiento Web Avanzado v2.0
 * 
 * 3 motores de descubrimiento:
 * 1. Deep Web Scraper - Busca en web y lee contenido completo de páginas
 * 2. GitHub Scanner - Explora repos con listas IPTV en español/latino
 * 3. Xtream Codes Prober - Prueba servidores Xtream Codes
 * 
 * Características:
 * - Validación incremental (no re-verifica lo que ya funciona)
 * - Smart dedup por URL normalizada
 * - Auto-promoción de fuentes válidas al Guardian
 * - Rate limiting para no saturar servidores
 */

import ZAI from 'z-ai-web-dev-sdk';

// Lazy Prisma init — evita crash si DATABASE_URL no está configurada
let _db: any = null;
function db() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const { PrismaClient } = require('@prisma/client');
      _db = new PrismaClient();
    } catch { _db = null; }
  }
  return _db;
}

// ===== Configuración =====
const WEB_SEARCH_QUERIES_PER_RUN = 10;
const GITHUB_QUERIES_PER_RUN = 6;
const XTREAM_PROBES_PER_RUN = 15;
const MAX_PAGE_DEPTH = 8;
const VALIDATION_TIMEOUT = 8000;
const PAGE_FETCH_TIMEOUT = 12000;
const RATE_LIMIT_MS = 800;
const MIN_CHANNELS_TO_PROMOTE = 3;
const MAX_DISCOVERED_PER_RUN = 80;

// ===== Términos de búsqueda web (español/inglés) =====
const SEARCH_QUERIES = [
  'lista iptv m3u 2025 actualizada',
  'playlist iptv latinoamerica m3u github',
  'free iptv m3u spanish channels working',
  'lista m3u canales latinos funcionando',
  'iptv m3u españa tdt canales gratis',
  'lista iptv colombia m3u gratis',
  'iptv m3u mexico canales hd',
  'lista m3u argentina iptv 2025',
  'canales iptv m3u deportes español en vivo',
  'lista iptv premium m3u gratis',
  'iptv m3u chile canales abiertos',
  'iptv m3u peru ecuador bolivia',
  'iptv m3u venezuela republica dominicana',
  'iptv m3u centroamerica guatemala honduras',
  'iptv m3u caribe cuba puerto rico',
  'm3u deportes en vivo español futbol',
  'm3u noticias español cnn telecinco',
  'm3u peliculas español series iptv',
  'm3u infantil español cartoon nickelodeon',
  'm3u musica latina reggaeton cumbia',
  'm3u documentales natgeo discovery español',
  'm3u religiosos español catolicos',
  'iptv m3u list working 2025 updated',
  'free m3u playlist spanish latino channels',
  'live tv m3u latin america working links',
  'spanish tv channels m3u playlist github',
  'iptv m3u lista nueva hoy funcionando',
  'lista iptv m3u junio 2025',
  'iptv links m3u working today',
  'best free iptv m3u 2025 spanish',
];

// ===== Consultas GitHub específicas =====
const GITHUB_QUERIES = [
  'iptv m3u spanish latino',
  'iptv lista espanol countries',
  'free iptv m3u playlist updated',
  'iptv spain tdt channels m3u',
  'iptv latin america channels',
  'spanish tv iptv m3u list',
  'iptv colombia mexico argentina',
  'iptv deportes sports m3u',
  'lista iptv m3u canales',
  'iptv-org iptv countries es',
  'tdt channels spain m3u',
  'iptv latino gratis m3u',
];

// ===== Patrones M3U =====
const M3U_PATTERNS = [
  /https?:\/\/[^\s"'<>]+\.(m3u8?)(\?[^\s"'<>]*)?/gi,
  /https?:\/\/raw\.githubusercontent\.com\/[^\s"'<>]+/gi,
  /https?:\/\/github\.com\/[^\s"'<>]+\.m3u[^\s"'<>]*/gi,
  /https?:\/\/gist\.githubusercontent\.com\/[^\s"'<>]+/gi,
  /https?:\/\/pastebin\.com\/raw\/[a-zA-Z0-9]+/gi,
  /https?:\/\/[^\s"'<>]+\/get\.php\?[^\s"'<>]+/gi,
  /https?:\/\/iptv-org\.github\.io\/iptv\/[^\s"'<>]+/gi,
  /https?:\/\/www\.tdtchannels\.com\/lists\/[^\s"'<>]+/gi,
  /https?:\/\/raw\.githubusercontent\.com\/Free-TV\/IPTV\/[^\s"'<>]+/gi,
  /https?:\/\/[^\s"'<>]*\/playlist\.m3u[^\s"'<>]*/gi,
  /https?:\/\/[^\s"'<>]*\/lista[^\s"'<>]*\.m3u[^\s"'<>]*/gi,
  /https?:\/\/[^\s"'<>]*\/channels\.m3u[^\s"'<>]*/gi,
  /https?:\/\/[^\s"'<>]*\/live[^\s"'<>]*\.m3u[^\s"'<>]*/gi,
  /https?:\/\/[^\s"'<>]*\/tv[^\s"'<>]*\.m3u[^\s"'<>]*/gi,
];

// ===== Dominios a excluir =====
const BLACKLIST_DOMAINS = [
  'youtube.com', 'youtu.be', 'facebook.com', 'twitter.com', 'x.com',
  'instagram.com', 'tiktok.com', 'wikipedia.org', 'amazon.com',
  'mercadolibre.com', 'aliexpress.com', 'ebay.com', 'pinterest.com',
  'linkedin.com', 'twitch.tv', 'dailymotion.com',
];

// ===== Servidores Xtream Codes =====
const XTREAM_SERVERS = [
  'prime-iptv.com', 'king-iptv.com', 'best-iptv.net', 'star-iptv.com',
  'turbo-iptv.com', 'mega-iptv.com', 'smart-iptv.com', 'gold-iptv.com',
  'pro-iptv.com', 'top-iptv.com', 'elite-iptv.com', 'ultra-iptv.com',
  'royal-iptv.com', 'supreme-iptv.com', 'power-iptv.com', 'rapid-iptv.com',
  'nitro-iptv.com', 'apex-iptv.com', 'max-iptv.com', 'extreme-iptv.com',
];

const XTREAM_TRIAL_CREDENTIALS = [
  { username: 'test', password: 'test' },
  { username: 'trial', password: 'trial' },
  { username: 'demo', password: 'demo' },
  { username: 'free', password: 'free' },
  { username: 'test', password: '1234' },
  { username: 'admin', password: 'admin' },
  { username: 'user', password: 'user' },
  { username: 'trial', password: '12345' },
  { username: 'test1', password: 'test1' },
  { username: 'demo', password: '123456' },
];

// ===== Estado global =====
let isDiscovering = false;
let lastDiscoveryResult: {
  status: string;
  engines: {
    web: { queries: number; urlsFound: number; validated: number; newSources: number };
    github: { queries: number; urlsFound: number; validated: number; newSources: number };
    xtream: { probes: number; working: number; newSources: number };
    scraping: { pagesRead: number; urlsExtracted: number };
  };
  totalNewSources: number;
  totalDuration: number;
  timestamp: Date;
} | null = null;

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}${u.search}`.replace(/\/+$/, '');
  } catch {
    return url;
  }
}

function isBlacklisted(url: string): boolean {
  return BLACKLIST_DOMAINS.some(d => url.includes(d));
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ===== MOTOR 1: Búsqueda Web =====

async function webSearch(query: string): Promise<{ url: string; name: string; snippet: string }[]> {
  try {
    const zai = await ZAI.create();
    const result = await zai.functions.invoke('web_search', {
      query: `${query} -site:youtube.com -site:facebook.com -site:twitter.com -site:tiktok.com`,
      num: 10,
    });
    if (!result || !Array.isArray(result)) return [];
    return result
      .filter((r: any) => r.url && r.name)
      .map((r: any) => ({ url: r.url, name: r.name, snippet: r.snippet || '' }));
  } catch (err) {
    console.error(`[Discovery:Web] Error buscando "${query}":`, err);
    return [];
  }
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PAGE_FETCH_TIMEOUT);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return '';
    return await response.text();
  } catch {
    return '';
  }
}

function extractM3uUrls(text: string): string[] {
  const urls = new Set<string>();
  for (const pattern of M3U_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let url = match[0].replace(/[)"'>;,]+$/, '');
      if (!url.startsWith('http://') && !url.startsWith('https://')) continue;
      if (isBlacklisted(url)) continue;
      url = url.replace(/[\])}>]+$/, '');
      urls.add(normalizeUrl(url));
    }
  }
  return Array.from(urls);
}

async function validateM3uUrl(url: string): Promise<{ valid: boolean; channelCount: number; sampleChannels?: string[] }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return { valid: false, channelCount: 0 };

    const reader = response.body?.getReader();
    if (reader) {
      const { value } = await reader.read();
      if (value) {
        const text = new TextDecoder().decode(value);
        if (text.includes('#EXTM3U') || text.includes('#EXTINF')) {
          const channelCount = (text.match(/#EXTINF/g) || []).length;
          const sampleChannels: string[] = [];
          const lines = text.split('\n');
          for (let i = 0; i < lines.length && sampleChannels.length < 5; i++) {
            const commaIdx = lines[i].lastIndexOf(',');
            if (commaIdx !== -1 && lines[i].includes('#EXTINF')) {
              sampleChannels.push(lines[i].substring(commaIdx + 1).trim().substring(0, 50));
            }
          }
          return { valid: channelCount > 0, channelCount, sampleChannels };
        }
      }
    }

    const contentType = response.headers.get('content-type') || '';
    const isM3u = contentType.includes('mpegurl') || contentType.includes('text/plain') ||
      contentType.includes('application/octet-stream') || url.endsWith('.m3u') || url.endsWith('.m3u8');
    if (isM3u) {
      const text = await response.text();
      const channelCount = (text.match(/#EXTINF/g) || []).length;
      return { valid: channelCount > 0, channelCount };
    }
    return { valid: false, channelCount: 0 };
  } catch {
    return { valid: false, channelCount: 0 };
  }
}

async function runWebDiscovery(existingUrls: Set<string>, maxNew: number): Promise<{ queries: number; urlsFound: number; validated: number; newSources: number }> {
  let queries = 0, urlsFound = 0, validated = 0, newSources = 0;
  const candidateUrls = new Map<string, { url: string; source: string; name: string }>();
  const shuffled = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
  const toRun = shuffled.slice(0, WEB_SEARCH_QUERIES_PER_RUN);

  for (const query of toRun) {
    queries++;
    console.log(`[Discovery:Web] Buscando: "${query}" (${queries}/${toRun.length})`);
    const results = await webSearch(query);
    for (const result of results) {
      const combined = `${result.url} ${result.name} ${result.snippet}`;
      const m3uUrls = extractM3uUrls(combined);
      for (const m3uUrl of m3uUrls) {
        if (!candidateUrls.has(m3uUrl) && !existingUrls.has(m3uUrl)) {
          candidateUrls.set(m3uUrl, { url: m3uUrl, source: result.url, name: result.name });
        }
      }
      if (result.url.endsWith('.m3u') || result.url.endsWith('.m3u8')) {
        const norm = normalizeUrl(result.url);
        if (!candidateUrls.has(norm) && !existingUrls.has(norm)) {
          candidateUrls.set(norm, { url: norm, source: 'search_result', name: result.name });
        }
      }
    }
    await delay(RATE_LIMIT_MS);
  }

  urlsFound = candidateUrls.size;
  console.log(`[Discovery:Web] ${urlsFound} URLs candidatas de ${queries} búsquedas`);
  for (const [url, info] of candidateUrls) {
    if (newSources >= maxNew) break;
    validated++;
    const validation = await validateM3uUrl(url);
    if (validation.valid) {
      console.log(`[Discovery:Web] VALIDA: ${url} (${validation.channelCount} canales)`);
      const added = await saveDiscovered(url, info.name, info.source, validation.channelCount, 'm3u', 'web');
      if (added) newSources++;
    }
    await delay(400);
  }
  return { queries, urlsFound, validated, newSources };
}

// ===== MOTOR 2: Deep Page Scraping =====

async function runDeepScraping(existingUrls: Set<string>, maxNew: number): Promise<{ pagesRead: number; urlsExtracted: number }> {
  let pagesRead = 0, urlsExtracted = 0;
  const scrapeQueries = [
    'lista iptv m3u 2025 pastebin gist',
    'iptv m3u playlist site:github.com OR site:gist.github.com',
    'free iptv m3u spanish playlist blog',
    'lista iptv gratis m3u actualizada',
    'mejores listas iptv m3u 2025',
  ];
  const shuffled = [...scrapeQueries].sort(() => Math.random() - 0.5);

  for (const query of shuffled.slice(0, 4)) {
    console.log(`[Discovery:Scrape] Buscando páginas: "${query}"`);
    const results = await webSearch(query);
    for (const result of results.slice(0, 3)) {
      if (pagesRead >= MAX_PAGE_DEPTH) break;
      if (isBlacklisted(result.url)) continue;
      console.log(`[Discovery:Scrape] Leyendo: ${result.url}`);
      const html = await fetchPageContent(result.url);
      pagesRead++;
      if (!html || html.length < 100) continue;
      const m3uUrls = extractM3uUrls(html);
      console.log(`[Discovery:Scrape] ${m3uUrls.length} URLs extraídas`);
      for (const m3uUrl of m3uUrls) {
        if (urlsExtracted >= maxNew * 2) break;
        if (existingUrls.has(m3uUrl)) continue;
        urlsExtracted++;
        const validation = await validateM3uUrl(m3uUrl);
        if (validation.valid) {
          console.log(`[Discovery:Scrape] VALIDA: ${m3uUrl} (${validation.channelCount} canales)`);
          await saveDiscovered(m3uUrl, `Scrape: ${result.name}`, result.url, validation.channelCount, 'm3u', 'scraped');
          existingUrls.add(m3uUrl);
        }
        await delay(400);
      }
      await delay(RATE_LIMIT_MS);
    }
    await delay(RATE_LIMIT_MS);
  }
  return { pagesRead, urlsExtracted };
}

// ===== MOTOR 3: GitHub Scanner =====

async function runGitHubDiscovery(existingUrls: Set<string>, maxNew: number): Promise<{ queries: number; urlsFound: number; validated: number; newSources: number }> {
  let queries = 0, urlsFound = 0, validated = 0, newSources = 0;
  const candidateUrls = new Map<string, { url: string; source: string; name: string }>();
  const shuffled = [...GITHUB_QUERIES].sort(() => Math.random() - 0.5);

  for (const query of shuffled.slice(0, GITHUB_QUERIES_PER_RUN)) {
    queries++;
    console.log(`[Discovery:GitHub] Buscando: "${query}" (${queries}/${GITHUB_QUERIES_PER_RUN})`);
    const results = await webSearch(`${query} site:github.com OR site:raw.githubusercontent.com OR site:gist.github.com`);
    for (const result of results) {
      const combined = `${result.url} ${result.name} ${result.snippet}`;
      const m3uUrls = extractM3uUrls(combined);
      for (const m3uUrl of m3uUrls) {
        if (!candidateUrls.has(m3uUrl) && !existingUrls.has(m3uUrl)) {
          candidateUrls.set(m3uUrl, { url: m3uUrl, source: result.url, name: result.name });
        }
      }
      if (result.url.includes('raw.githubusercontent.com') || result.url.endsWith('.m3u')) {
        const norm = normalizeUrl(result.url);
        if (!candidateUrls.has(norm) && !existingUrls.has(norm)) {
          candidateUrls.set(norm, { url: norm, source: result.url, name: result.name });
        }
      }
    }
    await delay(RATE_LIMIT_MS);
  }

  urlsFound = candidateUrls.size;
  console.log(`[Discovery:GitHub] ${urlsFound} URLs candidatas de ${queries} búsquedas`);
  for (const [url, info] of candidateUrls) {
    if (newSources >= maxNew) break;
    validated++;
    const validation = await validateM3uUrl(url);
    if (validation.valid) {
      console.log(`[Discovery:GitHub] VALIDA: ${url} (${validation.channelCount} canales)`);
      const added = await saveDiscovered(url, info.name, info.source, validation.channelCount, 'm3u', 'github');
      if (added) newSources++;
    }
    await delay(400);
  }
  return { queries, urlsFound, validated, newSources };
}

// ===== MOTOR 4: Xtream Codes Prober =====

async function runXtreamProbing(maxProbes: number): Promise<{ probes: number; working: number; newSources: number }> {
  let probes = 0, working = 0, newSources = 0;
  console.log(`[Discovery:Xtream] Iniciando probe de servidores Xtream...`);
  const domains = [...XTREAM_SERVERS].sort(() => Math.random() - 0.5).slice(0, maxProbes);
  const protocols = ['https://', 'http://'];
  const ports = ['', ':8080', ':8880', ':25461', ':2095', ':2086', ':2082'];
  const testedUrls = new Set<string>();

  for (const domain of domains) {
    if (newSources >= 5) break;
    const protocol = protocols[Math.floor(Math.random() * protocols.length)];
    const port = ports[Math.floor(Math.random() * ports.length)];
    const baseUrl = `${protocol}${domain}${port}`;
    if (testedUrls.has(baseUrl)) continue;
    testedUrls.add(baseUrl);
    const creds = XTREAM_TRIAL_CREDENTIALS[Math.floor(Math.random() * XTREAM_TRIAL_CREDENTIALS.length)];
    const m3uUrl = `${baseUrl}/get.php?username=${creds.username}&password=${creds.password}&type=m3u_plus&output=ts`;
    probes++;
    console.log(`[Discovery:Xtream] Probando: ${baseUrl} (${probes}/${maxProbes})`);
    const validation = await validateM3uUrl(m3uUrl);
    if (validation.valid && validation.channelCount >= 10) {
      working++;
      console.log(`[Discovery:Xtream] FUNCIONA: ${baseUrl} (${validation.channelCount} canales)`);
      const added = await saveDiscovered(m3uUrl, `Xtream: ${domain}`, baseUrl, validation.channelCount, 'xtream', 'xtream');
      if (added) newSources++;
    }
    await delay(1000);
  }
  console.log(`[Discovery:Xtream] Resultado: ${working} servidores de ${probes} probados`);
  return { probes, working, newSources };
}

// ===== Guardar fuente descubierta =====

async function saveDiscovered(url: string, name: string, sourceUrl: string, channelCount: number, type: string = 'm3u', engine: string = 'web'): Promise<boolean> {
  try {
    await db().discoveredSource.upsert({
      where: { url },
      create: { url, name: name.substring(0, 100), sourceUrl, discoveryEngine: engine, channelCount, isValid: true, lastChecked: new Date(), addedToGuardian: false },
      update: { channelCount, isValid: true, lastChecked: new Date(), sourceUrl, discoveryEngine: engine, name: name.substring(0, 100) },
    });
    if (channelCount >= MIN_CHANNELS_TO_PROMOTE) {
      try {
        await db().guardianSource.create({
          data: { name: `Descubierta: ${name.substring(0, 40)}`, url, type, category: 'discovered', priority: 50, enabled: true },
        });
        await db().discoveredSource.update({ where: { url }, data: { addedToGuardian: true } });
        console.log(`[Discovery] Promovida al Guardian: ${url.substring(0, 60)}... (${channelCount} canales)`);
        return true;
      } catch {
        try { await db().guardianSource.updateMany({ where: { url }, data: { enabled: true, updatedAt: new Date() } }); } catch {}
      }
    }
    return false;
  } catch { return false; }
}

// ===== Validación incremental =====

async function revalidateDiscoveredSources(): Promise<{ revalidated: number; stillValid: number; newlyInvalid: number }> {
  let revalidated = 0, stillValid = 0, newlyInvalid = 0;
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const sources = await db().discoveredSource.findMany({ where: { isValid: true, lastChecked: { lt: sixHoursAgo } }, orderBy: { channelCount: 'desc' }, take: 30 });
  console.log(`[Discovery] Re-validando ${sources.length} fuentes previamente válidas...`);
  for (const source of sources) {
    revalidated++;
    const validation = await validateM3uUrl(source.url);
    if (validation.valid) {
      stillValid++;
      await db().discoveredSource.update({ where: { url: source.url }, data: { channelCount: validation.channelCount, lastChecked: new Date() } });
    } else {
      newlyInvalid++;
      await db().discoveredSource.update({ where: { url: source.url }, data: { isValid: false, lastChecked: new Date() } });
      try { await db().guardianSource.updateMany({ where: { url: source.url }, data: { enabled: false } }); } catch {}
    }
    await delay(500);
  }
  console.log(`[Discovery] Re-validación: ${stillValid} válidas, ${newlyInvalid} inválidas de ${revalidated}`);
  return { revalidated, stillValid, newlyInvalid };
}

// ===== DESCUBRIMIENTO PRINCIPAL =====

export async function runDiscovery(trigger: 'scheduled' | 'manual' = 'scheduled') {
  if (isDiscovering) return { status: 'already_running', message: 'Un descubrimiento ya está en progreso' };
  isDiscovering = true;
  const startTime = Date.now();
  console.log(`[Discovery] Iniciando descubrimiento avanzado v2.0 (${trigger})...`);
  const engines = { web: { queries: 0, urlsFound: 0, validated: 0, newSources: 0 }, github: { queries: 0, urlsFound: 0, validated: 0, newSources: 0 }, xtream: { probes: 0, working: 0, newSources: 0 }, scraping: { pagesRead: 0, urlsExtracted: 0 } };

  try {
    const reval = await revalidateDiscoveredSources();
    const [existingSources, existingDiscovered] = await Promise.all([db().guardianSource.findMany({ select: { url: true } }), db().discoveredSource.findMany({ select: { url: true } })]);
    const existingUrls = new Set<string>();
    existingSources.forEach(s => existingUrls.add(normalizeUrl(s.url)));
    existingDiscovered.forEach(d => existingUrls.add(normalizeUrl(d.url)));
    const maxPerEngine = Math.floor(MAX_DISCOVERED_PER_RUN / 4);

    try { console.log('[Discovery] === MOTOR 1: Búsqueda Web ==='); engines.web = await runWebDiscovery(existingUrls, maxPerEngine); } catch (err) { console.error('[Discovery] Error en Motor Web:', err); }
    try { console.log('[Discovery] === MOTOR 2: Deep Scraping ==='); engines.scraping = await runDeepScraping(existingUrls, maxPerEngine); } catch (err) { console.error('[Discovery] Error en Motor Scraping:', err); }
    try { console.log('[Discovery] === MOTOR 3: GitHub Scanner ==='); engines.github = await runGitHubDiscovery(existingUrls, maxPerEngine); } catch (err) { console.error('[Discovery] Error en Motor GitHub:', err); }
    try { console.log('[Discovery] === MOTOR 4: Xtream Codes Prober ==='); engines.xtream = await runXtreamProbing(XTREAM_PROBES_PER_RUN); } catch (err) { console.error('[Discovery] Error en Motor Xtream:', err); }

    const totalNewSources = engines.web.newSources + engines.github.newSources + engines.xtream.newSources + engines.scraping.urlsExtracted;
    const totalDuration = Date.now() - startTime;
    lastDiscoveryResult = { status: 'completed', engines, totalNewSources, totalDuration, timestamp: new Date() };
    console.log(`[Discovery] Completado en ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`[Discovery] Web: ${engines.web.newSources} | GitHub: ${engines.github.newSources} | Xtream: ${engines.xtream.newSources} | Scrape: ${engines.scraping.urlsExtracted}`);
    return { status: 'completed', engines, revalidation: reval, totalNewSources, totalDuration };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    lastDiscoveryResult = { status: 'failed', engines, totalNewSources: 0, totalDuration: Date.now() - startTime, timestamp: new Date() };
    console.error('[Discovery] Error general:', errorMsg);
    return { status: 'failed', error: errorMsg, engines, totalDuration: Date.now() - startTime };
  } finally {
    isDiscovering = false;
  }
}

// ===== APIs públicas =====

export function getDiscoveryStatus() {
  return { isDiscovering, lastDiscovery: lastDiscoveryResult };
}

export async function getDiscoveredSources(options?: { validOnly?: boolean; limit?: number }) {
  const database = db();
  if (!database) return [];
  const where: Record<string, unknown> = {};
  if (options?.validOnly) where.isValid = true;
  return database.discoveredSource.findMany({ where, orderBy: { lastChecked: 'desc' }, take: options?.limit || 200 });
}

export async function promoteToGuardian(url: string) {
  const database = db();
  if (!database) return { success: false, error: 'DATABASE_URL no configurada' };
  const discovered = await database.discoveredSource.findUnique({ where: { url } });
  if (!discovered) return { success: false, error: 'Fuente no encontrada' };
  try {
    await database.guardianSource.create({ data: { name: discovered.name || `Descubierta: ${new URL(discovered.url).hostname}`, url: discovered.url, type: 'm3u', category: 'discovered', priority: 60, enabled: true } });
    await database.discoveredSource.update({ where: { url }, data: { addedToGuardian: true } });
    return { success: true };
  } catch { return { success: false, error: 'Ya existe en el Guardian' }; }
}

export async function getDiscoveryStats() {
  const database = db();
  if (!database) {
    return { totalDiscovered: 0, validSources: 0, addedToGuardian: 0, totalChannelsInValidSources: 0, lastRun: lastDiscoveryResult };
  }
  const [total, valid, addedToGuardian, totalChannels] = await Promise.all([
    database.discoveredSource.count(),
    database.discoveredSource.count({ where: { isValid: true } }),
    database.discoveredSource.count({ where: { addedToGuardian: true } }),
    database.discoveredSource.aggregate({ _sum: { channelCount: true }, where: { isValid: true } }),
  ]);
  return { totalDiscovered: total, validSources: valid, addedToGuardian, totalChannelsInValidSources: totalChannels._sum.channelCount || 0, lastRun: lastDiscoveryResult };
}

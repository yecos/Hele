/**
 * IPTV Guardian - Motor de Descubrimiento Web Avanzado v3.0
 * 
 * 4 motores de descubrimiento:
 * 1. Seed Loader - Carga fuentes conocidas del proyecto iptv-org
 * 2. Web Page Scraper - Busca páginas relevantes y extrae M3U del HTML
 * 3. GitHub Scanner - Explora repos con listas IPTV en español/latino
 * 4. Xtream Codes Prober - Prueba servidores Xtream Codes
 * 
 * v3.0 Changes:
 * - Motor 1: Seed URLs from iptv-org (guaranteed working sources)
 * - Motor 2: Fetches full page content (not just snippets) to extract M3U URLs
 * - Motor 3: GitHub raw content scanning
 * - Better logging for debugging
 */

import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// ===== Configuración =====
const WEB_SEARCH_QUERIES_PER_RUN = 5;
const GITHUB_QUERIES_PER_RUN = 4;
const XTREAM_PROBES_PER_RUN = 5;
const MAX_PAGE_DEPTH = 6;
const VALIDATION_TIMEOUT = 20000;
const PAGE_FETCH_TIMEOUT = 15000;
const RATE_LIMIT_MS = 600;
const MIN_CHANNELS_TO_PROMOTE = 3;
const MAX_DISCOVERED_PER_RUN = 50;

// ===== Known-good seed URLs (iptv-org project, always maintained) =====
const SEED_SOURCES = [
  { name: 'España TDT - iptv-org', url: 'https://iptv-org.github.io/iptv/countries/es.m3u', type: 'country', category: 'country' },
  { name: 'Colombia - iptv-org', url: 'https://iptv-org.github.io/iptv/countries/co.m3u', type: 'country', category: 'country' },
  { name: 'México - iptv-org', url: 'https://iptv-org.github.io/iptv/countries/mx.m3u', type: 'country', category: 'country' },
  { name: 'Argentina - iptv-org', url: 'https://iptv-org.github.io/iptv/countries/ar.m3u', type: 'country', category: 'country' },
  { name: 'Chile - iptv-org', url: 'https://iptv-org.github.io/iptv/countries/cl.m3u', type: 'country', category: 'country' },
  { name: 'Perú - iptv-org', url: 'https://iptv-org.github.io/iptv/countries/pe.m3u', type: 'country', category: 'country' },
  { name: 'Venezuela - iptv-org', url: 'https://iptv-org.github.io/iptv/countries/ve.m3u', type: 'country', category: 'country' },
  { name: 'Ecuador - iptv-org', url: 'https://iptv-org.github.io/iptv/countries/ec.m3u', type: 'country', category: 'country' },
  { name: 'Centroamérica - iptv-org', url: 'https://iptv-org.github.io/iptv/countries/gt.m3u', type: 'country', category: 'country' },
  { name: 'RD - iptv-org', url: 'https://iptv-org.github.io/iptv/countries/do.m3u', type: 'country', category: 'country' },
  { name: 'Cuba - iptv-org', url: 'https://iptv-org.github.io/iptv/countries/cu.m3u', type: 'country', category: 'country' },
  { name: 'All Spanish - iptv-org', url: 'https://iptv-org.github.io/iptv/languages/spa.m3u', type: 'language', category: 'country' },
  { name: 'Free TV Playlist', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', type: 'extra', category: 'extra' },
  { name: 'Deportes - iptv-org', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u', type: 'category', category: 'category' },
  { name: 'Noticias - iptv-org', url: 'https://iptv-org.github.io/iptv/categories/news.m3u', type: 'category', category: 'category' },
  { name: 'Música - iptv-org', url: 'https://iptv-org.github.io/iptv/categories/music.m3u', type: 'category', category: 'category' },
  { name: 'HBO Premium - lupael', url: 'https://raw.githubusercontent.com/lupael/IPTV/master/channels/hbo.m3u8', type: 'extra', category: 'extra' },
];

// ===== Términos de búsqueda web =====
const SEARCH_QUERIES = [
  'iptv m3u playlist spanish github working 2025',
  'lista iptv m3u actualizada github',
  'free iptv m3u spanish latino channels',
  'lista m3u canales latinos funcionando 2025',
  'iptv org playlist countries spanish',
  'm3u playlist tdt spain channels',
  'lista iptv colombia mexico argentina m3u',
  'iptv m3u deportes español en vivo',
  'free spanish tv channels m3u github',
  'iptv m3u lista nueva hoy funcionando',
  'hbo m3u8 iptv playlist working channels',
  'hbo live stream m3u iptv premium 2025',
];

// ===== Consultas GitHub específicas =====
const GITHUB_QUERIES = [
  'iptv m3u spanish playlist',
  'iptv lista español countries',
  'iptv-org iptv countries es',
  'free iptv m3u updated playlist',
  'hbo m3u8 iptv channels playlist',
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
  /https?:\/\/[^\s"'<>]*hbogo[^\s"'<>]*\.m3u8[^\s"'<>]*/gi,
  /https?:\/\/liveorigin[^\s"'<>]*\.m3u8[^\s"'<>]*/gi,
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
  'royal-iptv.com', 'supreme-iptv.com', 'power-iptv.com',
];

const XTREAM_TRIAL_CREDENTIALS = [
  { username: 'test', password: 'test' },
  { username: 'trial', password: 'trial' },
  { username: 'demo', password: 'demo' },
  { username: 'free', password: 'free' },
  { username: 'admin', password: 'admin' },
];

// ===== Estado global =====
let isDiscovering = false;
let lastDiscoveryResult: {
  status: string;
  engines: {
    seed: { sources: number; valid: number; newSources: number };
    web: { queries: number; pagesFetched: number; urlsFound: number; validated: number; newSources: number };
    github: { queries: number; urlsFound: number; validated: number; newSources: number };
    xtream: { probes: number; working: number; newSources: number };
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

// ===== MOTOR 0: Seed Sources (iptv-org) =====

async function runSeedDiscovery(existingUrls: Set<string>): Promise<{ sources: number; valid: number; newSources: number }> {
  let sources = 0, valid = 0, newSources = 0;
  console.log(`[Discovery:Seed] Validando ${SEED_SOURCES.length} fuentes conocidas...`);

  for (const seed of SEED_SOURCES) {
    sources++;
    const normUrl = normalizeUrl(seed.url);
    if (existingUrls.has(normUrl)) {
      console.log(`[Discovery:Seed] Ya existe: ${seed.name}`);
      continue;
    }

    const validation = await validateM3uUrl(seed.url);
    if (validation.valid) {
      valid++;
      console.log(`[Discovery:Seed] VALIDA: ${seed.name} (${validation.channelCount} canales)`);
      const result = await saveDiscovered(seed.url, seed.name, 'seed', validation.channelCount, seed.type, 'seed');
      if (result.saved) newSources++;
      existingUrls.add(normUrl);
    } else {
      console.log(`[Discovery:Seed] Inválida: ${seed.name}`);
    }
    await delay(300);
  }

  console.log(`[Discovery:Seed] ${valid} válidas de ${sources} seeds, ${newSources} nuevas`);
  return { sources, valid, newSources };
}

// ===== MOTOR 1: Web Page Scraper (fetch full content) =====

async function webSearch(query: string): Promise<{ url: string; name: string; snippet: string }[]> {
  try {
    const zai = await ZAI.create();
    const result = await zai.functions.invoke('web_search', {
      query: `${query} -site:youtube.com -site:facebook.com -site:twitter.com -site:tiktok.com`,
      num: 10,
    });
    if (!result || !Array.isArray(result)) {
      console.log(`[Discovery:Web] web_search returned non-array for "${query}"`);
      return [];
    }
    const filtered = result
      .filter((r: any) => r.url && r.name)
      .map((r: any) => ({ url: r.url, name: r.name, snippet: r.snippet || '' }));
    console.log(`[Discovery:Web] Query "${query}" → ${filtered.length} results`);
    return filtered;
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

    // Read up to 5 chunks to handle chunked encoding
    const reader = response.body?.getReader();
    if (reader) {
      let fullText = '';
      for (let i = 0; i < 5; i++) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) fullText += new TextDecoder().decode(value, { stream: true });
        if (fullText.length > 100000) break; // 100KB max
      }
      reader.cancel().catch(() => {});

      if (fullText.includes('#EXTM3U') || fullText.includes('#EXTINF')) {
        const channelCount = (fullText.match(/#EXTINF/g) || []).length;
        const sampleChannels: string[] = [];
        const lines = fullText.split('\n');
        for (let i = 0; i < lines.length && sampleChannels.length < 5; i++) {
          const commaIdx = lines[i].lastIndexOf(',');
          if (commaIdx !== -1 && lines[i].includes('#EXTINF')) {
            sampleChannels.push(lines[i].substring(commaIdx + 1).trim().substring(0, 50));
          }
        }
        return { valid: channelCount > 0, channelCount, sampleChannels };
      }
    }

    // Fallback for content-type based detection
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

async function runWebDiscovery(existingUrls: Set<string>, maxNew: number): Promise<{ queries: number; pagesFetched: number; urlsFound: number; validated: number; newSources: number }> {
  let queries = 0, pagesFetched = 0, urlsFound = 0, validated = 0, newSources = 0;
  const candidateUrls = new Map<string, { url: string; source: string; name: string }>();
  const shuffled = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
  const toRun = shuffled.slice(0, WEB_SEARCH_QUERIES_PER_RUN);

  // Phase 1: Search for pages, extract M3U URLs from snippets AND from full page content
  for (const query of toRun) {
    queries++;
    console.log(`[Discovery:Web] Buscando: "${query}" (${queries}/${toRun.length})`);
    const results = await webSearch(query);
    if (results.length === 0) continue;

    for (const result of results) {
      // First check snippets for direct M3U URLs
      const combined = `${result.url} ${result.name} ${result.snippet}`;
      const m3uFromSnippet = extractM3uUrls(combined);
      for (const m3uUrl of m3uFromSnippet) {
        if (!candidateUrls.has(m3uUrl) && !existingUrls.has(m3uUrl)) {
          candidateUrls.set(m3uUrl, { url: m3uUrl, source: result.url, name: result.name });
        }
      }

      // Check if result URL itself is a M3U file
      if (result.url.endsWith('.m3u') || result.url.endsWith('.m3u8') || result.url.includes('raw.githubusercontent.com')) {
        const norm = normalizeUrl(result.url);
        if (!candidateUrls.has(norm) && !existingUrls.has(norm)) {
          candidateUrls.set(norm, { url: norm, source: 'search_result', name: result.name });
        }
      }

      // Phase 2: Fetch the page content to extract M3U URLs from full HTML
      if (pagesFetched < MAX_PAGE_DEPTH && !isBlacklisted(result.url) && !result.url.endsWith('.m3u') && !result.url.endsWith('.m3u8')) {
        console.log(`[Discovery:Web] Fetching page: ${result.url}`);
        const html = await fetchPageContent(result.url);
        pagesFetched++;
        if (html && html.length > 200) {
          const m3uFromPage = extractM3uUrls(html);
          console.log(`[Discovery:Web] Found ${m3uFromPage.length} M3U URLs in page content`);
          for (const m3uUrl of m3uFromPage) {
            if (!candidateUrls.has(m3uUrl) && !existingUrls.has(m3uUrl)) {
              candidateUrls.set(m3uUrl, { url: m3uUrl, source: result.url, name: `Page: ${result.name}` });
            }
          }
        }
      }
    }
    await delay(RATE_LIMIT_MS);
  }

  // Phase 3: Validate all candidate URLs
  urlsFound = candidateUrls.size;
  console.log(`[Discovery:Web] ${urlsFound} URLs candidatas de ${queries} búsquedas (${pagesFetched} páginas fetcheadas)`);
  for (const [url, info] of candidateUrls) {
    if (newSources >= maxNew) break;
    validated++;
    const validation = await validateM3uUrl(url);
    if (validation.valid) {
      console.log(`[Discovery:Web] VALIDA: ${url} (${validation.channelCount} canales)`);
      const result = await saveDiscovered(url, info.name, info.source, validation.channelCount, 'm3u', 'web');
      if (result.saved) newSources++;
      existingUrls.add(url);
    }
    await delay(400);
  }
  return { queries, pagesFetched, urlsFound, validated, newSources };
}

// ===== MOTOR 2: GitHub Scanner =====

async function runGitHubDiscovery(existingUrls: Set<string>, maxNew: number): Promise<{ queries: number; urlsFound: number; validated: number; newSources: number }> {
  let queries = 0, urlsFound = 0, validated = 0, newSources = 0;
  const candidateUrls = new Map<string, { url: string; source: string; name: string }>();
  const shuffled = [...GITHUB_QUERIES].sort(() => Math.random() - 0.5);

  for (const query of shuffled.slice(0, GITHUB_QUERIES_PER_RUN)) {
    queries++;
    console.log(`[Discovery:GitHub] Buscando: "${query}" (${queries}/${GITHUB_QUERIES_PER_RUN})`);
    const results = await webSearch(`${query} site:github.com OR site:raw.githubusercontent.com OR site:gist.github.com`);

    for (const result of results) {
      // Direct M3U file links
      if (result.url.includes('raw.githubusercontent.com') || result.url.endsWith('.m3u') || result.url.endsWith('.m3u8')) {
        const norm = normalizeUrl(result.url);
        if (!candidateUrls.has(norm) && !existingUrls.has(norm)) {
          candidateUrls.set(norm, { url: norm, source: result.url, name: result.name });
        }
      }

      // GitHub repo pages — try to fetch README for M3U links
      if (result.url.includes('github.com') && !result.url.includes('raw.') && candidateUrls.size < maxNew * 2) {
        const rawReadme = result.url
          .replace('github.com', 'raw.githubusercontent.com')
          .replace(/\/$/, '/master/README.md');
        console.log(`[Discovery:GitHub] Fetching README: ${rawReadme}`);
        const readme = await fetchPageContent(rawReadme);
        if (readme && readme.length > 100) {
          const m3uFromReadme = extractM3uUrls(readme);
          for (const m3uUrl of m3uFromReadme) {
            if (!candidateUrls.has(m3uUrl) && !existingUrls.has(m3uUrl)) {
              candidateUrls.set(m3uUrl, { url: m3uUrl, source: result.url, name: `GitHub: ${result.name}` });
            }
          }
        }
      }

      // Also extract from snippets
      const combined = `${result.url} ${result.name} ${result.snippet}`;
      const m3uFromSnippet = extractM3uUrls(combined);
      for (const m3uUrl of m3uFromSnippet) {
        if (!candidateUrls.has(m3uUrl) && !existingUrls.has(m3uUrl)) {
          candidateUrls.set(m3uUrl, { url: m3uUrl, source: result.url, name: result.name });
        }
      }
    }
    await delay(RATE_LIMIT_MS);
  }

  // Validate candidates
  urlsFound = candidateUrls.size;
  console.log(`[Discovery:GitHub] ${urlsFound} URLs candidatas de ${queries} búsquedas`);
  for (const [url, info] of candidateUrls) {
    if (newSources >= maxNew) break;
    validated++;
    const validation = await validateM3uUrl(url);
    if (validation.valid) {
      console.log(`[Discovery:GitHub] VALIDA: ${url} (${validation.channelCount} canales)`);
      const result = await saveDiscovered(url, info.name, info.source, validation.channelCount, 'm3u', 'github');
      if (result.saved) newSources++;
      existingUrls.add(url);
    }
    await delay(400);
  }
  return { queries, urlsFound, validated, newSources };
}

// ===== MOTOR 3: Xtream Codes Prober =====

async function runXtreamProbing(maxProbes: number): Promise<{ probes: number; working: number; newSources: number }> {
  let probes = 0, working = 0, newSources = 0;
  console.log(`[Discovery:Xtream] Iniciando probe de servidores Xtream...`);
  const domains = [...XTREAM_SERVERS].sort(() => Math.random() - 0.5).slice(0, maxProbes);
  const protocols = ['https://', 'http://'];
  const ports = ['', ':8080', ':8880', ':25461', ':2095', ':2086', ':2082'];
  const testedUrls = new Set<string>();

  for (const domain of domains) {
    if (newSources >= 3) break;
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
      const result = await saveDiscovered(m3uUrl, `Xtream: ${domain}`, baseUrl, validation.channelCount, 'xtream', 'xtream');
      if (result.saved) newSources++;
    }
    await delay(1000);
  }
  console.log(`[Discovery:Xtream] Resultado: ${working} servidores de ${probes} probados`);
  return { probes, working, newSources };
}

// ===== Guardar fuente descubierta =====

async function saveDiscovered(url: string, name: string, sourceUrl: string, channelCount: number, type: string = 'm3u', engine: string = 'web'): Promise<{ saved: boolean; promoted: boolean }> {
  try {
    const existing = await db.discoveredSource.findUnique({ where: { url } });

    await db.discoveredSource.upsert({
      where: { url },
      create: { url, name: name.substring(0, 100), sourceUrl, discoveryEngine: engine, channelCount, isValid: true, lastChecked: new Date(), addedToGuardian: false },
      update: { channelCount, isValid: true, lastChecked: new Date(), sourceUrl, discoveryEngine: engine, name: name.substring(0, 100) },
    });

    let promoted = false;
    if (channelCount >= MIN_CHANNELS_TO_PROMOTE) {
      try {
        await db.guardianSource.create({
          data: { name: name.substring(0, 80), url, type, category: 'discovered', priority: 50, enabled: true },
        });
        await db.discoveredSource.update({ where: { url }, data: { addedToGuardian: true } });
        console.log(`[Discovery] Promovida al Guardian: ${url.substring(0, 60)}... (${channelCount} canales)`);
        promoted = true;
      } catch {
        try { await db.guardianSource.updateMany({ where: { url }, data: { enabled: true, updatedAt: new Date() } }); } catch {}
      }
    }

    return { saved: true, promoted };
  } catch (err) {
    console.error('[Discovery] Error en saveDiscovered:', err);
    return { saved: false, promoted: false };
  }
}

// ===== Validación incremental =====

async function revalidateDiscoveredSources(): Promise<{ revalidated: number; stillValid: number; newlyInvalid: number }> {
  let revalidated = 0, stillValid = 0, newlyInvalid = 0;
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const sources = await db.discoveredSource.findMany({ where: { isValid: true, lastChecked: { lt: sixHoursAgo } }, orderBy: { channelCount: 'desc' }, take: 20 });
  console.log(`[Discovery] Re-validando ${sources.length} fuentes previamente válidas...`);
  for (const source of sources) {
    revalidated++;
    const validation = await validateM3uUrl(source.url);
    if (validation.valid) {
      stillValid++;
      await db.discoveredSource.update({ where: { url: source.url }, data: { channelCount: validation.channelCount, lastChecked: new Date() } });
    } else {
      newlyInvalid++;
      await db.discoveredSource.update({ where: { url: source.url }, data: { isValid: false, lastChecked: new Date() } });
      try { await db.guardianSource.updateMany({ where: { url: source.url }, data: { enabled: false } }); } catch {}
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
  console.log(`[Discovery] Iniciando descubrimiento v3.0 (${trigger})...`);
  const engines = {
    seed: { sources: 0, valid: 0, newSources: 0 },
    web: { queries: 0, pagesFetched: 0, urlsFound: 0, validated: 0, newSources: 0 },
    github: { queries: 0, urlsFound: 0, validated: 0, newSources: 0 },
    xtream: { probes: 0, working: 0, newSources: 0 },
  };

  try {
    const reval = await revalidateDiscoveredSources();
    const [existingSources, existingDiscovered] = await Promise.all([
      db.guardianSource.findMany({ select: { url: true } }),
      db.discoveredSource.findMany({ select: { url: true }, where: { isValid: true } }),
    ]);
    const existingUrls = new Set<string>();
    existingSources.forEach(s => existingUrls.add(normalizeUrl(s.url)));
    existingDiscovered.forEach(d => existingUrls.add(normalizeUrl(d.url)));
    const maxPerEngine = Math.floor(MAX_DISCOVERED_PER_RUN / 4);

    // Motor 0: Seed (known-good iptv-org sources)
    try { console.log('[Discovery] === MOTOR 0: Seed Sources (iptv-org) ==='); engines.seed = await runSeedDiscovery(existingUrls); } catch (err) { console.error('[Discovery] Error en Motor Seed:', err); }

    // Motor 1: Web (fetch full page content)
    try { console.log('[Discovery] === MOTOR 1: Web Page Scraper ==='); engines.web = await runWebDiscovery(existingUrls, maxPerEngine); } catch (err) { console.error('[Discovery] Error en Motor Web:', err); }

    // Motor 2: GitHub
    try { console.log('[Discovery] === MOTOR 2: GitHub Scanner ==='); engines.github = await runGitHubDiscovery(existingUrls, maxPerEngine); } catch (err) { console.error('[Discovery] Error en Motor GitHub:', err); }

    // Motor 3: Xtream
    try { console.log('[Discovery] === MOTOR 3: Xtream Codes Prober ==='); engines.xtream = await runXtreamProbing(XTREAM_PROBES_PER_RUN); } catch (err) { console.error('[Discovery] Error en Motor Xtream:', err); }

    const totalNewSources = engines.seed.newSources + engines.web.newSources + engines.github.newSources + engines.xtream.newSources;
    const totalDuration = Date.now() - startTime;
    lastDiscoveryResult = { status: 'completed', engines, totalNewSources, totalDuration, timestamp: new Date() };
    console.log(`[Discovery] Completado en ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`[Discovery] Seed: ${engines.seed.newSources} | Web: ${engines.web.newSources} | GitHub: ${engines.github.newSources} | Xtream: ${engines.xtream.newSources}`);
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
  const database = db;
  if (!database) return [];
  const where: Record<string, unknown> = {};
  if (options?.validOnly) where.isValid = true;
  return database.discoveredSource.findMany({ where, orderBy: { lastChecked: 'desc' }, take: options?.limit || 200 });
}

export async function promoteToGuardian(url: string) {
  const database = db;
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
  const database = db;
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

/**
 * IPTV Guardian - Motor de Descubrimiento Web
 * Busca activamente en internet nuevas fuentes M3U y canales IPTV
 * usando búsqueda web y extracción inteligente de URLs
 */

import { PrismaClient } from '@prisma/client';
import ZAI from 'z-ai-web-dev-sdk';

const db = new PrismaClient();

// ===== Términos de búsqueda en español e inglés =====
const SEARCH_QUERIES = [
  // Listas M3U generales en español
  'lista iptv m3u 2025 actualizada',
  'playlist iptv latinoamerica m3u github',
  'free iptv m3u spanish channels',
  'lista m3u canales latinos 2025',
  'iptv m3u españa tdt 2025',
  'lista iptv colombia m3u',
  'iptv m3u mexico canales free',
  'lista m3u argentina iptv',
  'canales iptv m3u deportes español',
  'lista iptv premium m3u 2025',
  
  // Fuentes en GitHub
  'github iptv m3u playlist spanish',
  'github iptv-org countries latam',
  'github free tv iptv m3u',
  'github iptv list m3u spanish latino',
  
  // Xtream Codes y servidores
  'xtream codes iptv spanish free m3u',
  'iptv server m3u español gratis',
  
  // Fuentes especializadas
  'm3u deportes en vivo español',
  'm3u noticias español iptv',
  'm3u peliculas español iptv',
  'm3u infantil español canales',
  'm3u musica latina iptv',
  'm3u documentales español',
  'iptv cl lista m3u',
  'tdtchannels m3u alternativa',
  'telecinco m3u directo',
  'canal+ m3u iptv español',
  
  // Fuentes recientes (cambian el año para encontrar listas frescas)
  'iptv m3u lista nueva hoy',
  'lista iptv m3u funcionando',
  'iptv links m3u working 2025',
  'live tv m3u spanish latinoamerica working',
];

// ===== Patrones para extraer URLs M3U de contenido web =====
const M3U_PATTERNS = [
  // URLs directas a archivos .m3u / .m3u8
  /https?:\/\/[^\s"'<>]+\.(m3u8?)(\?[^\s"'<>]*)?/gi,
  // URLs de GitHub raw con playlists
  /https?:\/\/raw\.githubusercontent\.com\/[^\s"'<>]+/gi,
  // URLs de GitHub con .m3u
  /https?:\/\/github\.com\/[^\s"'<>]+\.m3u[^\s"'<>]*/gi,
  // URLs de gist
  /https?:\/\/gist\.githubusercontent\.com\/[^\s"'<>]+/gi,
  // URLs de paste sites
  /https?:\/\/pastebin\.com\/raw\/[a-zA-Z0-9]+/gi,
  // Xtream Codes
  /https?:\/\/[^\s"'<>]+\/get\.php\?[^\s"'<>]+/gi,
  // URLs de iptv-org
  /https?:\/\/iptv-org\.github\.io\/iptv\/[^\s"'<>]+/gi,
  // TDTChannels
  /https?:\/\/www\.tdtchannels\.com\/lists\/[^\s"'<>]+/gi,
  // Free-TV
  /https?:\/\/raw\.githubusercontent\.com\/Free-TV\/IPTV\/[^\s"'<>]+/gi,
  // Otras fuentes comunes
  /https?:\/\/[^\s"'<>]*\/playlist\.m3u[^\s"'<>]*/gi,
  /https?:\/\/[^\s"'<>]*\/lista[^\s"'<>]*\.m3u[^\s"'<>]*/gi,
  /https?:\/\/[^\s"'<>]*\/channels\.m3u[^\s"'<>]*/gi,
];

// ===== Filtros para descartar URLs no útiles =====
const BLACKLIST_DOMAINS = [
  'youtube.com', 'youtu.be', 'facebook.com', 'twitter.com', 'x.com',
  'instagram.com', 'tiktok.com', 'reddit.com', 'wikipedia.org',
  'amazon.com', 'mercadolibre.com', 'aliexpress.com', 'ebay.com',
];

// ===== Estado del discovery =====
let isDiscovering = false;
let lastDiscoveryResult: {
  status: string;
  queriesSearched: number;
  urlsFound: number;
  urlsValidated: number;
  newSourcesAdded: number;
  timestamp: Date;
} | null = null;

// ===== Función principal de búsqueda web =====
async function webSearch(query: string): Promise<{ url: string; name: string; snippet: string }[]> {
  try {
    const zai = await ZAI.create();
    const searchResult = await zai.functions.invoke('web_search', {
      query: `${query} -site:youtube.com -site:facebook.com -site:twitter.com`,
      num: 10,
    });

    if (!searchResult || !Array.isArray(searchResult)) return [];

    return searchResult
      .filter((r: { url?: string; name?: string; snippet?: string }) => r.url && r.name)
      .map((r: { url: string; name: string; snippet?: string }) => ({
        url: r.url,
        name: r.name,
        snippet: r.snippet || '',
      }));
  } catch (err) {
    console.error(`[Discovery] Error buscando "${query}":`, err);
    return [];
  }
}

// ===== Extraer URLs M3U del contenido de una página =====
function extractM3uUrls(text: string): string[] {
  const urls = new Set<string>();

  for (const pattern of M3U_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let url = match[0];
      
      // Limpiar URL
      url = url.replace(/[)"'>;,]+$/, '');
      
      // Filtrar por dominios blacklist
      const isBlacklisted = BLACKLIST_DOMAINS.some(domain => url.includes(domain));
      if (isBlacklisted) continue;
      
      // Solo aceptar URLs con protocolo http(s)
      if (!url.startsWith('http://') && !url.startsWith('https://')) continue;
      
      urls.add(url);
    }
  }

  return Array.from(urls);
}

// ===== Verificar si una URL es un M3U válido =====
async function validateM3uUrl(url: string): Promise<{ valid: boolean; channelCount: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return { valid: false, channelCount: 0 };

    const contentType = response.headers.get('content-type') || '';
    
    // Verificar que sea texto o M3U
    const isM3u = contentType.includes('mpegurl') || 
                  contentType.includes('audio/mpegurl') ||
                  contentType.includes('text/plain') ||
                  contentType.includes('application/octet-stream') ||
                  url.endsWith('.m3u') || 
                  url.endsWith('.m3u8');

    if (!isM3u) {
      // Puede que no tenga content-type correcto, leer contenido
      const reader = response.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        if (value) {
          const text = new TextDecoder().decode(value);
          if (text.includes('#EXTM3U') || text.includes('#EXTINF')) {
            const channelCount = (text.match(/#EXTINF/g) || []).length;
            return { valid: true, channelCount };
          }
        }
      }
      return { valid: false, channelCount: 0 };
    }

    // Contar canales
    const text = await response.text();
    const channelCount = (text.match(/#EXTINF/g) || []).length;

    return { valid: channelCount > 0, channelCount };
  } catch {
    return { valid: false, channelCount: 0 };
  }
}

// ===== Descubrimiento completo =====
export async function runDiscovery(trigger: 'scheduled' | 'manual' = 'scheduled') {
  if (isDiscovering) {
    return { status: 'already_running', message: 'Un descubrimiento ya está en progreso' };
  }

  isDiscovering = true;
  const startTime = Date.now();

  console.log('[Discovery] Iniciando búsqueda web de fuentes M3U...');

  let queriesSearched = 0;
  let totalUrlsFound = 0;
  let urlsValidated = 0;
  let newSourcesAdded = 0;

  try {
    // 1. Obtener URLs ya conocidas para no duplicar
    const existingSources = await db.guardianSource.findMany({
      select: { url: true },
    });
    const existingUrls = new Set(existingSources.map(s => s.url));

    // Obtener fuentes descubiertas previamente
    const existingDiscovered = await db.discoveredSource.findMany({
      select: { url: true },
    });
    existingDiscovered.forEach(d => existingUrls.add(d.url));

    const allM3uUrls = new Map<string, { url: string; source: string; name: string }>();

    // 2. Ejecutar búsquedas web (limitar a queries aleatorios para no saturar)
    const shuffledQueries = [...SEARCH_QUERIES].sort(() => Math.random() - 0.5);
    const queriesToRun = shuffledQueries.slice(0, 12); // 12 queries por descubrimiento

    for (const query of queriesToRun) {
      queriesSearched++;
      console.log(`[Discovery] Buscando: "${query}" (${queriesSearched}/${queriesToRun.length})`);

      try {
        const results = await webSearch(query);
        
        for (const result of results) {
          // Extraer URLs M3U del snippet y la URL misma
          const combinedText = `${result.url} ${result.name} ${result.snippet}`;
          const m3uUrls = extractM3uUrls(combinedText);

          for (const m3uUrl of m3uUrls) {
            if (!allM3uUrls.has(m3uUrl) && !existingUrls.has(m3uUrl)) {
              allM3uUrls.set(m3uUrl, {
                url: m3uUrl,
                source: result.url,
                name: result.name,
              });
            }
          }

          // También verificar si la URL del resultado es directamente un M3U
          if (result.url.endsWith('.m3u') || result.url.endsWith('.m3u8')) {
            if (!allM3uUrls.has(result.url) && !existingUrls.has(result.url)) {
              allM3uUrls.set(result.url, {
                url: result.url,
                source: 'search_result',
                name: result.name,
              });
            }
          }
        }

        // Rate limit entre queries
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`[Discovery] Error en query "${query}":`, err);
      }
    }

    totalUrlsFound = allM3uUrls.size;
    console.log(`[Discovery] ${totalUrlsFound} URLs candidatas encontradas de ${queriesSearched} búsquedas`);

    // 3. Validar cada URL encontrada
    const validationResults: {
      url: string;
      valid: boolean;
      channelCount: number;
      source: string;
      name: string;
    }[] = [];

    for (const [url, info] of allM3uUrls) {
      urlsValidated++;
      console.log(`[Discovery] Validando ${urlsValidated}/${totalUrlsFound}: ${url.substring(0, 60)}...`);

      const validation = await validateM3uUrl(url);
      
      validationResults.push({
        url,
        valid: validation.valid,
        channelCount: validation.channelCount,
        source: info.source,
        name: info.name,
      });

      if (validation.valid) {
        console.log(`[Discovery] VALIDA: ${url} (${validation.channelCount} canales)`);
      }

      // Rate limit entre validaciones
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 4. Guardar resultados en la DB
    for (const result of validationResults) {
      try {
        await db.discoveredSource.upsert({
          where: { url: result.url },
          create: {
            url: result.url,
            name: result.name,
            sourceUrl: result.source,
            channelCount: result.channelCount,
            isValid: result.valid,
            lastChecked: new Date(),
            addedToGuardian: false,
          },
          update: {
            channelCount: result.channelCount,
            isValid: result.valid,
            lastChecked: new Date(),
            sourceUrl: result.source,
            name: result.name,
          },
        });
      } catch {
        // Duplicado, ignorar
      }

      // Si es válida y tiene suficientes canales, agregar al Guardian
      if (result.valid && result.channelCount >= 5) {
        try {
          await db.guardianSource.create({
            data: {
              name: `Descubierta: ${result.name.substring(0, 40)}`,
              url: result.url,
              type: 'm3u',
              category: 'discovered',
              priority: 50,
              enabled: true,
            },
          });
          
          newSourcesAdded++;
          console.log(`[Discovery] Nueva fuente agregada al Guardian: ${result.url}`);
        } catch {
          // Ya existe en Guardian, actualizar
          try {
            await db.guardianSource.updateMany({
              where: { url: result.url },
              data: { enabled: true, updatedAt: new Date() },
            });
          } catch {}
        }

        // Marcar como agregada
        try {
          await db.discoveredSource.update({
            where: { url: result.url },
            data: { addedToGuardian: true },
          });
        } catch {}
      }
    }

    const durationMs = Date.now() - startTime;
    lastDiscoveryResult = {
      status: 'completed',
      queriesSearched,
      urlsFound: totalUrlsFound,
      urlsValidated,
      newSourcesAdded,
      timestamp: new Date(),
    };

    console.log(`[Discovery] Completado en ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`[Discovery] Resumen: ${queriesSearched} queries | ${totalUrlsFound} URLs | ${newSourcesAdded} nuevas fuentes`);

    return {
      status: 'completed',
      queriesSearched,
      urlsFound: totalUrlsFound,
      urlsValidated,
      newSourcesAdded,
      durationMs,
      validSources: validationResults.filter(r => r.valid),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[Discovery] Error:', errorMsg);

    lastDiscoveryResult = {
      status: 'failed',
      queriesSearched,
      urlsFound: totalUrlsFound,
      urlsValidated,
      newSourcesAdded,
      timestamp: new Date(),
    };

    return {
      status: 'failed',
      error: errorMsg,
      queriesSearched,
      urlsFound: totalUrlsFound,
      urlsValidated,
      newSourcesAdded,
    };
  } finally {
    isDiscovering = false;
  }
}

// ===== Estado del discovery =====
export function getDiscoveryStatus() {
  return {
    isDiscovering,
    lastDiscovery: lastDiscoveryResult,
  };
}

// ===== Obtener fuentes descubiertas =====
export async function getDiscoveredSources(options?: { validOnly?: boolean; limit?: number }) {
  const where: Record<string, unknown> = {};
  if (options?.validOnly) {
    where.isValid = true;
  }

  const sources = await db.discoveredSource.findMany({
    where,
    orderBy: { lastChecked: 'desc' },
    take: options?.limit || 200,
  });

  return sources;
}

// ===== Agregar fuente descubierta al Guardian manualmente =====
export async function promoteToGuardian(url: string) {
  const discovered = await db.discoveredSource.findUnique({
    where: { url },
  });

  if (!discovered) {
    return { success: false, error: 'Fuente no encontrada' };
  }

  try {
    await db.guardianSource.create({
      data: {
        name: discovered.name || `Descubierta: ${new URL(discovered.url).hostname}`,
        url: discovered.url,
        type: 'm3u',
        category: 'discovered',
        priority: 60,
        enabled: true,
      },
    });

    await db.discoveredSource.update({
      where: { url },
      data: { addedToGuardian: true },
    });

    return { success: true };
  } catch {
    return { success: false, error: 'Ya existe en el Guardian' };
  }
}

// ===== Obtener estadísticas de descubrimiento =====
export async function getDiscoveryStats() {
  const [total, valid, addedToGuardian, totalChannels] = await Promise.all([
    db.discoveredSource.count(),
    db.discoveredSource.count({ where: { isValid: true } }),
    db.discoveredSource.count({ where: { addedToGuardian: true } }),
    db.discoveredSource.aggregate({
      _sum: { channelCount: true },
      where: { isValid: true },
    }),
  ]);

  return {
    totalDiscovered: total,
    validSources: valid,
    addedToGuardian,
    totalChannelsInValidSources: totalChannels._sum.channelCount || 0,
  };
}

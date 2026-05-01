/**
 * IPTV Guardian - Motor de escaneo y validación
 * Se ejecuta en segundo plano para mantener los canales actualizados
 */

import { GUARDIAN_SOURCES } from './sources';
import { db } from '@/lib/db';

// ===== Configuración del scanner =====
const CHECK_TIMEOUT = 5000;        // 5 segundos por stream
const CONCURRENCY = 20;            // 20 streams en paralelo
const FETCH_TIMEOUT = 15000;       // 15 segundos para descargar playlist
const MAX_CHANNELS_PER_SOURCE = 500; // Limitar canales por fuente

// ===== Estado global del scanner =====
let isScanning = false;
let lastScanResult: {
  status: string;
  totalChannels: number;
  workingChannels: number;
  timestamp: Date;
} | null = null;

// ===== Parser M3U =====
interface ParsedChannel {
  name: string;
  logo: string;
  group: string;
  url: string;
  country: string;
  quality: string;
}

function parseM3U(content: string): ParsedChannel[] {
  const lines = content.split('\n');
  const channels: ParsedChannel[] = [];
  let current: Partial<ParsedChannel> | null = null;
  const seenUrls = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('#EXTINF')) {
      current = {};

      const logoMatch = trimmed.match(/tvg-logo="([^"]*)"/);
      if (logoMatch) current.logo = logoMatch[1];

      const groupMatch = trimmed.match(/group-title="([^"]*)"/);
      if (groupMatch) current.group = groupMatch[1];

      const commaIdx = trimmed.lastIndexOf(',');
      if (commaIdx !== -1) {
        current.name = trimmed.substring(commaIdx + 1).trim();
      }
    } else if (trimmed.startsWith('#EXTVLCOPT') || trimmed.startsWith('#')) {
      continue;
    } else if (trimmed && current) {
      const url = trimmed;

      // Skip duplicates within same playlist
      if (seenUrls.has(url)) {
        current = null;
        continue;
      }
      seenUrls.add(url);

      let name = current.name || 'Unknown';
      // Clean name
      name = name.replace(/\s*\bGEO\b\s*/gi, '').trim();
      name = name.replace(/\s*\[(Geo-blocked|Not 24\/7|Offline)\]\s*/g, '').trim();
      name = name.replace(/\s*\(\d{3,4}p\)\s*/g, '').trim();
      name = name.replace(/\s+[A-Z]{2}\s*$/, '').trim();

      let quality = 'SD';
      if (/1080p|4K/i.test(name) || /hd[\s/_.-]/i.test(url)) quality = 'HD';
      else if (/720p/i.test(name)) quality = 'HD';
      else if (/540p|480p/i.test(name)) quality = 'SD';

      channels.push({
        name,
        logo: current.logo || '',
        group: current.group || 'General',
        url,
        country: current.country || '',
        quality,
      });
      current = null;
    }
  }

  return channels;
}

// ===== Validador de streams =====
async function checkStream(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
    });

    clearTimeout(timeout);

    if (!response.ok && response.status !== 206) return false;

    // Para HLS, verificar contenido
    if (url.includes('.m3u8')) {
      const contentType = response.headers.get('content-type') || '';
      if (
        contentType.includes('mpegurl') ||
        contentType.includes('mpegURL') ||
        contentType.includes('apple') ||
        contentType.includes('video/') ||
        contentType.includes('audio/') ||
        contentType.includes('octet-stream')
      ) {
        return true;
      }

      try {
        const reader = response.body?.getReader();
        if (reader) {
          const { value } = await reader.read();
          if (value) {
            const text = new TextDecoder().decode(value);
            if (text.includes('#EXTM3U') || text.includes('#EXTINF') || text.includes('#EXT-X')) {
              return true;
            }
            if (text.length > 0 && !text.includes('<html') && !text.includes('<!DOCTYPE')) {
              return true;
            }
          }
        }
      } catch {
        return true; // Si llegamos aquí con 200, probablemente funciona
      }
    }

    return true;
  } catch {
    return false;
  }
}

// ===== Validación en lote con concurrencia =====
async function checkBatch(urls: string[]): Promise<Set<string>> {
  const working = new Set<string>();
  const pending: Map<string, Promise<void>> = new Map();

  for (const url of urls) {
    if (working.size >= MAX_CHANNELS_PER_SOURCE) break;

    const promise = checkStream(url).then(isWorking => {
      if (isWorking) working.add(url);
      pending.delete(url);
    }).catch(() => {
      pending.delete(url);
    });

    pending.set(url, promise);

    // Limitar concurrencia
    if (pending.size >= CONCURRENCY) {
      await Promise.race(pending.values());
    }
  }

  // Esperar los que queden
  await Promise.all(pending.values());

  return working;
}

// ===== Descargar y parsear una fuente =====
async function fetchSource(url: string): Promise<ParsedChannel[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return [];

    const content = await response.text();
    return parseM3U(content);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

// ===== Escaneo completo =====
export async function runFullScan(trigger: 'scheduled' | 'manual' = 'scheduled') {
  // Prevenir escaneos simultáneos
  if (isScanning) {
    return { status: 'already_running', message: 'Un escaneo ya está en progreso' };
  }

  const database = db;
  if (!database) {
    return { status: 'error', message: 'DATABASE_URL no configurada. No se puede escanear sin base de datos.' };
  }

  isScanning = true;
  const startTime = Date.now();

  // Crear registro del escaneo
  const scan = await db.guardianScan.create({
    data: {
      status: 'running',
      trigger,
      startedAt: new Date(),
    },
  });

  console.log(`[Guardian] Escaneo ${trigger} iniciado - ID: ${scan.id}`);

  let totalSources = 0;
  let totalChannels = 0;
  let workingChannels = 0;
  let failedChannels = 0;

  try {
    // Limpiar canales verificados anteriores
    await db.verifiedChannel.deleteMany({});

    // Obtener fuentes habilitadas de la DB, o usar las predefinidas
    const dbSources = await db.guardianSource.findMany({
      where: { enabled: true },
      orderBy: { priority: 'desc' },
    });

    const sources = dbSources.length > 0
      ? dbSources.map(s => ({ id: s.name.toLowerCase().replace(/\s+/g, '-'), name: s.name, url: s.url, category: s.category, priority: s.priority }))
      : GUARDIAN_SOURCES;

    // Seed las fuentes en la DB si no existen
    if (dbSources.length === 0) {
      console.log('[Guardian] Seeding fuentes predefinidas...');
      await db.guardianSource.createMany({
        data: GUARDIAN_SOURCES.map(s => ({
          name: s.name,
          url: s.url,
          type: 'm3u',
          category: s.category,
          priority: s.priority,
        })),
        skipDuplicates: true,
      });
    }

    // Escanear cada fuente
    for (const source of sources) {
      totalSources++;
      console.log(`[Guardian] Escaneando fuente ${totalSources}/${sources.length}: ${source.name}`);

      try {
        // Descargar playlist
        const channels = await fetchSource(source.url);
        if (channels.length === 0) {
          console.log(`[Guardian] ${source.name}: Sin canales encontrados`);
          continue;
        }

        totalChannels += channels.length;
        console.log(`[Guardian] ${source.name}: ${channels.length} canales encontrados, validando...`);

        // Validar streams (limitar a MAX_CHANNELS_PER_SOURCE)
        const urlsToCheck = channels.slice(0, MAX_CHANNELS_PER_SOURCE).map(c => c.url);
        const working = await checkBatch(urlsToCheck);

        // Guardar canales verificados en la DB
        for (const channel of channels) {
          if (working.has(channel.url)) {
            workingChannels++;
            try {
              await db.verifiedChannel.create({
                data: {
                  scanId: scan.id,
                  sourceId: source.id,
                  name: channel.name,
                  logo: channel.logo,
                  group: channel.group,
                  url: channel.url,
                  country: channel.country || source.category === 'country' ? source.id.toUpperCase() : '',
                  quality: channel.quality,
                  playlist: source.id,
                },
              });
            } catch {
              // Duplicado de URL (unique constraint), ignorar
              workingChannels--; // No se incrementó realmente
            }
          } else {
            failedChannels++;
          }
        }

        console.log(`[Guardian] ${source.name}: ${working.size} OK de ${channels.length} totales`);

        // Actualizar registro de la fuente
        await db.guardianSource.updateMany({
          where: { name: source.name },
          data: { updatedAt: new Date() },
        });
      } catch (err) {
        console.error(`[Guardian] Error en fuente ${source.name}:`, err);
      }
    }

    // Actualizar registro del escaneo
    const durationMs = Date.now() - startTime;
    await db.guardianScan.update({
      where: { id: scan.id },
      data: {
        status: 'completed',
        totalSources,
        totalChannels,
        workingChannels,
        failedChannels,
        durationMs,
        completedAt: new Date(),
      },
    });

    lastScanResult = {
      status: 'completed',
      totalChannels,
      workingChannels,
      timestamp: new Date(),
    };

    console.log(`[Guardian] Escaneo completado en ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`[Guardian] Total: ${totalChannels} canales | OK: ${workingChannels} | Fail: ${failedChannels}`);

    return {
      scanId: scan.id,
      status: 'completed',
      totalSources,
      totalChannels,
      workingChannels,
      failedChannels,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';

    await db.guardianScan.update({
      where: { id: scan.id },
      data: {
        status: 'failed',
        error: errorMsg,
        durationMs,
        completedAt: new Date(),
      },
    });

    lastScanResult = {
      status: 'failed',
      totalChannels,
      workingChannels,
      timestamp: new Date(),
    };

    console.error('[Guardian] Escaneo fallido:', errorMsg);

    return {
      scanId: scan.id,
      status: 'failed',
      error: errorMsg,
      totalChannels,
      workingChannels,
      durationMs,
    };
  } finally {
    isScanning = false;
  }
}

// ===== Obtener estado actual =====
export function getScannerStatus() {
  return {
    isScanning,
    lastScan: lastScanResult,
  };
}

// ===== Obtener canales verificados de la DB =====
export async function getVerifiedChannels(options?: { playlist?: string; group?: string; limit?: number }) {
  const database = db;
  if (!database) return [];

  const where: Record<string, unknown> = {};

  if (options?.playlist) {
    where.playlist = options.playlist;
  }
  if (options?.group) {
    where.group = options.group;
  }

  const channels = await database.verifiedChannel.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 5000,
  });

  return channels;
}

// ===== Obtener estadísticas =====
export async function getGuardianStats() {
  const database = db;
  if (!database) {
    return {
      totalSources: 0,
      totalVerified: 0,
      isScanning: false,
      latestScan: null,
      totalScans: 0,
      playlistsBreakdown: [],
    };
  }

  const [
    totalSources,
    totalVerified,
    latestScan,
    scansCount,
    playlistsBreakdown,
  ] = await Promise.all([
    database.guardianSource.count({ where: { enabled: true } }),
    database.verifiedChannel.count(),
    database.guardianScan.findFirst({ orderBy: { startedAt: 'desc' } }),
    database.guardianScan.count(),
    database.verifiedChannel.groupBy({ by: ['playlist'], _count: true, orderBy: { _count: { url: 'desc' } } }),
  ]);

  return {
    totalSources,
    totalVerified,
    isScanning,
    latestScan,
    totalScans: scansCount,
    playlistsBreakdown: playlistsBreakdown.map(p => ({
      playlist: p.playlist,
      count: p._count,
    })),
  };
}

/**
 * HELE Guardian discovery.
 *
 * Discovery is intentionally restricted to curated public sources and sources
 * already configured by an administrator. Broad web scraping, credential
 * probing and arbitrary provider discovery are not part of the HELE runtime.
 */

import { db } from '@/lib/db';

const VALIDATION_TIMEOUT = 20_000;
const MIN_CHANNELS_TO_PROMOTE = 3;

const SEED_SOURCES = [
  { name: 'España TDT — iptv-org', url: 'https://iptv-org.github.io/iptv/countries/es.m3u', type: 'country' },
  { name: 'Colombia — iptv-org', url: 'https://iptv-org.github.io/iptv/countries/co.m3u', type: 'country' },
  { name: 'México — iptv-org', url: 'https://iptv-org.github.io/iptv/countries/mx.m3u', type: 'country' },
  { name: 'Argentina — iptv-org', url: 'https://iptv-org.github.io/iptv/countries/ar.m3u', type: 'country' },
  { name: 'Chile — iptv-org', url: 'https://iptv-org.github.io/iptv/countries/cl.m3u', type: 'country' },
  { name: 'Perú — iptv-org', url: 'https://iptv-org.github.io/iptv/countries/pe.m3u', type: 'country' },
  { name: 'Ecuador — iptv-org', url: 'https://iptv-org.github.io/iptv/countries/ec.m3u', type: 'country' },
  { name: 'Español — iptv-org', url: 'https://iptv-org.github.io/iptv/languages/spa.m3u', type: 'language' },
  { name: 'Noticias — iptv-org', url: 'https://iptv-org.github.io/iptv/categories/news.m3u', type: 'category' },
  { name: 'Música — iptv-org', url: 'https://iptv-org.github.io/iptv/categories/music.m3u', type: 'category' },
  { name: 'Free-TV public playlist', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', type: 'public' },
] as const;

type EngineStatus = {
  seed: { sources: number; valid: number; newSources: number };
  web: { queries: number; pagesFetched: number; urlsFound: number; validated: number; newSources: number };
  github: { queries: number; urlsFound: number; validated: number; newSources: number };
  xtream: { probes: number; working: number; newSources: number };
};

let isDiscovering = false;
let lastDiscoveryResult: {
  status: string;
  engines: EngineStatus;
  totalNewSources: number;
  totalDuration: number;
  timestamp: Date;
} | null = null;

function emptyEngines(): EngineStatus {
  return {
    seed: { sources: 0, valid: 0, newSources: 0 },
    web: { queries: 0, pagesFetched: 0, urlsFound: 0, validated: 0, newSources: 0 },
    github: { queries: 0, urlsFound: 0, validated: 0, newSources: 0 },
    xtream: { probes: 0, working: 0, newSources: 0 },
  };
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`.replace(/\/+$/, '');
  } catch {
    return url;
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function validateM3uUrl(url: string): Promise<{ valid: boolean; channelCount: number }> {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, channelCount: 0 };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, channelCount: 0 };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'HELE-Guardian/1.1',
        Accept: 'audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain,*/*',
      },
    });

    if (!response.ok) {
      return { valid: false, channelCount: 0 };
    }

    const text = await response.text();

    if (!text.includes('#EXTM3U')) {
      return { valid: false, channelCount: 0 };
    }

    const channelCount = (text.match(/#EXTINF/gi) || []).length;

    return {
      valid: channelCount > 0,
      channelCount,
    };
  } catch {
    return { valid: false, channelCount: 0 };
  } finally {
    clearTimeout(timeout);
  }
}

async function saveDiscovered(
  url: string,
  name: string,
  sourceUrl: string,
  channelCount: number,
  type = 'm3u',
  engine = 'seed'
): Promise<{ saved: boolean; promoted: boolean }> {
  try {
    await db.discoveredSource.upsert({
      where: { url },
      create: {
        url,
        name: name.substring(0, 100),
        sourceUrl,
        discoveryEngine: engine,
        channelCount,
        isValid: true,
        lastChecked: new Date(),
        addedToGuardian: false,
      },
      update: {
        channelCount,
        isValid: true,
        lastChecked: new Date(),
        sourceUrl,
        discoveryEngine: engine,
        name: name.substring(0, 100),
      },
    });

    let promoted = false;

    if (channelCount >= MIN_CHANNELS_TO_PROMOTE) {
      const existing = await db.guardianSource.findFirst({ where: { url } });

      if (!existing) {
        await db.guardianSource.create({
          data: {
            name: name.substring(0, 80),
            url,
            type,
            category: 'public',
            priority: 50,
            enabled: true,
          },
        });
        promoted = true;
      } else if (!existing.enabled) {
        await db.guardianSource.update({
          where: { id: existing.id },
          data: { enabled: true, updatedAt: new Date() },
        });
      }

      await db.discoveredSource.update({
        where: { url },
        data: { addedToGuardian: true },
      });
    }

    return { saved: true, promoted };
  } catch (error) {
    console.error('[Guardian Discovery] Could not save source:', error);
    return { saved: false, promoted: false };
  }
}

async function runSeedDiscovery(
  existingUrls: Set<string>
): Promise<{ sources: number; valid: number; newSources: number }> {
  let valid = 0;
  let newSources = 0;

  for (const seed of SEED_SOURCES) {
    const normalized = normalizeUrl(seed.url);

    if (existingUrls.has(normalized)) {
      continue;
    }

    const validation = await validateM3uUrl(seed.url);

    if (validation.valid) {
      valid += 1;
      const saved = await saveDiscovered(
        seed.url,
        seed.name,
        seed.url,
        validation.channelCount,
        seed.type,
        'seed'
      );

      if (saved.saved) {
        newSources += 1;
      }

      existingUrls.add(normalized);
    }

    await delay(250);
  }

  return {
    sources: SEED_SOURCES.length,
    valid,
    newSources,
  };
}

async function revalidateDiscoveredSources(): Promise<{
  revalidated: number;
  stillValid: number;
  newlyInvalid: number;
}> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const sources = await db.discoveredSource.findMany({
    where: {
      isValid: true,
      lastChecked: { lt: sixHoursAgo },
    },
    orderBy: { channelCount: 'desc' },
    take: 20,
  });

  let revalidated = 0;
  let stillValid = 0;
  let newlyInvalid = 0;

  for (const source of sources) {
    revalidated += 1;
    const validation = await validateM3uUrl(source.url);

    if (validation.valid) {
      stillValid += 1;
      await db.discoveredSource.update({
        where: { url: source.url },
        data: {
          channelCount: validation.channelCount,
          lastChecked: new Date(),
        },
      });
    } else {
      newlyInvalid += 1;
      await db.discoveredSource.update({
        where: { url: source.url },
        data: {
          isValid: false,
          lastChecked: new Date(),
        },
      });
      await db.guardianSource.updateMany({
        where: { url: source.url },
        data: { enabled: false },
      });
    }

    await delay(250);
  }

  return { revalidated, stillValid, newlyInvalid };
}

export async function runDiscovery(trigger: 'scheduled' | 'manual' = 'scheduled') {
  if (isDiscovering) {
    return {
      status: 'already_running',
      message: 'Un descubrimiento ya está en progreso',
    };
  }

  isDiscovering = true;
  const startTime = Date.now();
  const engines = emptyEngines();

  try {
    const revalidation = await revalidateDiscoveredSources();
    const [guardianSources, discoveredSources] = await Promise.all([
      db.guardianSource.findMany({ select: { url: true } }),
      db.discoveredSource.findMany({
        select: { url: true },
        where: { isValid: true },
      }),
    ]);

    const existingUrls = new Set<string>();

    guardianSources.forEach((source) => existingUrls.add(normalizeUrl(source.url)));
    discoveredSources.forEach((source) => existingUrls.add(normalizeUrl(source.url)));

    engines.seed = await runSeedDiscovery(existingUrls);

    const totalNewSources = engines.seed.newSources;
    const totalDuration = Date.now() - startTime;

    lastDiscoveryResult = {
      status: 'completed',
      engines,
      totalNewSources,
      totalDuration,
      timestamp: new Date(),
    };

    console.info(
      `[Guardian Discovery] ${trigger} run completed: ${totalNewSources} new curated sources`
    );

    return {
      status: 'completed',
      mode: 'curated-public-sources',
      engines,
      revalidation,
      totalNewSources,
      totalDuration,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    const totalDuration = Date.now() - startTime;

    lastDiscoveryResult = {
      status: 'failed',
      engines,
      totalNewSources: 0,
      totalDuration,
      timestamp: new Date(),
    };

    console.error('[Guardian Discovery] Run failed:', error);

    return {
      status: 'failed',
      error: message,
      engines,
      totalDuration,
    };
  } finally {
    isDiscovering = false;
  }
}

export function getDiscoveryStatus() {
  return {
    isDiscovering,
    lastDiscovery: lastDiscoveryResult,
    mode: 'curated-public-sources',
  };
}

export async function getDiscoveredSources(options?: {
  validOnly?: boolean;
  limit?: number;
}) {
  const where: Record<string, unknown> = {};

  if (options?.validOnly) {
    where.isValid = true;
  }

  return db.discoveredSource.findMany({
    where,
    orderBy: { lastChecked: 'desc' },
    take: options?.limit || 200,
  });
}

export async function promoteToGuardian(url: string) {
  const discovered = await db.discoveredSource.findUnique({ where: { url } });

  if (!discovered) {
    return { success: false, error: 'Fuente no encontrada' };
  }

  try {
    const existing = await db.guardianSource.findFirst({ where: { url } });

    if (!existing) {
      await db.guardianSource.create({
        data: {
          name:
            discovered.name ||
            `Fuente pública: ${new URL(discovered.url).hostname}`,
          url: discovered.url,
          type: 'm3u',
          category: 'public',
          priority: 60,
          enabled: true,
        },
      });
    } else {
      await db.guardianSource.update({
        where: { id: existing.id },
        data: { enabled: true, updatedAt: new Date() },
      });
    }

    await db.discoveredSource.update({
      where: { url },
      data: { addedToGuardian: true },
    });

    return { success: true };
  } catch (error) {
    console.error('[Guardian Discovery] Promotion failed:', error);
    return { success: false, error: 'No se pudo promover la fuente' };
  }
}

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
    lastRun: lastDiscoveryResult,
    mode: 'curated-public-sources',
  };
}

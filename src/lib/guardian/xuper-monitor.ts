/**
 * Xuper TV Monitor - Monitoreo de infraestructura Xuper TV
 * Basado en el análisis de reverse engineering v6.5.0
 * 
 * Monitorea:
 * - 15 dominios conocidos (DNS + HTTP health)
 * - DCS endpoint (/api/v2/dcs/getAddr)
 * - Detección de cambios de IP
 * - Alertas automáticas
 */

import { db } from '@/lib/db';

// ===== Tipos =====

export interface DomainInfo {
  domain: string;
  service: string;
  role: 'primary' | 'backup';
  knownIPs: string[];
}

export interface EndpointInfo {
  path: string;
  method: string;
  version: string;
  category: string;
  description: string;
  encrypted: boolean;
}

export interface CheckResult {
  domain: string;
  service: string;
  role: 'primary' | 'backup';
  ips: string[];
  isUp: boolean;
  responseMs: number;
  changed: boolean;
  previousIPs: string[];
}

// ===== Datos conocidos del análisis RE =====

export const KNOWN_DOMAINS: DomainInfo[] = [
  { domain: 'dtgrd.txhnojlbu.com', service: 'portal', role: 'primary', knownIPs: ['104.18.18.217', '104.18.19.217'] },
  { domain: 'c2tgd.izvhrdcjb.com', service: 'portal', role: 'backup', knownIPs: ['104.21.76.18', '172.67.185.18'] },
  { domain: 'cdtgcr.bcjoapser.com', service: 'epg', role: 'primary', knownIPs: ['104.21.26.118', '172.67.168.69'] },
  { domain: 'bktjr.akvndhzgx.com', service: 'epg', role: 'backup', knownIPs: ['172.67.223.114', '104.21.91.151'] },
  { domain: 'g4tc2.irlapchbd.com', service: 'notice', role: 'primary', knownIPs: [] },
  { domain: 'ckfdr.nzxgfvrud.com', service: 'notice', role: 'backup', knownIPs: ['104.21.65.254', '172.67.196.170'] },
  { domain: 'c2tgd3.ewzpuscyv.com', service: 'bigbee', role: 'primary', knownIPs: ['104.21.82.53', '172.67.196.17'] },
  { domain: 'skvbv.hbcpdutka.com', service: 'bigbee', role: 'backup', knownIPs: [] },
  { domain: 'skc2r.plracsimf.com', service: 'ads', role: 'primary', knownIPs: [] },
  { domain: 'jktgk.bxtzwlyan.com', service: 'ads', role: 'backup', knownIPs: [] },
  { domain: 'bg4gr.msfxethyc.com', service: 'h5', role: 'primary', knownIPs: ['104.18.18.217', '104.18.19.217'] },
  { domain: 'jktgr.ludgwoxhe.com', service: 'upgrade', role: 'primary', knownIPs: [] },
  { domain: 'vtgrc.ncimxztfk.com', service: 'upgrade', role: 'backup', knownIPs: [] },
  { domain: 'cftpbe.39114gi1.com', service: 'cdn', role: 'primary', knownIPs: [] },
  { domain: 'www.magistvec.com', service: 'download', role: 'primary', knownIPs: [] },
];

export const KNOWN_ENDPOINTS: EndpointInfo[] = [
  // Content & Catalog
  { path: '/api/portalCore/getHome', method: 'POST', version: 'v1', category: 'content', description: 'Home screen content layout', encrypted: true },
  { path: '/api/portalCore/v3/getColumnContents', method: 'POST', version: 'v3', category: 'content', description: 'Channel/category contents', encrypted: true },
  { path: '/api/portalCore/getNextColumns', method: 'POST', version: 'v1', category: 'content', description: 'Subcategory navigation', encrypted: true },
  { path: '/api/portalCore/v4/getItemData', method: 'POST', version: 'v4', category: 'content', description: 'Detailed item metadata', encrypted: true },
  { path: '/api/portalCore/v3/getProgram', method: 'POST', version: 'v3', category: 'content', description: 'Program/EPG data', encrypted: true },
  { path: '/api/portalCore/v3/searchByName', method: 'POST', version: 'v3', category: 'content', description: 'Search by name', encrypted: true },
  { path: '/api/portalCore/v3/searchByContent', method: 'POST', version: 'v3', category: 'content', description: 'Search by content', encrypted: true },
  { path: '/api/portalCore/blSearchByContent', method: 'POST', version: 'v1', category: 'content', description: 'Broad search', encrypted: true },
  { path: '/api/portalCore/v3/filterGenre', method: 'POST', version: 'v3', category: 'content', description: 'Filter by genre', encrypted: true },
  { path: '/api/portalCore/v3/filterByContent', method: 'POST', version: 'v3', category: 'content', description: 'Filter by content type', encrypted: true },
  { path: '/api/portalCore/v3/getRecommends', method: 'POST', version: 'v3', category: 'content', description: 'Content recommendations', encrypted: true },
  { path: '/api/portalCore/getShortVideo', method: 'POST', version: 'v1', category: 'content', description: 'Short video content', encrypted: true },
  { path: '/api/portalCore/config/get', method: 'POST', version: 'v1', category: 'content', description: 'App configuration', encrypted: false },
  // Streaming
  { path: '/api/portalCore/v10/startPlayVOD', method: 'POST', version: 'v10', category: 'streaming', description: 'Start VOD stream', encrypted: true },
  { path: '/api/portalCore/v4/startPlayLive', method: 'POST', version: 'v4', category: 'streaming', description: 'Start live stream', encrypted: true },
  { path: '/api/portalCore/v6/getLiveData', method: 'POST', version: 'v6', category: 'streaming', description: 'Live channel data', encrypted: true },
  { path: '/api/portalCore/v5/heartbeat', method: 'POST', version: 'v5', category: 'streaming', description: 'Playback heartbeat', encrypted: true },
  // Auth
  { path: '/api/portalCore/v8/login', method: 'POST', version: 'v8', category: 'auth', description: 'Email/phone login', encrypted: true },
  { path: '/api/portalCore/v7/login/thirdpart', method: 'POST', version: 'v7', category: 'auth', description: 'Third-party login', encrypted: true },
  { path: '/api/portalCore/v3/snToken', method: 'POST', version: 'v3', category: 'auth', description: 'SN-based token auth', encrypted: true },
  { path: '/api/portalCore/v8/active', method: 'POST', version: 'v8', category: 'auth', description: 'Device activation', encrypted: true },
  { path: '/api/portalCore/v5/loginOut', method: 'POST', version: 'v5', category: 'auth', description: 'Logout', encrypted: true },
  { path: '/api/portalCore/v9/getAuthInfo', method: 'POST', version: 'v9', category: 'auth', description: 'Get auth info', encrypted: true },
  // Account
  { path: '/api/portalCore/bindPhone', method: 'POST', version: 'v1', category: 'account', description: 'Bind phone number', encrypted: true },
  { path: '/api/portalCore/v2/bindEmail', method: 'POST', version: 'v2', category: 'account', description: 'Bind email', encrypted: true },
  { path: '/api/portalCore/getBindInfo', method: 'POST', version: 'v1', category: 'account', description: 'Get bind info', encrypted: true },
  // Subscriptions
  { path: '/api/portalCore/package/getPackageCustomization', method: 'POST', version: 'v1', category: 'subs', description: 'Get subscription packages', encrypted: true },
  { path: '/api/portalCore/package/getOrderInfo', method: 'POST', version: 'v1', category: 'subs', description: 'Get order info', encrypted: true },
  { path: '/api/portalCore/v5/exchange', method: 'POST', version: 'v5', category: 'subs', description: 'Exchange code', encrypted: true },
  { path: '/api/subs/terminal/metadata', method: 'POST', version: 'v1', category: 'subs', description: 'Subscription metadata', encrypted: true },
  // Favorites
  { path: '/api/portalCore/v2/addFavorite', method: 'POST', version: 'v2', category: 'favorites', description: 'Add to favorites', encrypted: true },
  { path: '/api/portalCore/delFavorite', method: 'POST', version: 'v1', category: 'favorites', description: 'Remove from favorites', encrypted: true },
  { path: '/api/portalCore/getFavorite', method: 'POST', version: 'v1', category: 'favorites', description: 'Get favorites list', encrypted: true },
  // EPG & Sports
  { path: '/api/portalCore/epg/v2/getShelveMatch', method: 'GET', version: 'v2', category: 'epg', description: 'Shelved matches', encrypted: false },
  { path: '/api/portalCore/epg/v2/getAllMatch', method: 'GET', version: 'v2', category: 'epg', description: 'All matches', encrypted: false },
  { path: '/api/portalCore/epg/v3/getFootballMatch', method: 'GET', version: 'v3', category: 'epg', description: 'Football matches by date', encrypted: false },
  { path: '/api/portalCore/epg/v5/getNearestMatch', method: 'GET', version: 'v5', category: 'epg', description: 'Nearest match', encrypted: false },
  // Device
  { path: '/api/portalCore/device-management/getDevice', method: 'POST', version: 'v1', category: 'device', description: 'Get device info', encrypted: true },
  { path: '/api/portalCore/device/updateOrInsert', method: 'PUT', version: 'v1', category: 'device', description: 'Register/update device', encrypted: true },
  // Feedback
  { path: '/api/portalCore/feedback/getCustomerService', method: 'POST', version: 'v1', category: 'feedback', description: 'Get customer service', encrypted: false },
  { path: '/api/portalCore/feedback/userFeedBack', method: 'POST', version: 'v1', category: 'feedback', description: 'Submit feedback', encrypted: false },
  // DCS
  { path: '/api/v2/dcs/getAddr', method: 'POST', version: 'v2', category: 'dcs', description: 'Get domain addresses', encrypted: true },
  { path: '/api/configCenter/config/get', method: 'POST', version: 'v1', category: 'dcs', description: 'Get app config', encrypted: true },
  // Misc
  { path: '/api/portalCore/qr/getResult', method: 'POST', version: 'v1', category: 'misc', description: 'Get QR scan result', encrypted: true },
  { path: '/api/portalCore/getTop', method: 'POST', version: 'v1', category: 'misc', description: 'Top rankings', encrypted: true },
  { path: '/api/portalCore/v14/getSlbInfo', method: 'POST', version: 'v14', category: 'misc', description: 'SLB info v14', encrypted: true },
  { path: '/api/portalCore/v3/getShelveData', method: 'POST', version: 'v3', category: 'misc', description: 'Shelve data', encrypted: true },
];

export const SERVICE_COLORS: Record<string, string> = {
  portal: '#8b5cf6',
  epg: '#06b6d4',
  notice: '#f59e0b',
  bigbee: '#ec4899',
  ads: '#ef4444',
  h5: '#22c55e',
  upgrade: '#f97316',
  cdn: '#3b82f6',
  download: '#6366f1',
};

export const SERVICE_LABELS: Record<string, string> = {
  portal: 'Portal API',
  epg: 'EPG',
  notice: 'Notificaciones',
  bigbee: 'Analytics',
  ads: 'Ads',
  h5: 'Web H5',
  upgrade: 'Updates',
  cdn: 'CDN Imagenes',
  download: 'Download',
};

// ===== Estado global =====
let isChecking = false;
let lastCheckResult: {
  status: string;
  totalDomains: number;
  upDomains: number;
  downDomains: number;
  changedIPs: number;
  dcsSuccess: boolean;
  newAlerts: string[];
  timestamp: Date;
} | null = null;

// ===== Resolución DNS vía DoH =====

async function resolveDNS(domain: string): Promise<string[]> {
  const ips: string[] = [];
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
      { headers: { accept: 'application/dns-json' } }
    );
    const data = await res.json();
    if (data.Answer) {
      for (const answer of data.Answer) {
        if (answer.type === 1 && answer.data) {
          ips.push(answer.data);
        }
      }
    }
  } catch {
    try {
      const res = await fetch(
        `https://dns.google/resolve?name=${domain}&type=A`
      );
      const data = await res.json();
      if (data.Answer) {
        for (const answer of data.Answer) {
          if (answer.type === 1 && answer.data) {
            ips.push(answer.data);
          }
        }
      }
    } catch {
      // DNS resolution failed
    }
  }
  return ips;
}

// ===== Chequeo HTTP =====

async function checkHTTP(domain: string): Promise<{ isUp: boolean; responseMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`http://${domain}/`, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual',
    });
    clearTimeout(timeout);
    return { isUp: res.status < 500, responseMs: Date.now() - start };
  } catch {
    return { isUp: false, responseMs: Date.now() - start };
  }
}

// ===== Chequeo de todos los dominios =====

export async function checkAllDomains(knownPreviousIPs?: Record<string, string[]>): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (let i = 0; i < KNOWN_DOMAINS.length; i += 5) {
    const batch = KNOWN_DOMAINS.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map(async (d: DomainInfo) => {
        const [ips, httpCheck] = await Promise.all([
          resolveDNS(d.domain),
          checkHTTP(d.domain),
        ]);
        const prevIPs = knownPreviousIPs?.[d.domain] || d.knownIPs;
        const changed = prevIPs.length > 0 &&
          ips.length > 0 &&
          JSON.stringify(ips.sort()) !== JSON.stringify(prevIPs.sort());

        return {
          domain: d.domain,
          service: d.service,
          role: d.role,
          ips,
          isUp: httpCheck.isUp || ips.length > 0,
          responseMs: httpCheck.responseMs,
          changed,
          previousIPs: prevIPs,
        };
      })
    );
    results.push(...batchResults);
  }

  return results;
}

// ===== Chequeo DCS =====

export async function checkDCS(): Promise<{
  success: boolean;
  data: string | null;
  responseMs: number;
  domain: string;
}> {
  const dcsDomains = ['dtgrd.txhnojlbu.com', 'c2tgd.izvhrdcjb.com'];

  for (const domain of dcsDomains) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`http://${domain}/api/v2/dcs/getAddr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8',
          'apk': 'com.msandroid.mobile',
          'apkVer': '60500',
        },
        body: JSON.stringify({ appId: '3' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const text = await res.text();
      return {
        success: res.status < 500,
        data: text,
        responseMs: Date.now() - start,
        domain,
      };
    } catch {
      continue;
    }
  }

  return { success: false, data: null, responseMs: 0, domain: '' };
}

// ===== Chequeo completo (para API y scheduler) =====

export async function runXuperMonitorCheck(trigger: 'scheduled' | 'manual' = 'scheduled') {
  if (isChecking) {
    return { status: 'already_running', message: 'Un chequeo Xuper ya está en progreso' };
  }

  const database = db;
  if (!database) {
    return { status: 'error', message: 'DATABASE_URL no configurada' };
  }

  isChecking = true;
  console.log(`[Xuper Monitor] Iniciando chequeo (${trigger})...`);

  try {
    // Obtener snapshots previos para detección de cambios
    const recentSnapshots = await database.xuperDomainSnapshot.findMany({
      where: { checkedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
      orderBy: { checkedAt: 'desc' },
    });

    const previousIPs: Record<string, string[]> = {};
    const seenDomains = new Set<string>();
    for (const snap of recentSnapshots) {
      if (!seenDomains.has(snap.domain)) {
        seenDomains.add(snap.domain);
        try {
          previousIPs[snap.domain] = JSON.parse(snap.ipAddresses);
        } catch {
          previousIPs[snap.domain] = [];
        }
      }
    }

    // Ejecutar chequeos
    const results = await checkAllDomains(previousIPs);
    const dcsResult = await checkDCS();
    const newAlerts: string[] = [];
    const now = new Date();

    // Guardar snapshots y alertas
    for (const result of results) {
      await database.xuperDomainSnapshot.create({
        data: {
          domain: result.domain,
          service: result.service,
          role: result.role,
          ipAddresses: JSON.stringify(result.ips),
          isUp: result.isUp,
          responseMs: result.responseMs,
          checkedAt: now,
        },
      });

      if (result.changed) {
        await database.xuperAlert.create({
          data: {
            type: 'domain_change',
            severity: 'warning',
            title: `IP changed: ${result.domain}`,
            description: `${result.service} (${result.role}) IP changed from ${result.previousIPs.join(', ')} to ${result.ips.join(', ')}`,
          },
        });
        newAlerts.push(`${result.domain}: IP changed`);
      }

      if (!result.isUp && result.previousIPs.length > 0) {
        await database.xuperAlert.create({
          data: {
            type: 'endpoint_down',
            severity: 'critical',
            title: `Domain down: ${result.domain}`,
            description: `${result.service} (${result.role}) is not responding`,
          },
        });
        newAlerts.push(`${result.domain}: DOWN`);
      }
    }

    // Guardar DCS response
    if (dcsResult.success && dcsResult.data) {
      const lastDCS = await database.xuperDCSResponse.findFirst({
        orderBy: { fetchedAt: 'desc' },
      });

      const changed = lastDCS ? lastDCS.rawData !== dcsResult.data : false;

      await database.xuperDCSResponse.create({
        data: {
          rawData: dcsResult.data,
          domainCount: dcsResult.data.length,
          changed,
          diffSummary: changed ? 'DCS response differs from previous snapshot' : null,
          fetchedAt: now,
        },
      });

      if (changed) {
        await database.xuperAlert.create({
          data: {
            type: 'dcs_change',
            severity: 'warning',
            title: 'DCS response changed',
            description: 'The Domain Configuration Service returned different data. Domains may have been rotated.',
          },
        });
        newAlerts.push('DCS: Response changed');
      }
    }

    // Limpiar snapshots antiguos (mantener solo últimos 7 días)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    try {
      await database.xuperDomainSnapshot.deleteMany({
        where: { checkedAt: { lt: sevenDaysAgo } },
      });
    } catch { /* ignore cleanup errors */ }

    const upDomains = results.filter(r => r.isUp).length;
    const downDomains = results.filter(r => !r.isUp).length;
    const changedIPs = results.filter(r => r.changed).length;

    lastCheckResult = {
      status: 'completed',
      totalDomains: results.length,
      upDomains,
      downDomains,
      changedIPs,
      dcsSuccess: dcsResult.success,
      newAlerts,
      timestamp: new Date(),
    };

    console.log(`[Xuper Monitor] Chequeo completado: ${upDomains}/${results.length} up, ${changedIPs} IPs cambiadas, ${newAlerts.length} alertas`);

    return {
      status: 'completed',
      checkedAt: now.toISOString(),
      domains: results,
      dcs: dcsResult,
      newAlerts,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[Xuper Monitor] Error en chequeo:', errorMsg);
    lastCheckResult = {
      status: 'failed',
      totalDomains: 0,
      upDomains: 0,
      downDomains: 0,
      changedIPs: 0,
      dcsSuccess: false,
      newAlerts: [],
      timestamp: new Date(),
    };
    return { status: 'failed', error: errorMsg };
  } finally {
    isChecking = false;
  }
}

// ===== Obtener estado actual del monitor =====

export async function getXuperMonitorStatus() {
  const database = db;
  if (!database) {
    return {
      domains: [],
      alerts: [],
      dcsHistory: [],
      stats: { totalDomains: 0, upDomains: 0, downDomains: 0, unreadAlerts: 0, lastCheck: null },
      isChecking,
      lastCheck: lastCheckResult,
    };
  }

  // Obtener último snapshot por dominio
  const allSnapshots = await database.xuperDomainSnapshot.findMany({
    orderBy: { checkedAt: 'desc' },
    take: 100,
  });

  const latestByDomain = new Map<string, typeof allSnapshots[0]>();
  for (const snap of allSnapshots) {
    if (!latestByDomain.has(snap.domain)) {
      latestByDomain.set(snap.domain, snap);
    }
  }

  const domains = Array.from(latestByDomain.values()).map(s => ({
    id: s.id,
    domain: s.domain,
    service: s.service,
    role: s.role,
    ipAddresses: JSON.parse(s.ipAddresses || '[]'),
    isUp: s.isUp,
    responseMs: s.responseMs,
    checkedAt: s.checkedAt.toISOString(),
  }));

  const alerts = await database.xuperAlert.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const dcsHistory = await database.xuperDCSResponse.findMany({
    orderBy: { fetchedAt: 'desc' },
    take: 10,
    select: { id: true, changed: true, diffSummary: true, fetchedAt: true },
  });

  const totalDomains = domains.length;
  const upDomains = domains.filter(d => d.isUp).length;
  const downDomains = totalDomains - upDomains;
  const unreadAlerts = alerts.filter(a => !a.isRead).length;

  return {
    domains,
    alerts: alerts.map(a => ({
      ...a,
      isRead: a.isRead,
      createdAt: a.createdAt.toISOString(),
    })),
    dcsHistory: dcsHistory.map(d => ({
      ...d,
      fetchedAt: d.fetchedAt.toISOString(),
    })),
    stats: {
      totalDomains,
      upDomains,
      downDomains,
      unreadAlerts,
      lastCheck: allSnapshots[0]?.checkedAt?.toISOString() || null,
    },
    isChecking,
    lastCheck: lastCheckResult,
  };
}

// ===== Alertas =====

export async function getXuperAlerts(limit = 50) {
  const database = db;
  if (!database) return [];
  return database.xuperAlert.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function markXuperAlertRead(id: string) {
  const database = db;
  if (!database) return;
  await database.xuperAlert.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllXuperAlertsRead() {
  const database = db;
  if (!database) return;
  await database.xuperAlert.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
}

export function getXuperMonitorChecking() {
  return isChecking;
}

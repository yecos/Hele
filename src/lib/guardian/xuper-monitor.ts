/**
 * Xuper Monitor - Monitoreo de servidores Xuper TV
 * 
 * Se integra con el Guardian existente y monitorea:
 * 1. DCS - Disponibilidad del servicio de configuración de dominios
 * 2. DNS-over-HTTPS - Resolución de dominios
 * 3. HTTP Health Check - Verificación de endpoints
 * 
 * Portado desde el proyecto guar y mejorado con el cliente Xuper
 */

import { getXuperClient, encrypt3DES, decrypt3DES } from './xuper-client';

// ===== Tipos =====
export interface XuperDomainStatus {
  domain: string;
  type: string;
  ip: string;
  dnsOk: boolean;
  httpOk: boolean;
  latencyMs: number;
  lastChecked: string;
  error?: string;
}

export interface XuperMonitorResult {
  timestamp: string;
  dcsAvailable: boolean;
  domainsChecked: number;
  domainsOk: number;
  domains: XuperDomainStatus[];
  portalLatencyMs: number;
  configOk: boolean;
}

// ===== Dominios conocidos v6.5.0 =====
const KNOWN_DOMAINS = [
  // Portal API
  { domain: 'dtgrd.txhnojlbu.com', type: 'portal', expectedIps: ['104.18.18.217', '104.18.19.217'] },
  { domain: 'c2tgd.izvhrdcjb.com', type: 'portal', expectedIps: ['104.18.18.217', '104.18.19.217'] },
  // EPG
  { domain: 'cdtgcr.bcjoapser.com', type: 'epg', expectedIps: ['104.21.26.118', '172.67.168.69'] },
  { domain: 'bktjr.akvndhzgx.com', type: 'epg', expectedIps: ['104.21.26.118', '172.67.168.69'] },
  // Notificaciones
  { domain: 'g4tc2.irlapchbd.com', type: 'notice', expectedIps: ['104.21.65.254'] },
  { domain: 'ckfdr.nzxgfvrud.com', type: 'notice', expectedIps: ['104.21.65.254'] },
  // Analytics
  { domain: 'c2tgd3.ewzpuscyv.com', type: 'analytics', expectedIps: ['104.21.82.53'] },
  { domain: 'skvbv.hbcpdutka.com', type: 'analytics', expectedIps: ['104.21.82.53'] },
  // Ads
  { domain: 'skc2r.plracsimf.com', type: 'ads', expectedIps: [] },
  { domain: 'jktgk.bxtzwlyan.com', type: 'ads', expectedIps: [] },
  // Web H5
  { domain: 'bg4gr.msfxethyc.com', type: 'webH5', expectedIps: ['104.18.18.217'] },
  // Upgrade
  { domain: 'jktgr.ludgwoxhe.com', type: 'upgrade', expectedIps: [] },
  { domain: 'vtgrc.ncimxztfk.com', type: 'upgrade', expectedIps: [] },
  // CDN
  { domain: 'cftpbe.39114gi1.com', type: 'cdn', expectedIps: [] },
  // Download
  { domain: 'www.magistvec.com', type: 'download', expectedIps: [] },
];

// ===== DNS-over-HTTPS =====
async function resolveDNS(domain: string): Promise<{ ip: string; ok: boolean; error?: string }> {
  // Probar Cloudflare primero, luego Google
  for (const resolver of ['cloudflare', 'google'] as const) {
    try {
      const url = resolver === 'cloudflare'
        ? `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`
        : `https://dns.google/resolve?name=${domain}&type=A`;
      
      const headers = resolver === 'cloudflare'
        ? { 'Accept': 'application/dns-json' }
        : {};

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const answers = data.Answer || [];
      const aRecord = answers.find((a: { type: number }) => a.type === 1);

      if (aRecord?.data) {
        return { ip: aRecord.data, ok: true };
      }
    } catch {
      continue;
    }
  }

  return { ip: '', ok: false, error: 'DNS resolution failed' };
}

// ===== HTTP Health Check =====
async function checkHTTP(domain: string, type: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    let url: string;
    let method: string;
    let body: string | undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json;charset=utf-8',
      'apk': 'com.msandroid.mobile',
      'apkVer': '60500',
    };

    if (type === 'portal') {
      // Check DCS endpoint
      url = `http://${domain}/api/v2/dcs/getAddr`;
      method = 'POST';
      body = JSON.stringify({ appId: '3' });
    } else if (type === 'epg') {
      // Check EPG endpoint (no encriptado)
      url = `http://${domain}/api/portalCore/epg/get`;
      method = 'GET';
    } else {
      // Generic HTTP check
      url = `http://${domain}/`;
      method = 'GET';
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(8000),
    });

    const latencyMs = Date.now() - startTime;

    if (response.ok || response.status === 401) {
      // 401 means server is up, just needs auth
      return { ok: true, latencyMs };
    }

    return { ok: false, latencyMs, error: `HTTP ${response.status}` };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return { 
      ok: false, 
      latencyMs, 
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

// ===== Monitoreo completo =====
export async function runXuperMonitor(): Promise<XuperMonitorResult> {
  const timestamp = new Date().toISOString();
  const domainStatuses: XuperDomainStatus[] = [];
  let dcsAvailable = false;
  let portalLatencyMs = 0;
  let configOk = false;

  // 1. Test DCS
  try {
    const client = getXuperClient();
    const domains = await client.resolveDomains(true);
    dcsAvailable = domains.size > 0;
  } catch {
    dcsAvailable = false;
  }

  // 2. Test Portal config (no encriptado)
  try {
    const client = getXuperClient();
    const config = await client.getConfig();
    configOk = config !== null;
  } catch {
    configOk = false;
  }

  // 3. Check cada dominio conocido
  for (const knownDomain of KNOWN_DOMAINS) {
    // DNS check
    const dns = await resolveDNS(knownDomain.domain);
    
    // HTTP check (only if DNS resolved or always for known CDN domains)
    const http = await checkHTTP(knownDomain.domain, knownDomain.type);
    
    // Track portal latency
    if (knownDomain.type === 'portal' && http.ok) {
      portalLatencyMs = portalLatencyMs === 0 ? http.latencyMs : Math.min(portalLatencyMs, http.latencyMs);
    }

    domainStatuses.push({
      domain: knownDomain.domain,
      type: knownDomain.type,
      ip: dns.ip,
      dnsOk: dns.ok,
      httpOk: http.ok,
      latencyMs: http.latencyMs,
      lastChecked: timestamp,
      error: http.error || dns.error,
    });
  }

  const domainsOk = domainStatuses.filter(d => d.httpOk).length;

  return {
    timestamp,
    dcsAvailable,
    domainsChecked: domainStatuses.length,
    domainsOk,
    domains: domainStatuses,
    portalLatencyMs,
    configOk,
  };
}

// ===== Quick check (solo dominios críticos) =====
export async function quickXuperCheck(): Promise<{
  available: boolean;
  portalOk: boolean;
  dcsOk: boolean;
  latencyMs: number;
  activePortal: string;
}> {
  const client = getXuperClient();

  // DCS check
  let dcsOk = false;
  let activePortal = '';
  try {
    const domains = await client.resolveDomains();
    dcsOk = domains.size > 0;
    activePortal = domains.get('portal') || '';
  } catch {
    dcsOk = false;
  }

  // Portal health check
  let portalOk = false;
  let latencyMs = 0;
  if (activePortal) {
    const start = Date.now();
    try {
      const response = await fetch(`${activePortal}/api/portalCore/config/get`, {
        headers: {
          'apk': 'com.msandroid.mobile',
          'apkVer': '60500',
        },
        signal: AbortSignal.timeout(5000),
      });
      portalOk = response.ok;
      latencyMs = Date.now() - start;
    } catch {
      latencyMs = Date.now() - start;
      portalOk = false;
    }
  }

  return {
    available: dcsOk && portalOk,
    portalOk,
    dcsOk,
    latencyMs,
    activePortal,
  };
}

// ===== Obtener los dominios activos del DCS como canales =====
export async function getXuperLiveChannels(): Promise<Array<{
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
  source: string;
}>> {
  const client = getXuperClient();
  
  try {
    // Intentar obtener canales via API
    const home = await client.getHome();
    
    if (home.length > 0) {
      // Convertir categorías Xuper al formato de canales IPTV
      const channels: Array<{
        id: string;
        name: string;
        logo: string;
        group: string;
        url: string;
        source: string;
      }> = [];

      for (const category of home) {
        for (const ch of category.channels) {
          channels.push({
            id: `xuper-${ch.id}`,
            name: ch.name,
            logo: ch.logo || '',
            group: category.name,
            url: '', // Se obtiene con startPlayLive
            source: 'xuper',
          });
        }
      }

      return channels;
    }
  } catch (err) {
    console.warn('[XuperMonitor] No se pudieron obtener canales via API:', err);
  }

  return [];
}

// ===== Estado del monitor =====
let lastMonitorResult: XuperMonitorResult | null = null;

export function getLastMonitorResult(): XuperMonitorResult | null {
  return lastMonitorResult;
}

export function setLastMonitorResult(result: XuperMonitorResult): void {
  lastMonitorResult = result;
}

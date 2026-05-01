/**
 * Xuper TV Client - Cliente completo para acceder a los servidores Xuper TV
 * Basado en el análisis de reverse engineering v6.5.0
 *
 * Capacidades:
 * - Consulta DCS para obtener dominios activos
 * - Encriptación/desencriptación 3DES/ECB/PKCS5
 * - Login y gestión de tokens
 * - Llamadas a APIs de contenido, streaming, auth, etc.
 * - Integración con el monitor para elegir el mejor servidor
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { getXuperMonitorStatus, KNOWN_DOMAINS, type DomainInfo, type EndpointInfo, KNOWN_ENDPOINTS } from './xuper-monitor';

// ===== Configuración =====

/** Clave 3DES por defecto (24 bytes para 3DES-168). Se puede sobreescribir con env var. */
const XUPER_3DES_KEY = process.env.XUPER_3DES_KEY || 'xup3rstr3@m6.5.0!!key2024';
const XUPER_APP_PACKAGE = 'com.msandroid.mobile';
const XUPER_APP_VERSION = '60500';
const XUPER_APP_ID = '3';
const REQUEST_TIMEOUT = 15000;

// ===== Tipos =====

export interface XuperSession {
  token: string;
  userId: string;
  domain: string;
  loggedAt: string;
  expiresAt?: string;
}

export interface XuperDCSResult {
  success: boolean;
  domain: string;
  data: any;
  responseMs: number;
  domains?: Record<string, string>; // Mapa de servicio → dominio
}

export interface XuperAPIResponse {
  success: boolean;
  encrypted: boolean;
  raw?: string;
  data?: any;
  statusCode: number;
  endpoint: string;
  domain: string;
  responseMs: number;
}

export interface XuperLoginResult {
  success: boolean;
  session?: XuperSession;
  error?: string;
}

export interface XuperClientStatus {
  activeDomain: string | null;
  session: XuperSession | null;
  lastDCS: { domain: string; fetchedAt: string; domainCount: number } | null;
  availableDomains: { service: string; domain: string; isUp: boolean; responseMs: number }[];
}

// ===== Estado global =====

let activeDomain: string | null = null;
let currentSession: XuperSession | null = null;
let lastDCSResult: { domain: string; fetchedAt: string; domainCount: number; domains: Record<string, string> } | null = null;

// ===== Encriptación 3DES/ECB/PKCS5 =====

/**
 * Encripta un string usando 3DES/ECB/PKCS5Padding
 * Este es el formato que usa Xuper TV para los payloads de las APIs
 */
export function encrypt3DES(plaintext: string, key: string = XUPER_3DES_KEY): string {
  // Asegurar clave de 24 bytes para 3DES-168
  const keyBuffer = Buffer.alloc(24);
  Buffer.from(key, 'utf8').copy(keyBuffer, 0, 0, Math.min(key.length, 24));

  const cipher = createCipheriv('des-ede3-ecb', keyBuffer, null);
  cipher.setAutoPadding(true); // PKCS5/PKCS7 padding

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return encrypted.toString('base64');
}

/**
 * Desencripta un string en Base64 usando 3DES/ECB/PKCS5Padding
 */
export function decrypt3DES(ciphertext: string, key: string = XUPER_3DES_KEY): string {
  // Asegurar clave de 24 bytes
  const keyBuffer = Buffer.alloc(24);
  Buffer.from(key, 'utf8').copy(keyBuffer, 0, 0, Math.min(key.length, 24));

  const decipher = createDecipheriv('des-ede3-ecb', keyBuffer, null);
  decipher.setAutoPadding(true);

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

// ===== Headers comunes =====

function getDefaultHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json;charset=utf-8',
    'apk': XUPER_APP_PACKAGE,
    'apkVer': XUPER_APP_VERSION,
    'User-Agent': 'okhttp/4.12.0',
  };

  // Agregar token de sesión si existe
  if (currentSession?.token) {
    headers['token'] = currentSession.token;
    headers['userId'] = currentSession.userId;
  }

  return headers;
}

// ===== Selección de dominio activo =====

/**
 * Selecciona el mejor dominio para hacer requests.
 * Usa datos del monitor si están disponibles, si no usa los dominios conocidos.
 */
export async function selectBestDomain(service: string = 'portal'): Promise<string> {
  // Si ya tenemos un dominio activo del DCS, usarlo
  if (lastDCSResult?.domains?.[service]) {
    return lastDCSResult.domains[service];
  }

  // Intentar usar datos del monitor
  try {
    const monitorStatus = await getXuperMonitorStatus();
    const serviceDomains = monitorStatus.domains.filter(
      d => d.service === service && d.isUp
    );

    if (serviceDomains.length > 0) {
      // Preferir primary, luego el de menor responseMs
      const primary = serviceDomains.find(d => d.role === 'primary');
      if (primary) return primary.domain;

      serviceDomains.sort((a, b) => a.responseMs - b.responseMs);
      return serviceDomains[0].domain;
    }
  } catch {
    // Monitor no disponible, continuar con fallback
  }

  // Fallback: usar dominios conocidos
  const known = KNOWN_DOMAINS.filter(d => d.service === service);
  if (known.length > 0) {
    return known[0].domain; // Primario
  }

  // Último recurso: portal primario
  return 'dtgrd.txhnojlbu.com';
}

/**
 * Consulta el DCS para obtener la lista de dominios activos.
 * Este es el endpoint de bootstrap que la app usa al iniciar.
 */
export async function fetchDCS(): Promise<XuperDCSResult> {
  const dcsDomains = ['dtgrd.txhnojlbu.com', 'c2tgd.izvhrdcjb.com'];

  for (const domain of dcsDomains) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const res = await fetch(`http://${domain}/api/v2/dcs/getAddr`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify({ appId: XUPER_APP_ID }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const text = await res.text();
      const elapsed = Date.now() - start;

      if (res.status < 500) {
        let parsedData: any = text;
        let domainMap: Record<string, string> = {};

        // Intentar parsear como JSON
        try {
          parsedData = JSON.parse(text);

          // Si viene encriptado, desencriptar
          if (parsedData.data && typeof parsedData.data === 'string') {
            try {
              const decrypted = decrypt3DES(parsedData.data);
              parsedData = { ...parsedData, decryptedData: JSON.parse(decrypted) };
            } catch {
              // No se pudo desencriptar, usar datos crudos
            }
          }

          // Extraer mapa de dominios si viene en la respuesta
          if (parsedData?.decryptedData?.addrs) {
            for (const addr of parsedData.decryptedData.addrs) {
              if (addr.name && addr.addr) {
                domainMap[addr.name] = addr.addr;
              }
            }
          } else if (parsedData?.data?.addrs) {
            for (const addr of parsedData.data.addrs) {
              if (addr.name && addr.addr) {
                domainMap[addr.name] = addr.addr;
              }
            }
          }
        } catch {
          // No es JSON, mantener texto crudo
        }

        // Actualizar estado global
        lastDCSResult = {
          domain,
          fetchedAt: new Date().toISOString(),
          domainCount: Object.keys(domainMap).length,
          domains: domainMap,
        };

        // Si hay dominios del DCS, actualizar el dominio activo
        if (domainMap['portal']) {
          activeDomain = domainMap['portal'];
        } else {
          activeDomain = domain;
        }

        return {
          success: true,
          domain,
          data: parsedData,
          responseMs: elapsed,
          domains: domainMap,
        };
      }
    } catch {
      continue;
    }
  }

  return { success: false, domain: '', data: null, responseMs: 0 };
}

// ===== Llamada genérica a API =====

/**
 * Hace una llamada a un endpoint de la API de Xuper TV.
 * Maneja encriptación automáticamente si el endpoint lo requiere.
 */
export async function callXuperAPI(
  endpointPath: string,
  body: Record<string, any> = {},
  options: {
    service?: string;
    method?: string;
    encrypted?: boolean;
    domain?: string;
    decrypt?: boolean;
  } = {}
): Promise<XuperAPIResponse> {
  const {
    service = 'portal',
    method = 'POST',
    encrypted = true,
    decrypt = true,
  } = options;

  // Seleccionar dominio
  const domain = options.domain || await selectBestDomain(service);

  // Construir URL
  const url = `http://${domain}${endpointPath}`;

  // Preparar body
  let requestBody: string;
  let isEncrypted = false;

  if (encrypted && method === 'POST') {
    // Encriptar el payload con 3DES
    const jsonStr = JSON.stringify(body);
    const encryptedData = encrypt3DES(jsonStr);
    requestBody = JSON.stringify({ data: encryptedData });
    isEncrypted = true;
  } else {
    requestBody = JSON.stringify(body);
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const fetchOptions: RequestInit = {
      method,
      headers: getDefaultHeaders(),
      body: method !== 'GET' ? requestBody : undefined,
      signal: controller.signal,
    };

    const res = await fetch(url, fetchOptions);
    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    const text = await res.text();

    // Intentar parsear la respuesta
    let parsedData: any = text;
    let wasEncrypted = false;

    try {
      parsedData = JSON.parse(text);

      // Si la respuesta tiene campo "data" encriptado, desencriptar
      if (decrypt && parsedData.data && typeof parsedData.data === 'string') {
        try {
          const decrypted = decrypt3DES(parsedData.data);
          parsedData = {
            ...parsedData,
            decryptedData: JSON.parse(decrypted),
          };
          wasEncrypted = true;
        } catch {
          // No se pudo desencriptar, mantener datos crudos
        }
      }
    } catch {
      // No es JSON, mantener texto
    }

    return {
      success: res.status < 500,
      encrypted: wasEncrypted,
      raw: text,
      data: parsedData,
      statusCode: res.status,
      endpoint: endpointPath,
      domain,
      responseMs: elapsed,
    };
  } catch (error) {
    const elapsed = Date.now() - start;
    return {
      success: false,
      encrypted: false,
      statusCode: 0,
      endpoint: endpointPath,
      domain,
      responseMs: elapsed,
    };
  }
}

// ===== Login =====

/**
 * Login con SN (Serial Number) - El método principal de autenticación de Xuper
 * Los dispositivos Android usan el SN del hardware para autenticarse
 */
export async function loginWithSN(sn: string): Promise<XuperLoginResult> {
  try {
    const result = await callXuperAPI('/api/portalCore/v3/snToken', {
      sn,
      appId: XUPER_APP_ID,
      apkVer: XUPER_APP_VERSION,
    }, { encrypted: true });

    if (!result.success) {
      return { success: false, error: `HTTP ${result.statusCode}` };
    }

    // Extraer token de la respuesta
    const responseData = result.data?.decryptedData || result.data;
    const token = responseData?.token || responseData?.data?.token;
    const userId = responseData?.userId || responseData?.data?.userId || sn;

    if (!token) {
      return {
        success: false,
        error: 'No se recibió token en la respuesta. Puede que la encriptación key sea incorrecta.',
      };
    }

    // Guardar sesión
    currentSession = {
      token,
      userId: String(userId),
      domain: result.domain,
      loggedAt: new Date().toISOString(),
    };

    return { success: true, session: currentSession };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: msg };
  }
}

/**
 * Login con email/teléfono y contraseña
 */
export async function loginWithEmail(email: string, password: string): Promise<XuperLoginResult> {
  try {
    const result = await callXuperAPI('/api/portalCore/v8/login', {
      userName: email,
      password,
      appId: XUPER_APP_ID,
      apkVer: XUPER_APP_VERSION,
    }, { encrypted: true });

    if (!result.success) {
      return { success: false, error: `HTTP ${result.statusCode}` };
    }

    const responseData = result.data?.decryptedData || result.data;
    const token = responseData?.token || responseData?.data?.token;
    const userId = responseData?.userId || responseData?.data?.userId;

    if (!token) {
      return {
        success: false,
        error: 'No se recibió token en la respuesta. Puede que la encriptación key sea incorrecta.',
      };
    }

    currentSession = {
      token,
      userId: String(userId),
      domain: result.domain,
      loggedAt: new Date().toISOString(),
    };

    return { success: true, session: currentSession };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: msg };
  }
}

/**
 * Login con device activation - Para activar un dispositivo nuevo
 */
export async function activateDevice(deviceId: string, mac?: string): Promise<XuperLoginResult> {
  try {
    const result = await callXuperAPI('/api/portalCore/v8/active', {
      sn: deviceId,
      mac: mac || '',
      appId: XUPER_APP_ID,
      apkVer: XUPER_APP_VERSION,
    }, { encrypted: true });

    if (!result.success) {
      return { success: false, error: `HTTP ${result.statusCode}` };
    }

    const responseData = result.data?.decryptedData || result.data;
    const token = responseData?.token || responseData?.data?.token;
    const userId = responseData?.userId || responseData?.data?.userId || deviceId;

    if (!token) {
      return {
        success: false,
        error: 'No se recibió token. Puede que la encriptación key sea incorrecta.',
      };
    }

    currentSession = {
      token,
      userId: String(userId),
      domain: result.domain,
      loggedAt: new Date().toISOString(),
    };

    return { success: true, session: currentSession };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: msg };
  }
}

// ===== APIs de Contenido =====

/** Obtener la pantalla de inicio (home) */
export async function getHome() {
  return callXuperAPI('/api/portalCore/getHome', {
    appId: XUPER_APP_ID,
  });
}

/** Obtener contenido de una columna/categoría */
export async function getColumnContents(columnId: string, page: number = 1, pageSize: number = 20) {
  return callXuperAPI('/api/portalCore/v3/getColumnContents', {
    columnId,
    page,
    pageSize,
  });
}

/** Obtener metadata detallada de un item */
export async function getItemData(itemId: string) {
  return callXuperAPI('/api/portalCore/v4/getItemData', {
    itemId,
  });
}

/** Buscar por nombre */
export async function searchByName(keyword: string, page: number = 1, pageSize: number = 20) {
  return callXuperAPI('/api/portalCore/v3/searchByName', {
    keyword,
    page,
    pageSize,
  });
}

/** Filtrar por género */
export async function filterGenre(genreId: string, page: number = 1, pageSize: number = 20) {
  return callXuperAPI('/api/portalCore/v3/filterGenre', {
    genreId,
    page,
    pageSize,
  });
}

/** Obtener recomendaciones */
export async function getRecommends(itemId: string) {
  return callXuperAPI('/api/portalCore/v3/getRecommends', {
    itemId,
  });
}

/** Obtener configuración de la app (sin encriptar) */
export async function getAppConfig() {
  return callXuperAPI('/api/portalCore/config/get', {}, { encrypted: false });
}

// ===== APIs de Streaming =====

/** Iniciar reproducción VOD (película/serie) */
export async function startPlayVOD(itemId: string, episodeId?: string) {
  return callXuperAPI('/api/portalCore/v10/startPlayVOD', {
    itemId,
    episodeId: episodeId || '',
    playType: '0',
  });
}

/** Iniciar reproducción en vivo */
export async function startPlayLive(channelId: string) {
  return callXuperAPI('/api/portalCore/v4/startPlayLive', {
    channelId,
  });
}

/** Obtener datos de canal en vivo */
export async function getLiveData(channelId: string) {
  return callXuperAPI('/api/portalCore/v6/getLiveData', {
    channelId,
  });
}

/** Enviar heartbeat para mantener sesión de reproducción */
export async function sendHeartbeat(playId: string, itemId: string) {
  return callXuperAPI('/api/portalCore/v5/heartbeat', {
    playId,
    itemId,
  });
}

// ===== APIs de EPG =====

/** Obtener programación */
export async function getProgram(channelId: string, date: string) {
  return callXuperAPI('/api/portalCore/v3/getProgram', {
    channelId,
    date,
  });
}

/** Obtener partidos de fútbol */
export async function getFootballMatch(date: string) {
  return callXuperAPI('/api/portalCore/epg/v3/getFootballMatch', {}, {
    encrypted: false,
    method: 'GET',
  });
}

// ===== APIs de Suscripción =====

/** Obtener paquetes de suscripción */
export async function getSubscriptionPackages() {
  return callXuperAPI('/api/portalCore/package/getPackageCustomization', {
    appId: XUPER_APP_ID,
  });
}

/** Canjear código de exchange */
export async function exchangeCode(code: string) {
  return callXuperAPI('/api/portalCore/v5/exchange', {
    code,
  });
}

// ===== APIs de Favoritos =====

/** Agregar a favoritos */
export async function addFavorite(itemId: string) {
  return callXuperAPI('/api/portalCore/v2/addFavorite', {
    itemId,
  });
}

/** Obtener favoritos */
export async function getFavorites() {
  return callXuperAPI('/api/portalCore/getFavorite', {});
}

/** Eliminar de favoritos */
export async function removeFavorite(itemId: string) {
  return callXuperAPI('/api/portalCore/delFavorite', {
    itemId,
  });
}

// ===== APIs de Dispositivo =====

/** Obtener info del dispositivo */
export async function getDeviceInfo() {
  return callXuperAPI('/api/portalCore/device-management/getDevice', {});
}

/** Registrar/actualizar dispositivo */
export async function registerDevice(deviceInfo: Record<string, string>) {
  return callXuperAPI('/api/portalCore/device/updateOrInsert', deviceInfo, {
    method: 'PUT',
  });
}

// ===== Utilidades =====

/** Obtener el estado actual del cliente */
export function getXuperClientStatus(): XuperClientStatus {
  return {
    activeDomain,
    session: currentSession,
    lastDCS: lastDCSResult ? {
      domain: lastDCSResult.domain,
      fetchedAt: lastDCSResult.fetchedAt,
      domainCount: lastDCSResult.domainCount,
    } : null,
    availableDomains: lastDCSResult?.domains
      ? Object.entries(lastDCSResult.domains).map(([service, domain]) => ({
          service,
          domain,
          isUp: true,
          responseMs: 0,
        }))
      : [],
  };
}

/** Establecer sesión manualmente (para restaurar desde DB) */
export function setXuperSession(session: XuperSession) {
  currentSession = session;
  activeDomain = session.domain;
}

/** Cerrar sesión */
export function logoutXuper() {
  currentSession = null;
  activeDomain = null;
}

/** Obtener lista de endpoints conocidos */
export function getKnownEndpoints(): EndpointInfo[] {
  return KNOWN_ENDPOINTS;
}

/** Obtener lista de dominios conocidos */
export function getKnownDomains(): DomainInfo[] {
  return KNOWN_DOMAINS;
}

/**
 * Probar la encriptación/desencriptación 3DES
 * Útil para verificar que la clave es correcta
 */
export function testEncryption(): { original: string; encrypted: string; decrypted: string; match: boolean } {
  const original = JSON.stringify({ test: 'hello', appId: '3', ts: Date.now() });
  const encrypted = encrypt3DES(original);
  const decrypted = decrypt3DES(encrypted);
  return {
    original,
    encrypted,
    decrypted,
    match: original === decrypted,
  };
}

/**
 * Probar un endpoint específico sin encriptación
 * Para diagnóstico y debugging
 */
export async function probeEndpoint(
  domain: string,
  path: string,
  method: string = 'POST',
  body: Record<string, any> = {}
): Promise<XuperAPIResponse> {
  const url = `http://${domain}${path}`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const res = await fetch(url, {
      method,
      headers: getDefaultHeaders(),
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const text = await res.text();
    const elapsed = Date.now() - start;

    let parsedData: any = text;
    try {
      parsedData = JSON.parse(text);
    } catch {}

    return {
      success: res.status < 500,
      encrypted: false,
      raw: text,
      data: parsedData,
      statusCode: res.status,
      endpoint: path,
      domain,
      responseMs: elapsed,
    };
  } catch (error) {
    return {
      success: false,
      encrypted: false,
      statusCode: 0,
      endpoint: path,
      domain,
      responseMs: Date.now() - start,
    };
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import {
  fetchDCS,
  loginWithSN,
  loginWithEmail,
  activateDevice,
  getHome,
  getColumnContents,
  getItemData,
  searchByName,
  startPlayVOD,
  startPlayLive,
  getLiveData,
  sendHeartbeat,
  getAppConfig,
  getSubscriptionPackages,
  getFavorites,
  addFavorite,
  removeFavorite,
  getProgram,
  getFootballMatch,
  callXuperAPI,
  probeEndpoint,
  getXuperClientStatus,
  logoutXuper,
  testEncryption,
  getKnownEndpoints,
  getKnownDomains,
  setXuperSession,
  encrypt3DES,
  decrypt3DES,
} from '@/lib/guardian/xuper-client';
import { db } from '@/lib/db';

export const maxDuration = 60;

/**
 * GET /api/guardian/xuper/client - Obtener estado del cliente Xuper
 */
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);

    const status = getXuperClientStatus();
    const endpoints = getKnownEndpoints();
    const domains = getKnownDomains();
    const encryptionTest = testEncryption();

    return NextResponse.json({
      success: true,
      status,
      endpoints,
      domains,
      encryptionTest,
      config: {
        has3DESKey: !!process.env.XUPER_3DES_KEY,
        appPackage: 'com.msandroid.mobile',
        appVersion: '60500',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    if (msg.includes('denegado') || msg.includes('token')) {
      return NextResponse.json({ success: false, error: msg }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: msg });
  }
}

/**
 * POST /api/guardian/xuper/client - Ejecutar acciones del cliente Xuper
 *
 * Acciones disponibles:
 * - fetchDCS: Consultar Domain Configuration Service
 * - loginSN: Login con Serial Number
 * - loginEmail: Login con email/contraseña
 * - activateDevice: Activar dispositivo
 * - logout: Cerrar sesión
 * - getHome: Obtener pantalla de inicio
 * - getColumnContents: Obtener contenido de categoría
 * - getItemData: Obtener metadata de item
 * - searchByName: Buscar por nombre
 * - startPlayVOD: Iniciar reproducción VOD
 * - startPlayLive: Iniciar reproducción en vivo
 * - getLiveData: Obtener datos de canal en vivo
 * - heartbeat: Enviar heartbeat
 * - getAppConfig: Obtener config de la app
 * - getSubscriptions: Obtener paquetes de suscripción
 * - getFavorites: Obtener favoritos
 * - addFavorite: Agregar a favoritos
 * - removeFavorite: Eliminar de favoritos
 * - getProgram: Obtener programación
 * - getFootballMatch: Obtener partidos de fútbol
 * - callAPI: Llamada genérica a API
 * - probe: Probar endpoint sin encriptación
 * - testEncrypt: Probar encriptación 3DES
 * - encrypt: Encriptar un texto
 * - decrypt: Desencriptar un texto
 */
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    console.log(`[Xuper Client] Acción "${action}" ejecutada`);

    switch (action) {
      // === DCS ===
      case 'fetchDCS': {
        const result = await fetchDCS();
        return NextResponse.json({ success: true, ...result });
      }

      // === Login ===
      case 'loginSN': {
        if (!body.sn) {
          return NextResponse.json({ success: false, error: 'SN (Serial Number) requerido' });
        }
        const result = await loginWithSN(body.sn);
        return NextResponse.json(result);
      }

      case 'loginEmail': {
        if (!body.email || !body.password) {
          return NextResponse.json({ success: false, error: 'Email y contraseña requeridos' });
        }
        const result = await loginWithEmail(body.email, body.password);
        return NextResponse.json(result);
      }

      case 'activateDevice': {
        if (!body.deviceId) {
          return NextResponse.json({ success: false, error: 'deviceId requerido' });
        }
        const result = await activateDevice(body.deviceId, body.mac);
        return NextResponse.json(result);
      }

      case 'logout': {
        logoutXuper();
        return NextResponse.json({ success: true, message: 'Sesión cerrada' });
      }

      // === Contenido ===
      case 'getHome': {
        const result = await getHome();
        return NextResponse.json({ success: result.success, result });
      }

      case 'getColumnContents': {
        if (!body.columnId) {
          return NextResponse.json({ success: false, error: 'columnId requerido' });
        }
        const result = await getColumnContents(body.columnId, body.page, body.pageSize);
        return NextResponse.json({ success: result.success, result });
      }

      case 'getItemData': {
        if (!body.itemId) {
          return NextResponse.json({ success: false, error: 'itemId requerido' });
        }
        const result = await getItemData(body.itemId);
        return NextResponse.json({ success: result.success, result });
      }

      case 'searchByName': {
        if (!body.keyword) {
          return NextResponse.json({ success: false, error: 'keyword requerido' });
        }
        const result = await searchByName(body.keyword, body.page, body.pageSize);
        return NextResponse.json({ success: result.success, result });
      }

      // === Streaming ===
      case 'startPlayVOD': {
        if (!body.itemId) {
          return NextResponse.json({ success: false, error: 'itemId requerido' });
        }
        const result = await startPlayVOD(body.itemId, body.episodeId);
        return NextResponse.json({ success: result.success, result });
      }

      case 'startPlayLive': {
        if (!body.channelId) {
          return NextResponse.json({ success: false, error: 'channelId requerido' });
        }
        const result = await startPlayLive(body.channelId);
        return NextResponse.json({ success: result.success, result });
      }

      case 'getLiveData': {
        if (!body.channelId) {
          return NextResponse.json({ success: false, error: 'channelId requerido' });
        }
        const result = await getLiveData(body.channelId);
        return NextResponse.json({ success: result.success, result });
      }

      case 'heartbeat': {
        if (!body.playId || !body.itemId) {
          return NextResponse.json({ success: false, error: 'playId e itemId requeridos' });
        }
        const result = await sendHeartbeat(body.playId, body.itemId);
        return NextResponse.json({ success: result.success, result });
      }

      // === Config ===
      case 'getAppConfig': {
        const result = await getAppConfig();
        return NextResponse.json({ success: result.success, result });
      }

      // === Subscriptions ===
      case 'getSubscriptions': {
        const result = await getSubscriptionPackages();
        return NextResponse.json({ success: result.success, result });
      }

      // === Favorites ===
      case 'getFavorites': {
        const result = await getFavorites();
        return NextResponse.json({ success: result.success, result });
      }

      case 'addFavorite': {
        if (!body.itemId) {
          return NextResponse.json({ success: false, error: 'itemId requerido' });
        }
        const result = await addFavorite(body.itemId);
        return NextResponse.json({ success: result.success, result });
      }

      case 'removeFavorite': {
        if (!body.itemId) {
          return NextResponse.json({ success: false, error: 'itemId requerido' });
        }
        const result = await removeFavorite(body.itemId);
        return NextResponse.json({ success: result.success, result });
      }

      // === EPG ===
      case 'getProgram': {
        if (!body.channelId || !body.date) {
          return NextResponse.json({ success: false, error: 'channelId y date requeridos' });
        }
        const result = await getProgram(body.channelId, body.date);
        return NextResponse.json({ success: result.success, result });
      }

      case 'getFootballMatch': {
        const result = await getFootballMatch(body.date || new Date().toISOString().split('T')[0]);
        return NextResponse.json({ success: result.success, result });
      }

      // === Genérico ===
      case 'callAPI': {
        if (!body.path) {
          return NextResponse.json({ success: false, error: 'path requerido' });
        }
        const result = await callXuperAPI(body.path, body.params || {}, {
          service: body.service || 'portal',
          method: body.method || 'POST',
          encrypted: body.encrypted !== false,
          domain: body.domain,
          decrypt: body.decrypt !== false,
        });
        return NextResponse.json({ success: result.success, result });
      }

      case 'probe': {
        if (!body.domain || !body.path) {
          return NextResponse.json({ success: false, error: 'domain y path requeridos' });
        }
        const result = await probeEndpoint(body.domain, body.path, body.method || 'POST', body.params || {});
        return NextResponse.json({ success: result.success, result });
      }

      // === Encriptación ===
      case 'testEncrypt': {
        const test = testEncryption();
        return NextResponse.json({ success: test.match, test });
      }

      case 'encrypt': {
        if (!body.text) {
          return NextResponse.json({ success: false, error: 'text requerido' });
        }
        const key = body.key;
        const encrypted = encrypt3DES(body.text, key);
        return NextResponse.json({ success: true, encrypted, keyUsed: key ? 'custom' : 'default' });
      }

      case 'decrypt': {
        if (!body.text) {
          return NextResponse.json({ success: false, error: 'text requerido (Base64)' });
        }
        const key = body.key;
        try {
          const decrypted = decrypt3DES(body.text, key);
          return NextResponse.json({ success: true, decrypted, keyUsed: key ? 'custom' : 'default' });
        } catch (error) {
          return NextResponse.json({ success: false, error: 'No se pudo desencriptar. Verifica la clave.' });
        }
      }

      default:
        return NextResponse.json({ success: false, error: `Acción desconocida: ${action}` });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    if (msg.includes('denegado') || msg.includes('token')) {
      return NextResponse.json({ success: false, error: msg }, { status: 403 });
    }
    console.error('[Xuper Client API] Error:', msg);
    return NextResponse.json({ success: false, error: msg });
  }
}

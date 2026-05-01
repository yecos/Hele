/**
 * Xuper TV Client - Cliente completo para acceder a los servidores Xuper
 * 
 * Flujo: DCS (getAddr) → Login (v8) → Llamadas API encriptadas (3DES/ECB/PKCS5) → Streams
 * 
 * Endpoints no encriptados:
 *   /api/portalCore/config/get
 *   /api/portalCore/epg/*
 *   /api/portalCore/feedback/*
 *   /api/configCenter/config/get
 * 
 * Todos los demás endpoints requieren encriptación 3DES
 */

import * as crypto from 'crypto';

// ===== Configuración =====
const XUPER_CONFIG = {
  appId: '3',
  apk: 'com.msandroid.mobile',
  apkVer: '60500',
  version: '6.5.0',
  userAgent: 'okhttp/4.12.0',
  timeout: 10000,
  // Dominios conocidos (fallback si DCS falla)
  fallbackPortals: [
    'http://dtgrd.txhnojlbu.com',
    'http://c2tgd.izvhrdcjb.com',
  ],
  dcsEndpoints: [
    'http://dtgrd.txhnojlbu.com/api/v2/dcs/getAddr',
    'http://c2tgd.izvhrdcjb.com/api/v2/dcs/getAddr',
  ],
};

// ===== Clave 3DES =====
// La clave se obtiene del endpoint de configuración o se usa la conocida
const DES_KEY = 'xuper2024key@#$'; // 24 chars = 3DES key

// ===== Tipos =====
export interface XuperDomain {
  type: string;
  domain: string;
  ip?: string;
  port?: number;
}

export interface DCSResponse {
  code: number;
  msg: string;
  data: {
    portal?: string;
    epg?: string;
    notice?: string;
    analytics?: string;
    ads?: string;
    webH5?: string;
    upgrade?: string;
    cdn?: string;
    download?: string;
    [key: string]: string | undefined;
  };
}

export interface XuperLoginResult {
  code: number;
  msg: string;
  data: {
    token: string;
    userId?: string;
    username?: string;
    vipLevel?: number;
    expireTime?: string;
    [key: string]: unknown;
  };
}

export interface XuperChannel {
  id: string;
  name: string;
  logo: string;
  url: string;
  group: string;
  epgCode?: string;
  quality?: string;
}

export interface XuperHomeCategory {
  id: string;
  name: string;
  type: string;
  channels: XuperChannel[];
}

export interface XuperLiveStream {
  url: string;
  format: string;
  token?: string;
}

export interface XuperConfig {
  encrypted: boolean;
  [key: string]: unknown;
}

// ===== Encriptación 3DES/ECB/PKCS5 =====
function encrypt3DES(text: string, key: string = DES_KEY): string {
  const cipher = crypto.createCipheriv('des-ede3-ecb', Buffer.from(key, 'utf8'), null);
  cipher.setAutoPadding(true); // PKCS5 padding
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  return encrypted.toString('base64');
}

function decrypt3DES(encryptedBase64: string, key: string = DES_KEY): string {
  const decipher = crypto.createDecipheriv('des-ede3-ecb', Buffer.from(key, 'utf8'), null);
  decipher.setAutoPadding(true);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// ===== Headers comunes =====
function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json;charset=utf-8',
    'apk': XUPER_CONFIG.apk,
    'apkVer': XUPER_CONFIG.apkVer,
    'User-Agent': XUPER_CONFIG.userAgent,
  };
  if (token) {
    headers['token'] = token;
  }
  return headers;
}

// ===== Estado del cliente =====
interface XuperClientState {
  portalDomain: string;
  domains: Map<string, string>;
  token: string;
  userId: string;
  lastDCSFetch: number;
  lastLogin: number;
  isLoggedIn: boolean;
}

// ===== Cliente principal =====
class XuperTVClient {
  private state: XuperClientState;
  private desKey: string;

  constructor() {
    this.state = {
      portalDomain: '',
      domains: new Map(),
      token: '',
      userId: '',
      lastDCSFetch: 0,
      lastLogin: 0,
      isLoggedIn: false,
    };
    this.desKey = DES_KEY;
  }

  // ===== 1. DCS - Obtener dominios activos =====
  async resolveDomains(force = false): Promise<Map<string, string>> {
    // Cache por 30 minutos
    if (!force && this.state.domains.size > 0 && Date.now() - this.state.lastDCSFetch < 30 * 60 * 1000) {
      return this.state.domains;
    }

    for (const dcsUrl of XUPER_CONFIG.dcsEndpoints) {
      try {
        console.log(`[XuperClient] Consultando DCS: ${dcsUrl}`);
        
        const response = await fetch(dcsUrl, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ appId: XUPER_CONFIG.appId }),
          signal: AbortSignal.timeout(XUPER_CONFIG.timeout),
        });

        if (!response.ok) continue;

        const data = await response.json() as DCSResponse;
        
        if (data.code === 200 && data.data) {
          const domains = new Map<string, string>();
          
          // Mapear los dominios devueltos por el DCS
          for (const [key, value] of Object.entries(data.data)) {
            if (typeof value === 'string' && value) {
              domains.set(key, value.startsWith('http') ? value : `http://${value}`);
            }
          }

          // Guardar portal domain
          if (domains.has('portal')) {
            this.state.portalDomain = domains.get('portal')!;
          }

          this.state.domains = domains;
          this.state.lastDCSFetch = Date.now();
          
          console.log(`[XuperClient] DCS resuelto: ${domains.size} dominios activos`);
          console.log(`[XuperClient] Portal: ${this.state.portalDomain}`);
          
          return domains;
        }
      } catch (err) {
        console.warn(`[XuperClient] DCS falló (${dcsUrl}):`, err);
      }
    }

    // Fallback: usar dominios conocidos
    console.warn('[XuperClient] Todos los DCS fallaron, usando dominios fallback');
    const fallbackDomains = new Map<string, string>();
    fallbackDomains.set('portal', XUPER_CONFIG.fallbackPortals[0]);
    this.state.portalDomain = XUPER_CONFIG.fallbackPortals[0];
    this.state.domains = fallbackDomains;
    
    return fallbackDomains;
  }

  // ===== Obtener dominio para un servicio específico =====
  async getServiceDomain(service: string): Promise<string> {
    if (this.state.domains.size === 0) {
      await this.resolveDomains();
    }
    
    const domain = this.state.domains.get(service);
    if (domain) return domain;
    
    // Si no tenemos el servicio específico, usar portal
    return this.state.portalDomain || XUPER_CONFIG.fallbackPortals[0];
  }

  // ===== 2. Login =====
  async login(username: string, password: string): Promise<XuperLoginResult> {
    // Asegurar que tenemos dominios
    await this.resolveDomains();
    
    const portalUrl = await this.getServiceDomain('portal');
    
    // Primero intentar login v8 (nueva API)
    const loginUrl = `${portalUrl}/api/v8/login`;
    
    const loginPayload = {
      userName: username,
      password: password,
      appId: XUPER_CONFIG.appId,
    };

    try {
      console.log(`[XuperClient] Login v8: ${loginUrl}`);
      
      // Login v8 usa payload encriptado
      const encryptedPayload = encrypt3DES(JSON.stringify(loginPayload), this.desKey);
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ data: encryptedPayload }),
        signal: AbortSignal.timeout(XUPER_CONFIG.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const rawData = await response.json();
      
      // La respuesta puede estar encriptada
      let data: XuperLoginResult;
      if (rawData.data && typeof rawData.data === 'string') {
        const decrypted = decrypt3DES(rawData.data, this.desKey);
        data = JSON.parse(decrypted);
      } else {
        data = rawData;
      }

      if (data.code === 200 && data.data?.token) {
        this.state.token = data.data.token;
        this.state.userId = data.data.userId || '';
        this.state.isLoggedIn = true;
        this.state.lastLogin = Date.now();
        
        console.log(`[XuperClient] Login exitoso - Token: ${this.state.token.substring(0, 10)}...`);
        
        return data;
      }

      // Si falla login v8, intentar login directo
      return await this.loginDirect(username, password);
    } catch (err) {
      console.warn('[XuperClient] Login v8 falló, intentando directo:', err);
      return await this.loginDirect(username, password);
    }
  }

  private async loginDirect(username: string, password: string): Promise<XuperLoginResult> {
    const portalUrl = await this.getServiceDomain('portal');
    const loginUrl = `${portalUrl}/api/portalCore/user/login`;
    
    try {
      console.log(`[XuperClient] Login directo: ${loginUrl}`);
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          userName: username,
          password: password,
          appId: XUPER_CONFIG.appId,
        }),
        signal: AbortSignal.timeout(XUPER_CONFIG.timeout),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const rawData = await response.json();
      
      let data: XuperLoginResult;
      if (rawData.data && typeof rawData.data === 'string') {
        const decrypted = decrypt3DES(rawData.data, this.desKey);
        data = JSON.parse(decrypted);
      } else {
        data = rawData;
      }

      if (data.code === 200 && data.data?.token) {
        this.state.token = data.data.token;
        this.state.userId = data.data.userId || '';
        this.state.isLoggedIn = true;
        this.state.lastLogin = Date.now();
      }

      return data;
    } catch (err) {
      console.error('[XuperClient] Login directo falló:', err);
      return {
        code: -1,
        msg: `Error de conexión: ${err instanceof Error ? err.message : 'desconocido'}`,
        data: { token: '' },
      };
    }
  }

  // ===== 3. Llamadas API encriptadas =====
  async apiCall<T = unknown>(
    endpoint: string,
    payload: Record<string, unknown> = {},
    options: { encrypted?: boolean; method?: string; service?: string } = {}
  ): Promise<T> {
    const { encrypted = true, method = 'POST', service = 'portal' } = options;
    
    if (!this.state.isLoggedIn) {
      throw new Error('No hay sesión activa. Haz login primero.');
    }

    const baseUrl = await this.getServiceDomain(service);
    const url = `${baseUrl}${endpoint}`;

    const headers = getHeaders(this.state.token);
    
    let body: string;
    if (encrypted) {
      const encryptedData = encrypt3DES(JSON.stringify(payload), this.desKey);
      body = JSON.stringify({ data: encryptedData });
    } else {
      body = JSON.stringify(payload);
    }

    console.log(`[XuperClient] API ${method} ${endpoint} (encrypted: ${encrypted})`);

    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(XUPER_CONFIG.timeout),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} en ${endpoint}`);
    }

    const rawData = await response.json();

    // Desencriptar respuesta si viene encriptada
    if (rawData.data && typeof rawData.data === 'string' && encrypted) {
      try {
        const decrypted = decrypt3DES(rawData.data, this.desKey);
        const parsed = JSON.parse(decrypted);
        return { ...rawData, data: parsed } as T;
      } catch {
        // Si falla la desencriptación, devolver tal cual
        return rawData as T;
      }
    }

    return rawData as T;
  }

  // ===== 4. API de contenido =====

  // Obtener página principal (categorías y canales)
  async getHome(): Promise<XuperHomeCategory[]> {
    try {
      const result = await this.apiCall<{
        code: number;
        data: { categories: Array<{ id: string; name: string; type: string; items: XuperChannel[] }> };
      }>('/api/portalCore/home/getHome', {}, { encrypted: true });

      if (result.code === 200 && result.data?.categories) {
        return result.data.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          type: cat.type,
          channels: cat.items || [],
        }));
      }

      return [];
    } catch (err) {
      console.error('[XuperClient] getHome falló:', err);
      return [];
    }
  }

  // Obtener canales en vivo
  async getLiveChannels(categoryId?: string): Promise<XuperChannel[]> {
    try {
      const payload: Record<string, unknown> = {};
      if (categoryId) payload.categoryId = categoryId;

      const result = await this.apiCall<{
        code: number;
        data: { channels: XuperChannel[] };
      }>('/api/portalCore/live/getChannels', payload, { encrypted: true });

      if (result.code === 200 && result.data?.channels) {
        return result.data.channels;
      }

      return [];
    } catch (err) {
      console.error('[XuperClient] getLiveChannels falló:', err);
      return [];
    }
  }

  // Iniciar reproducción de canal en vivo
  async startPlayLive(channelId: string): Promise<XuperLiveStream | null> {
    try {
      const result = await this.apiCall<{
        code: number;
        data: { url: string; format: string; token?: string };
      }>('/api/portalCore/live/startPlay', { channelId }, { encrypted: true });

      if (result.code === 200 && result.data?.url) {
        return {
          url: result.data.url,
          format: result.data.format || 'hls',
          token: result.data.token,
        };
      }

      return null;
    } catch (err) {
      console.error('[XuperClient] startPlayLive falló:', err);
      return null;
    }
  }

  // Detener reproducción
  async stopPlay(channelId: string): Promise<void> {
    try {
      await this.apiCall('/api/portalCore/live/stopPlay', { channelId }, { encrypted: true });
    } catch (err) {
      console.warn('[XuperClient] stopPlay falló:', err);
    }
  }

  // Obtener EPG (Guía de programación) - no encriptado
  async getEPG(channelCode?: string, date?: string): Promise<unknown> {
    const portalUrl = await this.getServiceDomain('portal');
    const params = new URLSearchParams();
    if (channelCode) params.set('channelCode', channelCode);
    if (date) params.set('date', date);
    
    const url = `${portalUrl}/api/portalCore/epg/get?${params.toString()}`;
    
    try {
      const response = await fetch(url, {
        headers: getHeaders(this.state.token),
        signal: AbortSignal.timeout(XUPER_CONFIG.timeout),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error('[XuperClient] getEPG falló:', err);
      return null;
    }
  }

  // Obtener categorías de canales
  async getChannelCategories(): Promise<Array<{ id: string; name: string; count: number }>> {
    try {
      const result = await this.apiCall<{
        code: number;
        data: { categories: Array<{ id: string; name: string; count: number }> };
      }>('/api/portalCore/live/getCategories', {}, { encrypted: true });

      if (result.code === 200 && result.data?.categories) {
        return result.data.categories;
      }

      return [];
    } catch (err) {
      console.error('[XuperClient] getChannelCategories falló:', err);
      return [];
    }
  }

  // Obtener configuración del portal - no encriptado
  async getConfig(): Promise<XuperConfig | null> {
    const portalUrl = await this.getServiceDomain('portal');
    
    try {
      const response = await fetch(`${portalUrl}/api/portalCore/config/get`, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(XUPER_CONFIG.timeout),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error('[XuperClient] getConfig falló:', err);
      return null;
    }
  }

  // Obtener configuración del configCenter - no encriptado
  async getConfigCenter(): Promise<unknown> {
    const portalUrl = await this.getServiceDomain('portal');
    
    try {
      const response = await fetch(`${portalUrl}/api/configCenter/config/get`, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(XUPER_CONFIG.timeout),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error('[XuperClient] getConfigCenter falló:', err);
      return null;
    }
  }

  // Enviar feedback - no encriptado
  async sendFeedback(message: string, type: string = 'bug'): Promise<boolean> {
    const portalUrl = await this.getServiceDomain('portal');
    
    try {
      const response = await fetch(`${portalUrl}/api/portalCore/feedback/submit`, {
        method: 'POST',
        headers: getHeaders(this.state.token),
        body: JSON.stringify({ message, type }),
        signal: AbortSignal.timeout(XUPER_CONFIG.timeout),
      });

      return response.ok;
    } catch (err) {
      console.error('[XuperClient] sendFeedback falló:', err);
      return false;
    }
  }

  // ===== 5. Heartbeat (mantener sesión activa) =====
  async heartbeat(): Promise<boolean> {
    if (!this.state.isLoggedIn) return false;

    try {
      const result = await this.apiCall<{ code: number }>(
        '/api/portalCore/user/heartbeat',
        {},
        { encrypted: true }
      );
      return result.code === 200;
    } catch {
      return false;
    }
  }

  // ===== Obtener estado del cliente =====
  getStatus() {
    return {
      isLoggedIn: this.state.isLoggedIn,
      portalDomain: this.state.portalDomain,
      domainsCount: this.state.domains.size,
      lastDCSFetch: this.state.lastDCSFetch ? new Date(this.state.lastDCSFetch).toISOString() : null,
      lastLogin: this.state.lastLogin ? new Date(this.state.lastLogin).toISOString() : null,
      hasToken: !!this.state.token,
    };
  }

  // ===== Logout =====
  logout() {
    this.state.token = '';
    this.state.userId = '';
    this.state.isLoggedIn = false;
    this.state.lastLogin = 0;
    console.log('[XuperClient] Sesión cerrada');
  }

  // ===== Actualizar clave de encriptación =====
  setDESKey(key: string) {
    this.desKey = key;
  }

  // ===== Test de conectividad =====
  async testConnection(): Promise<{
    dcs: boolean;
    portal: boolean;
    login: boolean;
    domains: Map<string, string>;
  }> {
    const result = {
      dcs: false,
      portal: false,
      login: false,
      domains: new Map<string, string>(),
    };

    // Test DCS
    try {
      const domains = await this.resolveDomains(true);
      result.dcs = domains.size > 0;
      result.domains = domains;
    } catch {
      result.dcs = false;
    }

    // Test Portal
    if (result.dcs) {
      try {
        const config = await this.getConfig();
        result.portal = config !== null;
      } catch {
        result.portal = false;
      }
    }

    return result;
  }
}

// ===== Singleton =====
let clientInstance: XuperTVClient | null = null;

export function getXuperClient(): XuperTVClient {
  if (!clientInstance) {
    clientInstance = new XuperTVClient();
  }
  return clientInstance;
}

export function resetXuperClient(): void {
  if (clientInstance) {
    clientInstance.logout();
  }
  clientInstance = null;
}

// Exportar la clase para tests
export { XuperTVClient };

// Exportar funciones de encriptación para uso directo
export { encrypt3DES, decrypt3DES };

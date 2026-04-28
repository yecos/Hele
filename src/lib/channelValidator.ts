// ═══════════════════════════════════════════════════════════════════════
// XuperStream - Channel Validator
// Verifica la salud de los streams con HEAD requests y concurrencia
// ═══════════════════════════════════════════════════════════════════════

import type { M3UChannel } from './m3uParser';

export type ChannelStatus = 'checking' | 'online' | 'offline' | 'timeout' | 'error';

export interface ValidationResult {
  channel: M3UChannel;
  status: ChannelStatus;
  statusCode?: number;
  latency?: number;
  contentType?: string;
  checkedAt: number;
}

export interface ValidationProgress {
  total: number;
  checked: number;
  online: number;
  offline: number;
  errors: number;
  percentage: number;
  currentChannel?: string;
}

type ValidationCallback = (progress: ValidationProgress) => void;

/**
 * Valida un canal haciendo un HEAD request via proxy.
 * Devuelve el estado del canal.
 */
export async function validateChannel(
  channel: M3UChannel,
  signal?: AbortSignal
): Promise<ValidationResult> {
  const startTime = performance.now();

  try {
    const proxyUrl = `/api/iptv-proxy?url=${encodeURIComponent(channel.url)}&method=head`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // Combine external signal with our timeout
    const combinedSignal = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;

    const res = await fetch(proxyUrl, {
      method: 'GET', // Proxy routes handle HEAD internally
      signal: combinedSignal,
    });

    clearTimeout(timeoutId);
    const latency = performance.now() - startTime;

    if (res.ok) {
      return {
        channel,
        status: 'online',
        statusCode: res.status,
        latency,
        contentType: res.headers.get('content-type') || undefined,
        checkedAt: Date.now(),
      };
    }

    // Some servers return 403 for HEAD but stream works fine
    if (res.status === 403 || res.status === 401) {
      return {
        channel,
        status: 'online',
        statusCode: res.status,
        latency,
        checkedAt: Date.now(),
      };
    }

    return {
      channel,
      status: 'offline',
      statusCode: res.status,
      latency,
      checkedAt: Date.now(),
    };
  } catch (err) {
    const latency = performance.now() - startTime;

    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        channel,
        status: 'timeout',
        latency,
        checkedAt: Date.now(),
      };
    }

    return {
      channel,
      status: 'error',
      latency,
      checkedAt: Date.now(),
    };
  }
}

/**
 * Valida una lista de canales en batch con concurrencia controlada.
 * Reporta progreso via callback.
 */
export async function validateChannelsBatch(
  channels: M3UChannel[],
  options: {
    concurrency?: number;
    timeout?: number;
    onProgress?: ValidationCallback;
    signal?: AbortSignal;
    stopOnFirstError?: boolean;
  } = {}
): Promise<ValidationResult[]> {
  const {
    concurrency = 8,
    timeout = 8000,
    onProgress,
    signal,
    stopOnFirstError = false,
  } = options;

  const results: ValidationResult[] = [];
  let checked = 0;
  let onlineCount = 0;
  let offlineCount = 0;
  let errorCount = 0;

  const progress: ValidationProgress = {
    total: channels.length,
    checked: 0,
    online: 0,
    offline: 0,
    errors: 0,
    percentage: 0,
  };

  const reportProgress = (currentChannel?: string) => {
    progress.checked = checked;
    progress.online = onlineCount;
    progress.offline = offlineCount;
    progress.errors = errorCount;
    progress.percentage = channels.length > 0 ? Math.round((checked / channels.length) * 100) : 0;
    progress.currentChannel = currentChannel;
    onProgress?.(progress);
  };

  // Process in batches
  for (let i = 0; i < channels.length; i += concurrency) {
    if (signal?.aborted) break;

    const batch = channels.slice(i, i + concurrency);
    const batchPromises = batch.map(async (channel) => {
      const result = await validateChannel(channel, signal);
      checked++;

      if (result.status === 'online') onlineCount++;
      else if (result.status === 'offline' || result.status === 'timeout') offlineCount++;
      else errorCount++;

      reportProgress(channel.name);
      return result;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (stopOnFirstError && errorCount > 0) break;

    // Small delay between batches to avoid overwhelming the proxy
    if (i + concurrency < channels.length) {
      await sleep(50);
    }
  }

  return results;
}

/**
 * Valida solo los primeros N canales (quick check).
 * Útil para verificar si una playlist es válida antes de procesarla completa.
 */
export async function quickValidatePlaylist(
  channels: M3UChannel[],
  sampleSize: number = 5
): Promise<{
  valid: boolean;
  onlineCount: number;
  checkedCount: number;
  sampleResults: ValidationResult[];
}> {
  const sample = channels.slice(0, sampleSize);
  const results = await Promise.all(sample.map((ch) => validateChannel(ch)));

  const onlineCount = results.filter((r) => r.status === 'online').length;

  return {
    valid: onlineCount > 0,
    onlineCount,
    checkedCount: results.length,
    sampleResults: results,
  };
}

/**
 * Filtra canales online de los resultados de validación.
 */
export function getOnlineChannels(results: ValidationResult[]): M3UChannel[] {
  return results.filter((r) => r.status === 'online').map((r) => r.channel);
}

/**
 * Estadísticas de validación.
 */
export function getValidationStats(results: ValidationResult[]) {
  const total = results.length;
  const online = results.filter((r) => r.status === 'online').length;
  const offline = results.filter((r) => r.status === 'offline').length;
  const timeouts = results.filter((r) => r.status === 'timeout').length;
  const errors = results.filter((r) => r.status === 'error').length;
  const avgLatency =
    results.reduce((sum, r) => sum + (r.latency || 0), 0) / (total || 1);

  return {
    total,
    online,
    offline,
    timeouts,
    errors,
    successRate: total > 0 ? ((online / total) * 100).toFixed(1) : '0',
    avgLatency: Math.round(avgLatency),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

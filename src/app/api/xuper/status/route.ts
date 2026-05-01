import { NextResponse } from 'next/server';
import { getXuperClient } from '@/lib/guardian/xuper-client';
import { quickXuperCheck } from '@/lib/guardian/xuper-monitor';

/**
 * GET /api/xuper/status
 * Estado del cliente Xuper: sesión, dominios, conectividad
 */
export async function GET() {
  try {
    const client = getXuperClient();
    const clientStatus = client.getStatus();

    // Quick connectivity check
    const connectivity = await quickXuperCheck();

    return NextResponse.json({
      success: true,
      client: clientStatus,
      connectivity: {
        available: connectivity.available,
        portalOk: connectivity.portalOk,
        dcsOk: connectivity.dcsOk,
        latencyMs: connectivity.latencyMs,
        activePortal: connectivity.activePortal,
      },
    });
  } catch (error) {
    console.error('[Xuper API] Status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo estado',
      client: {
        isLoggedIn: false,
        portalDomain: '',
        domainsCount: 0,
        hasToken: false,
      },
      connectivity: {
        available: false,
        portalOk: false,
        dcsOk: false,
        latencyMs: 0,
        activePortal: '',
      },
    });
  }
}

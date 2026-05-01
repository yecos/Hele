import { NextResponse } from 'next/server';
import { getXuperMonitorStatus } from '@/lib/guardian/xuper-monitor';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guardian/xuper/domains
 * Devuelve el estado actual de todos los dominios Xuper TV, alertas y DCS
 */
export async function GET() {
  try {
    const data = await getXuperMonitorStatus();
    return NextResponse.json({ success: true, ...data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Xuper Domains API] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

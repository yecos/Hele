import { NextResponse } from 'next/server';
import { runXuperMonitorCheck } from '@/lib/guardian/xuper-monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/guardian/xuper/monitor
 * Ejecuta un chequeo completo de la infraestructura Xuper TV
 */
export async function GET() {
  try {
    const result = await runXuperMonitorCheck('manual');

    if (result.status === 'already_running') {
      return NextResponse.json({ success: false, message: result.message, isChecking: true });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Xuper Monitor API] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

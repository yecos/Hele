import { NextResponse } from 'next/server';
import { runXuperMonitor, setLastMonitorResult } from '@/lib/guardian/xuper-monitor';

/**
 * GET /api/xuper/monitor
 * Ejecutar monitoreo completo de servidores Xuper
 * 
 * Verifica DNS, HTTP, DCS de todos los dominios conocidos
 */
export async function GET() {
  try {
    const result = await runXuperMonitor();
    setLastMonitorResult(result);

    return NextResponse.json({
      success: true,
      monitor: result,
    });
  } catch (error) {
    console.error('[Xuper API] Monitor error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error ejecutando monitoreo',
      monitor: null,
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { markXuperAlertRead, markAllXuperAlertsRead } from '@/lib/guardian/xuper-monitor';

/**
 * PATCH /api/guardian/xuper/alerts
 * Marca una alerta como leída (body: {id})
 */
export async function PATCH(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });
    }
    await markXuperAlertRead(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/guardian/xuper/alerts
 * Marca todas las alertas como leídas
 */
export async function POST() {
  try {
    await markAllXuperAlertsRead();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

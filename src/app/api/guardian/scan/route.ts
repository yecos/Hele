import { NextRequest, NextResponse } from 'next/server';
import { runFullScan } from '@/lib/guardian/scanner';
import { isAdminFromSession } from '@/lib/admin-guard';

// Scanning can take several minutes
export const maxDuration = 300;

/**
 * POST /api/guardian/scan
 * Dispara un escaneo manual del Guardian (solo admin)
 */
export async function POST(request: NextRequest) {
  try {
    const { isAdmin } = await isAdminFromSession(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Acceso denegado - Se requieren permisos de administrador' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const trigger = body.trigger === 'manual' ? 'manual' : 'manual';

    const result = await runFullScan(trigger);

    if (result.status === 'already_running') {
      return NextResponse.json({
        success: false,
        message: result.message,
        isScanning: true,
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[Guardian API] Error en scan:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al iniciar el escaneo',
    });
  }
}

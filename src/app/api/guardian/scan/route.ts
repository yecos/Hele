import { NextRequest, NextResponse } from 'next/server';
import { runFullScan } from '@/lib/guardian/scanner';

/**
 * POST /api/guardian/scan
 * Dispara un escaneo manual del Guardian
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const trigger = body.trigger === 'manual' ? 'manual' : 'manual';

    // Ejecutar en background (no bloquear la respuesta)
    // Devolvemos inmediatamente y el scan corre en segundo plano
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
    console.error('[Guardian API] Error en scan:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al iniciar el escaneo',
    });
  }
}

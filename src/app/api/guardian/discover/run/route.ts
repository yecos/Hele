import { NextResponse } from 'next/server';
import { runDiscovery, promoteToGuardian } from '@/lib/guardian/discovery';
import { requireAdmin } from '@/lib/admin-guard';

// Discovery can take 2-3 minutes with validation. Vercel default is 10s.
export const maxDuration = 300;

/**
 * POST /api/guardian/discover/run
 * Dispara un descubrimiento web manual (solo admin)
 * Body: { trigger: 'manual' } o { action: 'promote', url: '...' }
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json().catch(() => ({}));

    if (body.action === 'promote' && body.url) {
      const result = await promoteToGuardian(body.url);
      return NextResponse.json(result);
    }

    const result = await runDiscovery('manual');

    if (result.status === 'already_running') {
      return NextResponse.json({
        success: false,
        message: result.message,
        isDiscovering: true,
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    if (msg.includes('denegado') || msg.includes('token')) {
      return NextResponse.json({ success: false, error: msg }, { status: 403 });
    }
    console.error('[Discovery API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al iniciar descubrimiento',
    });
  }
}

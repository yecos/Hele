import { NextResponse } from 'next/server';
import { runDiscovery, promoteToGuardian } from '@/lib/guardian/discovery';

/**
 * POST /api/guardian/discover/run
 * Dispara un descubrimiento web manual
 * Body: { trigger: 'manual' }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Diferenciar entre discovery y promote
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
    console.error('[Discovery API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al iniciar descubrimiento',
    });
  }
}

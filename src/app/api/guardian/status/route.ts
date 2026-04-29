import { NextResponse } from 'next/server';
import { getGuardianStats } from '@/lib/guardian/scanner';
import { getSchedulerStatus } from '@/lib/guardian/scheduler';

/**
 * GET /api/guardian/status
 * Devuelve el estado completo del Guardian: scheduler, último escaneo, estadísticas
 */
export async function GET() {
  try {
    const stats = await getGuardianStats();
    const scheduler = getSchedulerStatus();

    return NextResponse.json({
      success: true,
      guardian: {
        ...stats,
        scheduler,
      },
    });
  } catch (error) {
    console.error('[Guardian API] Error en status:', error);
    return NextResponse.json({
      success: true,
      guardian: {
        totalSources: 0,
        totalVerified: 0,
        isScanning: false,
        latestScan: null,
        totalScans: 0,
        playlistsBreakdown: [],
        scheduler: {
          initialized: false,
          activeTasks: 0,
          tasks: [],
        },
      },
    });
  }
}

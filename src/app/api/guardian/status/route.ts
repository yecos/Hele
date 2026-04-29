import { NextResponse } from 'next/server';
import { getGuardianStats } from '@/lib/guardian/scanner';
import { getSchedulerStatus } from '@/lib/guardian/scheduler';
import { getDiscoveryStatus, getDiscoveryStats } from '@/lib/guardian/discovery';

/**
 * GET /api/guardian/status
 * Devuelve el estado completo del Guardian: scheduler, escaneo, descubrimiento
 */
export async function GET() {
  try {
    const [stats, scheduler, discoveryStatus, discoveryStats] = await Promise.all([
      getGuardianStats(),
      getSchedulerStatus(),
      getDiscoveryStatus(),
      getDiscoveryStats(),
    ]);

    return NextResponse.json({
      success: true,
      guardian: {
        ...stats,
        scheduler,
        discovery: {
          ...discoveryStatus,
          stats: discoveryStats,
        },
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
        scheduler: { initialized: false, activeTasks: 0, tasks: [] },
        discovery: { isDiscovering: false, lastDiscovery: null, stats: { totalDiscovered: 0, validSources: 0, addedToGuardian: 0, totalChannelsInValidSources: 0 } },
      },
    });
  }
}

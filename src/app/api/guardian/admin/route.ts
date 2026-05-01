import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { runDiscovery, promoteToGuardian, getDiscoveredSources, getDiscoveryStats, getDiscoveryStatus } from '@/lib/guardian/discovery';
import { runFullScan, getGuardianStats, getVerifiedChannels } from '@/lib/guardian/scanner';
import { getSchedulerStatus } from '@/lib/guardian/scheduler';
import { runXuperMonitorCheck, markAllXuperAlertsRead } from '@/lib/guardian/xuper-monitor';
import { fetchDCS, getXuperClientStatus, testEncryption, probeEndpoint } from '@/lib/guardian/xuper-client';
import { db } from '@/lib/db';

// Admin actions (runDiscovery, runScan) can take several minutes
export const maxDuration = 300;

const EMPTY_DASHBOARD = {
  guardian: {
    totalSources: 0,
    totalVerified: 0,
    isScanning: false,
    latestScan: null,
    totalScans: 0,
    playlistsBreakdown: [],
  },
  scheduler: { initialized: false, activeTasks: 0, tasks: [] },
  discovery: {
    isDiscovering: false,
    lastDiscovery: null,
    stats: { totalDiscovered: 0, validSources: 0, addedToGuardian: 0, totalChannelsInValidSources: 0 },
  },
  recentScans: [],
  discoveredSources: [],
  verifiedChannelCount: 0,
  dbAvailable: false,
};

/**
 * GET /api/guardian/admin - Dashboard completo del Guardian
 */
export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    const database = db;

    if (!database) {
      return NextResponse.json({
        success: true,
        admin: admin.username,
        dashboard: EMPTY_DASHBOARD,
        warning: 'DATABASE_URL no configurada. El Guardian requiere una base de datos persistente.',
      });
    }

    const [stats, scheduler, discoveryStatus, discoveryStats, recentScans, discoveredSources, verifiedChannels] = await Promise.all([
      getGuardianStats(),
      getSchedulerStatus(),
      getDiscoveryStatus(),
      getDiscoveryStats(),
      database.guardianScan.findMany({ orderBy: { startedAt: 'desc' }, take: 10 }).catch(() => []),
      getDiscoveredSources({ validOnly: false, limit: 50 }).catch(() => []),
      getVerifiedChannels().catch(() => []),
    ]);

    return NextResponse.json({
      success: true,
      admin: admin.username,
      dashboard: {
        guardian: stats,
        scheduler,
        discovery: { ...discoveryStatus, stats: discoveryStats },
        recentScans,
        discoveredSources,
        verifiedChannelCount: verifiedChannels?.length || 0,
        dbAvailable: true,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    if (msg.includes('denegado') || msg.includes('token')) {
      return NextResponse.json({ success: false, error: msg }, { status: 403 });
    }
    console.error('[Admin API] GET error:', msg);
    return NextResponse.json({
      success: true,
      admin: 'unknown',
      dashboard: EMPTY_DASHBOARD,
      error: msg,
    });
  }
}

/**
 * POST /api/guardian/admin - Acciones administrativas
 */
export async function POST(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    const database = db;

    if (!database) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL no configurada. El Guardian no puede ejecutar acciones sin base de datos.',
      });
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    console.log(`[Admin API] Acción "${action}" ejecutada por ${admin.username}`);

    switch (action) {
      case 'runDiscovery': {
        const result = await runDiscovery('manual');
        if (result.status === 'already_running') {
          return NextResponse.json({ success: false, message: result.message, isDiscovering: true });
        }
        return NextResponse.json({ success: true, ...result });
      }

      case 'promoteSource': {
        if (!body.url) {
          return NextResponse.json({ success: false, error: 'URL requerida' });
        }
        const result = await promoteToGuardian(body.url);
        return NextResponse.json(result);
      }

      case 'clearDiscovered': {
        const deleted = await database.discoveredSource.deleteMany({ where: { isValid: false } });
        return NextResponse.json({ success: true, deleted: deleted.count, message: `${deleted.count} fuentes inválidas eliminadas` });
      }

      case 'runScan': {
        const result = await runFullScan('manual');
        if (result.status === 'already_running') {
          return NextResponse.json({ success: false, message: result.message, isScanning: true });
        }
        return NextResponse.json({ success: true, ...result });
      }

      case 'clearChannels': {
        const deleted = await database.verifiedChannel.deleteMany();
        return NextResponse.json({ success: true, deleted: deleted.count, message: `${deleted.count} canales verificados eliminados` });
      }

      case 'toggleSource': {
        if (!body.sourceId) {
          return NextResponse.json({ success: false, error: 'sourceId requerido' });
        }
        const source = await database.guardianSource.findUnique({ where: { id: body.sourceId } });
        if (!source) {
          return NextResponse.json({ success: false, error: 'Fuente no encontrada' });
        }
        const updated = await database.guardianSource.update({
          where: { id: body.sourceId },
          data: { enabled: !source.enabled, updatedAt: new Date() },
        });
        return NextResponse.json({ success: true, source: updated, message: updated.enabled ? 'Fuente habilitada' : 'Fuente deshabilitada' });
      }

      case 'deleteSource': {
        if (!body.sourceId) {
          return NextResponse.json({ success: false, error: 'sourceId requerido' });
        }
        await database.guardianSource.delete({ where: { id: body.sourceId } });
        return NextResponse.json({ success: true, message: 'Fuente eliminada' });
      }

      case 'runXuperCheck': {
        const result = await runXuperMonitorCheck('manual');
        if (result.status === 'already_running') {
          return NextResponse.json({ success: false, message: result.message, isChecking: true });
        }
        return NextResponse.json({ success: true, ...result });
      }

      case 'markXuperAlertsRead': {
        await markAllXuperAlertsRead();
        return NextResponse.json({ success: true, message: 'Alertas Xuper marcadas como leídas' });
      }

      case 'clearXuperAlerts': {
        const deleted = await database.xuperAlert.deleteMany();
        return NextResponse.json({ success: true, deleted: deleted.count, message: `${deleted.count} alertas Xuper eliminadas` });
      }

      case 'xuperFetchDCS': {
        const result = await fetchDCS();
        return NextResponse.json({ success: result.success, ...result });
      }

      case 'xuperClientStatus': {
        const status = getXuperClientStatus();
        const encTest = testEncryption();
        return NextResponse.json({ success: true, status, encryption: encTest });
      }

      case 'xuperProbeEndpoint': {
        if (!body.domain || !body.path) {
          return NextResponse.json({ success: false, error: 'domain y path requeridos' });
        }
        const result = await probeEndpoint(body.domain, body.path, body.method || 'POST', body.params || {});
        return NextResponse.json({ success: result.success, result });
      }

      case 'clearXuperAPILogs': {
        const deleted = await database.xuperAPILog.deleteMany();
        return NextResponse.json({ success: true, deleted: deleted.count, message: `${deleted.count} API logs eliminados` });
      }

      default:
        return NextResponse.json({ success: false, error: `Acción desconocida: ${action}` });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    if (msg.includes('denegado') || msg.includes('token')) {
      return NextResponse.json({ success: false, error: msg }, { status: 403 });
    }
    console.error('[Admin API] POST error:', msg);
    return NextResponse.json({ success: false, error: msg });
  }
}

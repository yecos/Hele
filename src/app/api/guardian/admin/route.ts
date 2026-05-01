import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { runDiscovery, promoteToGuardian, getDiscoveredSources, getDiscoveryStats, getDiscoveryStatus } from '@/lib/guardian/discovery';
import { runFullScan, getGuardianStats, getVerifiedChannels } from '@/lib/guardian/scanner';
import { getSchedulerStatus } from '@/lib/guardian/scheduler';
import { db } from '@/lib/db';

/**
 * GET /api/guardian/admin - Dashboard completo del Guardian
 * Requiere autenticación admin (NextAuth JWT o legacy header)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const [stats, scheduler, discoveryStatus, discoveryStats, recentScans, discoveredSources, verifiedChannels] = await Promise.all([
      getGuardianStats(),
      getSchedulerStatus(),
      getDiscoveryStatus(),
      getDiscoveryStats(),
      db.guardianScan.findMany({ orderBy: { startedAt: 'desc' }, take: 10 }),
      getDiscoveredSources({ validOnly: false, limit: 50 }),
      getVerifiedChannels(),
    ]);

    return NextResponse.json({
      success: true,
      dashboard: {
        guardian: stats,
        scheduler,
        discovery: {
          ...discoveryStatus,
          stats: discoveryStats,
        },
        recentScans,
        discoveredSources,
        verifiedChannelCount: verifiedChannels.length,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    if (msg.includes('denegado') || msg.includes('token')) {
      return NextResponse.json({ success: false, error: msg }, { status: 403 });
    }
    console.error('[Admin API] GET error:', msg);
    return NextResponse.json({ success: false, error: msg });
  }
}

/**
 * POST /api/guardian/admin - Acciones administrativas
 * Body: { action: string, ...params }
 *
 * Acciones disponibles:
 * - runDiscovery: Ejecutar descubrimiento manual
 * - runScan: Ejecutar escaneo manual
 * - promoteSource: Promover fuente descubierta al Guardian
 * - clearChannels: Limpiar canales verificados
 * - clearDiscovered: Limpiar fuentes descubiertas inválidas
 * - toggleSource: Habilitar/deshabilitar fuente del Guardian
 * - deleteSource: Eliminar fuente del Guardian
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    console.log(`[Admin API] Acción "${action}" ejecutada`);

    switch (action) {
      // === DISCOVERY ===
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
        const deleted = await db.discoveredSource.deleteMany({
          where: { isValid: false },
        });
        return NextResponse.json({ success: true, deleted: deleted.count, message: `${deleted.count} fuentes inválidas eliminadas` });
      }

      // === SCANNER ===
      case 'runScan': {
        const result = await runFullScan('manual');
        if (result.status === 'already_running') {
          return NextResponse.json({ success: false, message: result.message, isScanning: true });
        }
        return NextResponse.json({ success: true, ...result });
      }

      case 'clearChannels': {
        const deleted = await db.verifiedChannel.deleteMany();
        return NextResponse.json({ success: true, deleted: deleted.count, message: `${deleted.count} canales verificados eliminados` });
      }

      // === SOURCES ===
      case 'toggleSource': {
        if (!body.sourceId) {
          return NextResponse.json({ success: false, error: 'sourceId requerido' });
        }
        const source = await db.guardianSource.findUnique({ where: { id: body.sourceId } });
        if (!source) {
          return NextResponse.json({ success: false, error: 'Fuente no encontrada' });
        }
        const updated = await db.guardianSource.update({
          where: { id: body.sourceId },
          data: { enabled: !source.enabled, updatedAt: new Date() },
        });
        return NextResponse.json({ success: true, source: updated, message: updated.enabled ? 'Fuente habilitada' : 'Fuente deshabilitada' });
      }

      case 'deleteSource': {
        if (!body.sourceId) {
          return NextResponse.json({ success: false, error: 'sourceId requerido' });
        }
        await db.guardianSource.delete({ where: { id: body.sourceId } });
        return NextResponse.json({ success: true, message: 'Fuente eliminada' });
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

import { NextRequest, NextResponse } from 'next/server';
import { runFullScan } from '@/lib/guardian/scanner';
import { runXuperMonitor, setLastMonitorResult } from '@/lib/guardian/xuper-monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  return Boolean(
    cronSecret &&
    cronSecret.length >= 16 &&
    authHeader === `Bearer ${cronSecret}`
  );
}

/**
 * GET /api/cron/guardian
 *
 * Serverless-safe Guardian maintenance entry point.
 * Vercel invokes this route from the production deployment once per day.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized cron invocation' },
      { status: 401 }
    );
  }

  const startedAt = Date.now();

  try {
    const scan = await runFullScan('scheduled');

    let xuperMonitor: Awaited<ReturnType<typeof runXuperMonitor>> | null = null;
    let xuperMonitorError: string | null = null;

    try {
      xuperMonitor = await runXuperMonitor();
      setLastMonitorResult(xuperMonitor);
    } catch (error) {
      xuperMonitorError =
        error instanceof Error ? error.message : 'Unknown Xuper monitor error';
      console.error('[Guardian Cron] Xuper monitor failed:', error);
    }

    return NextResponse.json({
      success: true,
      mode: 'vercel-cron',
      durationMs: Date.now() - startedAt,
      scan,
      xuperMonitor,
      xuperMonitorError,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Guardian cron error';

    console.error('[Guardian Cron] Daily maintenance failed:', error);

    return NextResponse.json(
      {
        success: false,
        mode: 'vercel-cron',
        durationMs: Date.now() - startedAt,
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * Guardian scheduling metadata for serverless deployments.
 *
 * HELE used to start node-cron timers from instrumentation.ts. That model is
 * not reliable on Vercel because function instances are ephemeral. Scheduling
 * is now owned by Vercel Cron and the API route under /api/cron/guardian.
 */

export const GUARDIAN_CRON = {
  mode: 'vercel-cron' as const,
  timezone: 'UTC',
  schedule: '0 11 * * *',
  localLabel: 'Daily around 6:00 AM America/Bogota',
  path: '/api/cron/guardian',
};

export function startGuardianScheduler() {
  console.info(
    '[Guardian] In-memory scheduler disabled. Vercel Cron manages Guardian maintenance.'
  );
}

export function stopGuardianScheduler() {
  console.info('[Guardian] No in-memory scheduler to stop.');
}

export function getSchedulerStatus() {
  return {
    initialized: true,
    activeTasks: 1,
    mode: GUARDIAN_CRON.mode,
    managedExternally: true,
    timezone: GUARDIAN_CRON.timezone,
    tasks: [
      {
        name: 'Guardian Daily Maintenance',
        cron: GUARDIAN_CRON.schedule,
        type: 'scan+xuper-monitor',
        path: GUARDIAN_CRON.path,
        localTime: GUARDIAN_CRON.localLabel,
      },
    ],
  };
}

/**
 * Next.js instrumentation hook.
 *
 * HELE intentionally does not start long-lived timers here. Vercel Functions
 * are ephemeral, so Guardian background work is triggered through Vercel Cron.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.info(
      '[Instrumentation] HELE server initialized. Guardian scheduling is managed by Vercel Cron.'
    );
  }
}

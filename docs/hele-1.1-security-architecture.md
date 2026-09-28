# HELE 1.1 — Security + Architecture

## Goal

Move HELE's background operations from process-local timers to a deployment model that matches Vercel's serverless runtime.

## Guardian scheduling

The previous implementation launched `node-cron` from `instrumentation.ts`. That assumes one long-lived server process. Vercel Functions are ephemeral, so timers can disappear, duplicate, or never run consistently.

HELE 1.1 uses:

```text
Vercel Cron
    ↓
GET /api/cron/guardian
    ↓
CRON_SECRET verification
    ↓
Guardian scan
    ↓
Xuper health monitor
    ↓
persistent database
```

### Hobby-compatible cadence

The configured schedule is:

```text
0 11 * * *
```

Vercel cron schedules are UTC. 11:00 UTC corresponds to approximately 06:00 in America/Bogota.

The project deliberately uses one daily job so it remains compatible with Vercel Hobby. Higher-frequency Xuper monitoring or discovery should use Vercel Pro or a durable external scheduler rather than in-memory timers.

## Security

The cron route fails closed unless:

- `CRON_SECRET` exists;
- it contains at least 16 characters;
- the request contains an exact `Authorization: Bearer <CRON_SECRET>` header.

No query-string or client-supplied admin role can invoke the cron job.

## Manual operations

The existing authenticated admin endpoints remain available for:

- manual Guardian scans;
- discovery runs;
- source promotion;
- source/channel cleanup.

## Next architecture pass

1. Align all Prisma packages to one release line.
2. Replace ephemeral production SQLite fallback with a persistent database.
3. Audit and upgrade vulnerable dependencies without `--force`.
4. Add durable job locks so duplicate maintenance requests cannot overlap across instances.
5. Split the monolithic application store into feature stores.

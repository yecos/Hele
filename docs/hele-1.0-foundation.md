# HELE 1.0 Foundation

## Objective

Turn the existing XuperStream application into a maintainable HELE platform without breaking working playback features.

This phase deliberately separates platform reliability from the later visual/product redesign.

## Phase 0 — Security baseline

### Implemented in this branch

- Removed tracked `.env` from the current tree.
- Added a safe `.env.example`.
- Production now requires `NEXTAUTH_SECRET`.
- NextAuth options are exported as a single server-side source of truth.
- Admin authorization validates the NextAuth session.
- Privileged authorization no longer falls back to client-provided auth headers.
- CI rejects tracked environment files.

### Required before merge to production

- Rotate every credential that existed in the previously committed `.env`.
- Configure fresh values in the deployment platform.
- Confirm `ADMIN_EMAILS` contains the intended administrators.
- Decide whether repository history should be rewritten to purge the old secret-bearing commit history.

## Phase 1 — Engineering baseline

### Implemented

- Removed `typescript.ignoreBuildErrors`.
- Added `npm run typecheck`.
- Added `npm run check`.
- Added GitHub Actions quality gates.
- Production standalone server uses Node instead of requiring Bun.
- PWA/metadata starts the HELE identity transition.

### Next

- Fix every TypeScript/lint issue surfaced by CI.
- Add unit/integration tests for auth, Guardian and IPTV validation.
- Align Prisma packages to one compatible major/minor line.
- Replace ephemeral production SQLite fallback with an explicitly configured persistent database.
- Remove unused `User`/`Post` Prisma models if still unused.

## Phase 2 — Architecture

Move away from one giant SPA router and monolithic store incrementally.

Target routes:

```text
/
 /movies
 /series
 /live
 /search
 /library
 /watch/[type]/[id]
 /settings
 /admin
 /admin/guardian
 /admin/sources
 /admin/jobs
```

Target feature modules:

```text
src/features/
  auth/
  catalog/
  player/
  live-tv/
  library/
  guardian/
  cast/
  settings/
```

Do not rewrite all views at once. Introduce route and feature boundaries one vertical slice at a time.

## Phase 3 — Guardian 2

Background work should not depend on an in-memory `node-cron` scheduler in a serverless deployment.

Target model:

```text
Scheduler -> authenticated job endpoint -> job execution
                                  -> scan
                                  -> discovery
                                  -> health scoring
                                  -> persistence
```

Add:

- idempotent jobs;
- job locks;
- retry policy;
- scan history;
- source health score;
- structured logging;
- observable job status.

## Phase 4 — HELE product layer

Product surfaces:

1. Home
2. Watch
3. Discover
4. Library
5. Live
6. Control Center

The visual redesign starts only after the foundation branch is green and deployable.

## Repository cleanup

The application runtime is much smaller than the repository's experimental/support material. Move non-runtime research, downloads and reusable skill packs into a separate lab/tooling repository or archive so AI agents and developers operate on a focused codebase.

Do this as a dedicated cleanup PR rather than mixing hundreds of deletions into the security foundation.

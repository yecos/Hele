# HELE

**Your media. One place.**

HELE is a personal media platform built with Next.js, React, Prisma and a modular live-TV/streaming stack.

## Foundation goals

The `hele-1.0-foundation` branch establishes the base for HELE 1.0:

- fail-closed authentication for privileged routes;
- no tracked environment secrets;
- strict TypeScript production builds;
- automated lint/type checks;
- production-safe Node standalone start;
- HELE PWA/product identity;
- an incremental path from the current SPA toward a modular Media OS.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Configure your own credentials and API keys.
3. Install dependencies:

```bash
npm ci
```

4. Generate Prisma:

```bash
npm run db:generate
```

5. Start development:

```bash
npm run dev
```

## Quality gates

```bash
npm run check
npm run build
```

Pull requests are checked automatically for tracked secrets, lint errors and TypeScript errors.

## Security

Never commit real `.env` files.

If a secret has ever been committed to repository history, removing the file from the latest commit is not sufficient. Rotate the credential at its provider and, when appropriate, rewrite repository history.

Admin APIs must authorize with a validated NextAuth session. Client-provided role or admin headers are not trusted for privileged operations.

## Architecture direction

HELE 1.0 is organized around six product surfaces:

- **Home** — personalized entry point and continue watching.
- **Watch** — unified player for VOD and live media.
- **Discover** — universal content discovery and search.
- **Library** — favorites, history, lists and synchronized progress.
- **Live** — live TV, guide, channel health and favorites.
- **Control Center** — Guardian, sources, jobs, health and diagnostics.

See `docs/hele-1.0-foundation.md` for the implementation roadmap.

## Content

Use HELE only with media and streams you are authorized to access, including public, licensed or personally owned sources.

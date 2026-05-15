# Contexto Maestro - XuperStream (Hele)

> Este archivo es el contexto que TODA IA debe leer antes de trabajar en este proyecto.

## Información del Proyecto

- **Nombre**: XuperStream (Hele)
- **Versión**: 0.2.0
- **Repositorio**: https://github.com/yecos/Hele
- **Deploy**: https://hele-nu.vercel.app
- **Admin**: yecos11@gmail.com

## Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4 + shadcn/ui (48 componentes)
- **Estado**: Zustand 5 (8 stores)
- **Base de datos**: Prisma + SQLite/libSQL
- **Auth**: NextAuth.js 4 (Google OAuth + Credentials)
- **IPTV**: HLS.js + M3U parser
- **Deploy**: Vercel + Docker (standalone output)

## Estructura del Proyecto

```
src/
├── app/
│   ├── api/          # 18 API routes
│   ├── layout.tsx    # Root layout con AuthProvider, SplashScreen, Toaster
│   ├── page.tsx      # SPA principal
│   └── globals.css   # Estilos globales + keyframes
├── components/
│   ├── AuthProvider.tsx    # NextAuth SessionProvider + SessionSync
│   ├── SplashScreen.tsx   # Splash sin framer-motion (CSS transitions)
│   ├── InitScripts.tsx    # Inicialización PWA/service worker
│   ├── OnboardingTutorial.tsx
│   ├── ViewTransition.tsx
│   ├── guardian/          # AdminPanel
│   ├── iptv/              # IPTV components
│   ├── streaming/         # MovieCard, VideoPlayer, HeroBanner, etc.
│   ├── ui/                # 48 shadcn/ui components
│   └── views/             # 10 vistas (Home, Movies, Series, IPTV, etc.)
├── hooks/                 # use-chromecast, use-mobile, use-toast
├── lib/
│   ├── store.ts           # 8 Zustand stores (auth, view, player, cast, favorites, history, xuper, iptv)
│   ├── i18n.ts            # ~350 keys × 3 idiomas (es, en, pt) - INLINE
│   ├── users.ts           # Usuarios hardcodeados
│   ├── admin-config.ts    # Config de admin (emails, roles)
│   ├── admin-guard.ts     # Verificación server-side de admin
│   ├── db.ts              # Prisma client singleton
│   ├── sources.ts         # 17 servidores de streaming
│   ├── tmdb.ts            # TMDB API wrapper
│   ├── tmdb-utils.ts      # Client-side TMDB cache
│   ├── iptv-channels.ts   # Canales premium hardcodeados
│   ├── guardian/          # Scanner, Discovery, Scheduler, XuperClient, XuperMonitor
│   └── utils.ts           # cn() utility
└── types/
    └── google.d.ts        # NextAuth type extensions
```

## Módulos Críticos

### Auth (PRIORIDAD ALTA)
- NextAuth con Google OAuth + Credentials
- AuthProvider ↔ SessionSync ↔ Zustand AuthStore
- Admin: yecos11@gmail.com → role admin
- **NO MODIFICAR** la estrategia JWT sin aprobación

### Guardian (PRIORIDAD ALTA)
- Scanner + Discovery + Scheduler corren en background
- Cron: 6am, 12pm, 6pm, 3am
- **NO MODIFICAR** scheduler sin probar timing

### Streaming (PRIORIDAD MEDIA)
- TMDB proxy → Server probing → iframe embed
- Server selection automático por latencia
- **NO MODIFICAR** CSP sin considerar iframe requirements

### IPTV (PRIORIDAD MEDIA)
- M3U parsing + HLS playback + Chromecast
- Verificación batch de canales
- Auto-skip de canales muertos

## Restricciones

1. **Dark mode only** — No implementar light mode
2. **SPA** — Toda navegación es client-side vía Zustand
3. **No SSR** — Contenido dinámico solo en cliente
4. **localStorage** — Toda persistencia de estado en cliente
5. **CSP** — Headers de seguridad obligatorios en middleware.ts
6. **No tests** — No hay tests actualmente, pero build debe pasar

## Patrones de Código

### Zustand Store
```typescript
export const useXStore = create<XState>((set, get) => ({
  // state
  field: initialValue,
  // actions
  setField: (val) => set({ field: val }),
}));
```

### API Route
```typescript
export async function GET(request: Request) {
  try {
    // lógica
    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json({ success: false, error: 'Mensaje' }, { status: 500 });
  }
}
```

### Admin Protected Route
```typescript
import { isAdminFromSession } from '@/lib/admin-guard';

export async function POST(request: Request) {
  const { isAdmin } = await isAdminFromSession(request);
  if (!isAdmin) {
    return Response.json({ error: 'Acceso denegado' }, { status: 403 });
  }
  // lógica admin
}
```

## Archivos Protegidos

Estos archivos requieren aprobación explícita antes de modificar:
- `src/lib/store.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/components/AuthProvider.tsx`
- `middleware.ts`
- `prisma/schema.prisma`
- `src/lib/admin-guard.ts`
- `src/lib/admin-config.ts`

## Problemas Conocidos

1. `ignoreBuildErrors: true` en next.config.ts oculta errores TypeScript
2. Clave 3DES hardcodeada en `xuper-client.ts`
3. i18n inline (~1000 líneas) difícil de mantener
4. No hay rate limiting en API routes
5. No hay tests
6. Auth legacy y NextAuth coexisten (deuda técnica)
7. `reactStrictMode: false` debería estar activado

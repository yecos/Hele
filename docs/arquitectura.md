# Arquitectura de XuperStream (Hele)

## Visión General

XuperStream es una plataforma personal de streaming tipo Netflix/Disney+ construida como SPA (Single Page Application) con Next.js 16. El proyecto integra múltiples fuentes de contenido (TMDB, IPTV, Xuper TV) en una interfaz unificada con sistema de autenticación dual y gestión de contenido en vivo.

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js (App Router) | 16.1 |
| UI | React + Tailwind CSS 4 | 19.0 |
| Componentes | shadcn/ui (Radix) | 48 componentes |
| Estado | Zustand | 5.0 |
| Base de datos | Prisma + SQLite/libSQL | 6.x |
| Autenticación | NextAuth.js (Google + Credentials) | 4.24 |
| IPTV | HLS.js + M3U Parser | 1.6 |
| Streaming | iframe embeds + server probing | - |
| Despliegue | Vercel + Docker (standalone) | - |
| Idiomas | es, en, pt (i18n inline) | - |

## Arquitectura de la Aplicación

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER / PWA                     │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Splash  │→ │  Login   │→ │   Main App SPA   │   │
│  │ Screen  │  │  View    │  │  (Zustand Router) │   │
│  └─────────┘  └──────────┘  └──────────────────┘   │
│                     │                               │
│         ┌───────────┼───────────┐                   │
│         ▼           ▼           ▼                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Auth    │ │  Player  │ │ Favorites│           │
│  │  Store   │ │  Store   │ │  Store   │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│         │           │           │                   │
│         ▼           ▼           ▼                   │
│  localStorage (xs-auth, xuper-*, xs-iptv-*)        │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              NEXT.JS API ROUTES                      │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ /api/auth  │  │ /api/tmdb  │  │ /api/xuper   │  │
│  │ NextAuth   │  │ TMDB Proxy │  │ Xuper Client │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ /api/iptv  │  │ /api/guard │  │ /api/sources │  │
│  │ Channels   │  │ Scanner    │  │ Streaming    │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              DATOS & SERVICIOS EXTERNOS              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  SQLite  │  │   TMDB   │  │  Xuper TV (3DES) │  │
│  │ (Prisma) │  │   API    │  │  Encrypted API   │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│  ┌──────────┐  ┌──────────┐                         │
│  │  IPTV    │  │  Google  │                         │
│  │  M3U/HLS │  │  OAuth   │                         │
│  └──────────┘  └──────────┘                         │
└─────────────────────────────────────────────────────┘
```

## Módulos del Sistema

### 1. Autenticación (Auth)
- **NextAuth.js**: Google OAuth + Credentials provider
- **AuthProvider**: SessionProvider + SessionSync (NextAuth → Zustand)
- **Admin Guard**: Verificación por username, email o role (JWT)
- **Usuarios locales**: Hardcodeados en `users.ts` con passwords de env vars

### 2. Streaming (Movies/Series)
- **TMDB API**: Proxy a través de `/api/tmdb` para búsqueda, trending, detalles
- **Fuentes**: 17 servidores embed (4 latino + 13 subtitulados)
- **Server Probing**: Medición de latencia para auto-selección
- **VideoPlayer**: iframe con bloqueo de popups y overlays

### 3. IPTV (TV en Vivo)
- **Fuentes**: iptv-org, TDTChannels, Free-TV, M3U.CL, canales premium
- **Reproductor**: HLS.js con fallback Safari nativo
- **Verificación**: Batch HEAD requests para validar canales
- **Auto-skip**: Salta canales muertos con cuenta regresiva de 3 segundos

### 4. Guardian (Sistema de Monitoreo)
- **Scanner**: Descarga M3U playlists, valida streams, almacena en DB
- **Discovery**: 4 motores (Seed, Web Scraper, GitHub, Xtream)
- **Scheduler**: 6 cron tasks (4 guardian + 2 xuper)
- **Xuper Monitor**: DNS-over-HTTPS + HTTP health checks

### 5. Chromecast
- **Google Cast SDK** con receiver personalizado
- **Modo default**: Solo IPTV (HLS) funciona en TV
- **Modo custom receiver**: Embed URLs + IPTV via iframe

### 6. i18n (Internacionalización)
- **3 idiomas**: es (español), en (inglés), pt (portugués)
- **~350 keys** por idioma, inline en `i18n.ts`
- **Zustand store** con persistencia localStorage

## Flujo de Datos Principal

### Login Flow
```
Usuario → LoginView → signIn('google'|'credentials')
  → NextAuth → JWT Token → SessionProvider
  → SessionSync → Zustand AuthStore → localStorage (xs-auth)
  → App muestra HomeView
```

### Streaming Flow
```
Usuario → MovieCard → MovieDetailModal
  → TMDB detail API → Server probing
  → VideoPlayer (iframe) → Stream playback
  → WatchHistoryStore (progreso, timestamp)
```

### IPTV Flow
```
Usuario → IPTVView → Carga M3U playlists
  → Verificación batch → Canales activos
  → HLS.js playback → Chromecast (opcional)
  → IptvFavoritesStore + IptvRecentStore
```

## Almacenamiento

### Base de Datos (Prisma/SQLite)
- GuardianSource, GuardianScan, DiscoveredSource, VerifiedChannel
- XuperSession, XuperMonitorLog
- User, Post (sin uso actualmente)

### localStorage (Cliente)
| Key | Contenido | Store |
|-----|-----------|-------|
| `xs-auth` | Auth token + username + role | AuthStore |
| `xuper-favorites` | Películas/series favoritas | FavoritesStore |
| `xuper-history` | Historial de reproducción | HistoryStore |
| `xuper-session` | Sesión Xuper TV | XuperStore |
| `xs-iptv-favorites` | Canales IPTV favoritos | IptvFavoritesStore |
| `xs-iptv-recent` | Canales IPTV recientes | IptvRecentStore |

## Seguridad

### Implementado
- CSP headers via middleware.ts
- X-Frame-Options, X-XSS-Protection, X-Content-Type-Options
- JWT sessions con NEXTAUTH_SECRET
- Admin verification por email/username/role
- URL validation en Google OAuth redirect

### Pendiente
- Rate limiting en API routes
- CSRF tokens en formularios
- Encriptación de datos sensibles en localStorage
- Validación de input server-side consistente
- Mover claves hardcodeadas a variables de entorno

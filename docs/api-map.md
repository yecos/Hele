# API Map - XuperStream

## Autenticación

### `POST /api/auth/[...nextauth]`
- **Handler**: NextAuth.js
- **Descripción**: Todas las rutas de NextAuth (signin, signout, callback, session)
- **Auth**: Pública (es el endpoint de auth)
- **Providers**: Google OAuth, Credentials

### `POST /api/auth/login`
- **Handler**: Legacy auth
- **Descripción**: Login legacy con username/password (sin NextAuth)
- **Auth**: Pública
- **Request**: `{ username: string, password: string }`
- **Response**: `{ success: boolean, username?: string, token?: string, error?: string }`

---

## TMDB (The Movie Database)

### `GET /api/tmdb`
- **Handler**: TMDB proxy
- **Descripción**: Proxy a la API de TMDB para buscar películas y series
- **Auth**: Pública
- **Query Params**:
  - `type`: `trending` | `popular` | `search` | `detail` | `genres` | `season` | `recommendations` | `similar` | `credits`
  - `q`: Query de búsqueda (para type=search)
  - `id`: ID de TMDB (para type=detail, season, recommendations, similar, credits)
  - `season`: Número de temporada (para type=season)
  - `mediaType`: `movie` | `tv`
  - `page`: Número de página
- **Response**: JSON directo de TMDB API

---

## Streaming

### `POST /api/probe-servers`
- **Descripción**: Mide la latencia de los servidores de streaming
- **Auth**: Pública
- **Request**: `{ tmdbId: number, mediaType: 'movie' | 'tv', season?: number, episode?: number }`
- **Response**: `{ results: ServerResult[] }` ordenados por latencia

### `GET /api/sources/pelisjuanita`
- **Descripción**: Proxy a fuente PelisJuanita
- **Auth**: Pública
- **Response**: Contenido de la fuente

---

## IPTV

### `GET /api/iptv`
- **Descripción**: Lista de canales IPTV de todas las fuentes
- **Auth**: Pública
- **Query Params**:
  - `source`: `all` | `iptv-org` | `tdt` | `free-tv` | `m3u-cl` | `premium`
  - `country`: Código de país (co, mx, es, etc.)
- **Response**: `{ channels: IPTVChannel[] }`

### `POST /api/iptv/verify`
- **Descripción**: Verifica si un conjunto de URLs IPTV están activas
- **Auth**: Pública
- **Request**: `{ urls: string[] }`
- **Response**: `{ results: { url: string, valid: boolean, latencyMs: number }[] }`

---

## Guardian (Sistema de Monitoreo)

### `GET /api/guardian/status`
- **Descripción**: Estado general del sistema Guardian
- **Auth**: Pública
- **Response**: `{ running: boolean, lastScan: string|null, channels: number, sources: number }`

### `GET /api/guardian/channels`
- **Descripción**: Canales verificados por el Guardian
- **Auth**: Pública
- **Query Params**: `country`, `group`, `quality`
- **Response**: `{ channels: VerifiedChannel[] }`

### `GET /api/guardian/admin`
- **Descripción**: Dashboard de administración del Guardian
- **Auth**: **ADMIN** (requiere `isAdminFromSession()` o `requireAdmin()`)
- **Response**: Estadísticas detalladas, historial de scans, estado de fuentes

### `POST /api/guardian/scan`
- **Descripción**: Ejecutar un scan manual de canales
- **Auth**: **ADMIN**
- **Request**: `{ sources?: string[] }`
- **Response**: `{ started: boolean, scanId: string }`

### `GET /api/guardian/discover`
- **Descripción**: Estado del sistema de discovery
- **Auth**: Pública
- **Response**: `{ running: boolean, engines: EngineStatus[] }`

### `POST /api/guardian/discover/run`
- **Descripción**: Ejecutar discovery manual
- **Auth**: **ADMIN**
- **Request**: `{ engines?: string[] }`
- **Response**: `{ started: boolean }`

---

## Xuper TV

### `POST /api/xuper/login`
- **Descripción**: Login al servicio Xuper TV
- **Auth**: Pública
- **Request**: `{ username: string, password: string }`
- **Response**: `{ success: boolean, error?: string }`

### `GET /api/xuper/channels`
- **Descripción**: Lista de canales Xuper TV
- **Auth**: Pública (requiere sesión Xuper activa en servidor)
- **Response**: `{ channels: XuperChannel[] }`

### `POST /api/xuper/play`
- **Descripción**: Iniciar reproducción de canal Xuper
- **Auth**: Pública (requiere sesión Xuper activa)
- **Request**: `{ channelId: string }`
- **Response**: `{ success: boolean, url?: string, format?: string }`

### `GET /api/xuper/status`
- **Descripción**: Estado del cliente Xuper TV
- **Auth**: Pública
- **Response**: `{ success: boolean, connectivity: {...}, client: {...} }`

### `GET /api/xuper/monitor`
- **Descripción**: Resultados del monitoreo de dominios Xuper
- **Auth**: Pública
- **Response**: `{ logs: XuperMonitorLog[], current: MonitorStatus }`

---

## General

### `GET /api/`
- **Descripción**: Root API endpoint
- **Auth**: Pública
- **Response**: `{ status: 'ok', version: string }`

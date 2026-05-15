# Database Schema - XuperStream

## Información General

- **Motor**: SQLite (local) / libSQL (Turso cloud)
- **ORM**: Prisma 6.x
- **Archivo**: `prisma/schema.prisma`
- **Migraciones**: `prisma db push` (sin migraciones formales)

## Modelo Entidad-Relación

```
┌──────────────┐       ┌──────────────┐
│     User     │       │     Post     │
├──────────────┤       ├──────────────┤
│ id (PK)      │←──────│ authorId (FK)│
│ email (UQ)   │       │ id (PK)      │
│ name         │       │ title        │
│ createdAt    │       │ content      │
│ updatedAt    │       │ published    │
└──────────────┘       │ createdAt    │
                       │ updatedAt    │
                       └──────────────┘

┌──────────────────┐       ┌──────────────────┐
│  GuardianSource  │       │   GuardianScan   │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ name             │       │ status           │
│ url              │       │ totalSources     │
│ type             │       │ totalChannels    │
│ category         │       │ workingChannels  │
│ enabled          │       │ failedChannels   │
│ priority         │       │ durationMs       │
│ createdAt        │       │ error            │
│ updatedAt        │       │ startedAt        │
└──────────────────┘       │ completedAt      │
                           │ trigger          │
                           └──────────────────┘
                                   │
                                   │ scanId
                                   ▼
┌──────────────────┐       ┌──────────────────┐
│ DiscoveredSource │       │ VerifiedChannel  │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ url (UQ)         │       │ scanId           │
│ name             │       │ sourceId         │
│ sourceUrl        │       │ name             │
│ discoveryEngine  │       │ logo             │
│ channelCount     │       │ group            │
│ isValid          │       │ url (UQ)         │
│ addedToGuardian  │       │ country          │
│ lastChecked      │       │ quality          │
│ createdAt        │       │ playlist         │
└──────────────────┘       │ createdAt        │
                           └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│  XuperSession    │       │ XuperMonitorLog  │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ userId           │       │ dcsAvailable     │
│ username         │       │ domainsChecked   │
│ token            │       │ domainsOk        │
│ portalDomain     │       │ portalLatencyMs  │
│ vipLevel         │       │ configOk         │
│ expireTime       │       │ details (JSON)   │
│ isActive         │       │ createdAt        │
│ lastHeartbeat    │       └──────────────────┘
│ createdAt        │
│ updatedAt        │
└──────────────────┘
```

## Detalle de Modelos

### User
| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | String | @id @default(cuid()) | Identificador único |
| email | String | @unique | Email del usuario |
| name | String? | - | Nombre del usuario |
| createdAt | DateTime | @default(now()) | Fecha de creación |
| updatedAt | DateTime | @updatedAt | Última actualización |

**Nota**: Actualmente los usuarios se manejan en `users.ts` (hardcodeados), no en DB. Este modelo está sin uso.

### Post
| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | String | @id @default(cuid()) | Identificador único |
| title | String | - | Título del post |
| content | String? | - | Contenido |
| published | Boolean | @default(false) | Estado de publicación |
| authorId | String | - | ID del autor (FK → User) |
| createdAt | DateTime | @default(now()) | Fecha de creación |
| updatedAt | DateTime | @updatedAt | Última actualización |

**Nota**: Modelo sin uso actualmente. Boilerplate de Prisma.

### GuardianSource
| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | String | @id @default(cuid()) | Identificador único |
| name | String | - | Nombre descriptivo |
| url | String | - | URL del playlist M3U |
| type | String | @default("m3u") | "m3u" \| "xtream" |
| category | String | @default("country") | "country" \| "category" \| "extra" \| "xtream" |
| enabled | Boolean | @default(true) | Si está activo |
| priority | Int | @default(0) | Mayor = más prioritario |
| createdAt | DateTime | @default(now()) | Fecha de creación |
| updatedAt | DateTime | @updatedAt | Última actualización |

### GuardianScan
| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | String | @id @default(cuid()) | Identificador único |
| status | String | @default("running") | "running" \| "completed" \| "failed" |
| totalSources | Int | @default(0) | Total fuentes escaneadas |
| totalChannels | Int | @default(0) | Total canales encontrados |
| workingChannels | Int | @default(0) | Canales funcionales |
| failedChannels | Int | @default(0) | Canales caídos |
| durationMs | Int | @default(0) | Duración del scan en ms |
| error | String? | - | Error si falló |
| startedAt | DateTime | @default(now()) | Inicio del scan |
| completedAt | DateTime? | - | Fin del scan |
| trigger | String | @default("scheduled") | "scheduled" \| "manual" |

### DiscoveredSource
| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | String | @id @default(cuid()) | Identificador único |
| url | String | @unique | URL del M3U (única) |
| name | String | @default("") | Nombre del sitio |
| sourceUrl | String | @default("") | URL de la página origen |
| discoveryEngine | String | @default("web") | "web" \| "github" \| "scraped" \| "xtream" |
| channelCount | Int | @default(0) | Canales en la última validación |
| isValid | Boolean | @default(false) | Si devuelve M3U válido |
| addedToGuardian | Boolean | @default(false) | Si fue promovida al Guardian |
| lastChecked | DateTime | @default(now()) | Última verificación |
| createdAt | DateTime | @default(now()) | Fecha de descubrimiento |

### VerifiedChannel
| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | String | @id @default(cuid()) | Identificador único |
| scanId | String | - | ID del scan que lo verificó |
| sourceId | String | - | ID de la fuente origen |
| name | String | - | Nombre del canal |
| logo | String | @default("") | URL del logo |
| group | String | @default("General") | Grupo/categoría |
| url | String | @unique | URL del stream (única) |
| country | String | @default("") | País |
| quality | String | @default("SD") | Calidad |
| playlist | String | @default("") | ID del playlist original |
| createdAt | DateTime | @default(now()) | Fecha de verificación |

### XuperSession
| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | String | @id @default(cuid()) | Identificador único |
| userId | String | - | ID del usuario Xuper |
| username | String | - | Username en Xuper |
| token | String | - | Token de sesión (encriptado) |
| portalDomain | String | @default("") | Dominio portal activo |
| vipLevel | Int | @default(0) | Nivel VIP |
| expireTime | String | @default("") | Fecha de expiración |
| isActive | Boolean | @default(true) | Sesión activa |
| lastHeartbeat | DateTime | @default(now()) | Último heartbeat |
| createdAt | DateTime | @default(now()) | Fecha de creación |
| updatedAt | DateTime | @updatedAt | Última actualización |

### XuperMonitorLog
| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| id | String | @id @default(cuid()) | Identificador único |
| dcsAvailable | Boolean | @default(false) | DCS respondió |
| domainsChecked | Int | @default(0) | Total dominios chequeados |
| domainsOk | Int | @default(0) | Dominios OK |
| portalLatencyMs | Int | @default(0) | Latencia del portal |
| configOk | Boolean | @default(false) | Config endpoint OK |
| details | String | @default("{}") | JSON con detalles por dominio |
| createdAt | DateTime | @default(now()) | Fecha del log |

## Índices

- `User.email` — @unique
- `DiscoveredSource.url` — @unique
- `VerifiedChannel.url` — @unique

## Notas

1. No hay relaciones formales (Foreign Keys) definidas en Prisma entre los modelos Guardian
2. `scanId` y `sourceId` en VerifiedChannel son lógicos, no FK constraint
3. Los modelos User y Post son boilerplate sin uso actual
4. La tabla se limpia y regenera en cada scan de Guardian (VerifiedChannel)

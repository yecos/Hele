# XuperStream - Guia de Despliegue

## Requisitos Previos

- Cuenta en [Neon](https://neon.tech) (PostgreSQL serverless - Free Tier)
- Cuenta en [Vercel](https://vercel.com) (Hosting - Free Tier)
- Cuenta en [GitHub](https://github.com) con el repo `yecos/Hele`
- API Key de [TMDB](https://www.themoviedb.org/settings/api)

---

## Paso 1: Crear Base de Datos en Neon

1. Ir a [neon.tech](https://neon.tech) e iniciar sesion
2. Crear un nuevo proyecto (nombre: `xuperstream`)
3. Copiar las URLs de conexion:
   - **Pooled Connection URL** (para la app en runtime):
     ```
     postgresql://xuperstream_user:xxxxx@ep-xxx.us-east-2.aws.neon.tech/xuperstream?sslmode=require&pgbouncer=true
     ```
   - **Direct Connection URL** (para migraciones/seed):
     ```
     postgresql://xuperstream_user:xxxxx@ep-xxx.us-east-2.aws.neon.tech/xuperstream?sslmode=require
     ```

> **Nota:** Las URLs se obtienen desde el Dashboard de Neon > Connection Details

---

## Paso 2: Desplegar en Vercel

### Opcion A: Desde GitHub (Recomendado)

1. Ir a [vercel.com](https://vercel.com) e iniciar sesion con GitHub
2. Click **"Add New" > "Project"**
3. Seleccionar el repositorio `yecos/Hele`
4. En **Build and Output Settings**:
   - **Framework Preset**: Next.js
   - **Build Command**: `npx prisma generate && next build`
   - **Output Directory**: `.next`
5. En **Environment Variables**, agregar:

| Variable | Valor | Nota |
|----------|-------|------|
| `DATABASE_URL` | `postgresql://...neon.tech/xuperstream?sslmode=require&pgbouncer=true` | Pooled URL de Neon |
| `DIRECT_DATABASE_URL` | `postgresql://...neon.tech/xuperstream?sslmode=require` | Direct URL de Neon |
| `TMDB_API_KEY` | Tu API key de TMDB | Se obtiene en themoviedb.org |
| `JWT_SECRET` | Una cadena aleatoria segura | Min 32 caracteres |
| `NEXT_PUBLIC_APP_URL` | `https://tu-dominio.vercel.app` | Tu URL de Vercel |

6. Click **"Deploy"** y esperar a que termine

### Opcion B: Con Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Desplegar (follow prompts)
cd xuper-stream
vercel

# Desplegar a produccion
vercel --prod
```

---

## Paso 3: Ejecutar Migraciones y Seed

Despues del primer despliegue, ejecutar las migraciones:

```bash
# Instalar dependencias localmente
npm install

# Generar cliente Prisma
npx prisma generate

# Crear tablas en la base de datos
npx prisma db push

# (Opcional) Poblar datos de demostracion
npx prisma db seed
```

**Nota:** Tambien puedes ejecutar estos comandos desde el panel de Neon > SQL Editor

### Comando SQL alternativo para crear tablas

Si no puedes ejecutar Prisma localmente, usa el SQL Editor de Neon:

```sql
-- Las tablas se crean automaticamente con: npx prisma db push
-- O ejecuta este comando desde tu terminal local:
-- DATABASE_URL="postgresql://..." npx prisma db push
```

---

## Paso 4: Configurar Dominio Personalizado (Opcional)

### En Vercel:

1. Ir al Dashboard del proyecto en Vercel
2. **Settings > Domains**
3. Agregar tu dominio (ej: `xuperstream.com`)
4. Configurar DNS en tu registrador:

| Tipo | Nombre | Valor |
|------|--------|-------|
| CNAME | `@` o `www` | `cname.vercel-dns.com` |

5. Vercel genera automaticamente certificado SSL

### Tambien puedes usar:
- **Freenom**: Dominios gratuitos `.tk`, `.ml`, `.ga`
- **Cloudflare**: DNS + CDN gratis
- **Namecheap / GoDaddy**: Dominios de pago

---

## Paso 5: Monitoreo

### Vercel (Incluido)
- **Analytics**: Vercel > Analytics tab (funciones, invocaciones, errores)
- **Logs**: Vercel > Logs tab (tiempo real)
- **Speed Insights**: Core Web Vitals
- **Deployments**: Historial de deploys

### Neon (Incluido)
- **Dashboard**: Queries activos, conexiones, storage
- **Metrics**: CPU, memoria, I/O
- **Branching**: Branch de desarrollo aislado

### Recomendado: UptimeRobot (Gratis)
1. Crear cuenta en [uptimerobot.com](https://uptimerobot.com)
2. Agregar monitor HTTP: `https://tu-dominio.vercel.app`
3. Intervalo: 5 minutos
4. Notificaciones: Email, Slack, Telegram

---

## Variables de Entorno - Resumen

```
# Base de Datos PostgreSQL (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require&pgbouncer=true
DIRECT_DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require

# TMDB API
TMDB_API_KEY=a54c01f270c387c930fffa633f79c0f7

# Autenticacion
JWT_SECRET=tu-clave-super-secreta-aleatoria-min-32-chars

# URL de la app (para CORS y redirects)
NEXT_PUBLIC_APP_URL=https://xuperstream.vercel.app
```

---

## Arquitectura de Produccion

```
[Usuario] → [Vercel CDN] → [Next.js Serverless]
                                  ↓
                          [TMDB API] (metadatos)
                          [Neon PostgreSQL] (usuarios, favoritos, historial)
                          [Streaming Servers] (vidsrc, embed.su, etc.)
```

---

## Troubleshooting

### Error: "TMDB_API_KEY is not configured"
- Verificar que `TMDB_API_KEY` esta en Environment Variables de Vercel
- Hacer redeploy despues de cambiar variables

### Error: "Can't reach database server"
- Verificar `DATABASE_URL` y `DIRECT_DATABASE_URL` en Vercel
- Activar "Enable Neon Serverless Driver" si aparece la opcion
- Verificar que la IP de Vercel no esta bloqueada en Neon

### Error: "Prisma Client not generated"
- El build command ya incluye `npx prisma generate`
- Si persiste, agregar script postinstall en package.json:
  ```json
  "postinstall": "prisma generate"
  ```

### Error de iframe (video no carga)
- Verificar que `vercel.json` incluye headers `X-Frame-Options: ALLOWALL`
- Los servidores de streaming (vidsrc, etc.) pueden bloquear ciertos dominios

### Build falla
- Revisar logs en Vercel > Deployments > Build Logs
- Verificar que todas las dependencias estan en package.json

---

## Comandos Utiles

```bash
# Desarrollo local
DATABASE_URL="file:./dev.db" npm run dev

# Generar Prisma client
npx prisma generate

# Crear/actualizar tablas
DATABASE_URL="postgresql://..." npx prisma db push

# Verificar conexion a DB
npx prisma db execute --stdin <<< "SELECT 1"

# Seed de datos demo
DATABASE_URL="postgresql://..." node src/lib/seed.ts

# Build local (para verificar)
npx prisma generate && npm run build

# Desplegar a produccion
vercel --prod
```

---

## Costo Estimado (Free Tier)

| Servicio | Plan | Costo | Limites |
|----------|------|-------|---------|
| Vercel | Hobby | $0/mes | 100GB bandwidth, serverless functions |
| Neon | Free | $0/mes | 0.5GB storage, 100hr compute/mes |
| TMDB | Free | $0/mes | ~50 requests/segundo |
| Dominio | - | $0-15/ano | Gratuito con Freenom |

**Total: $0/mes** (con dominio gratuito) o **~$1.25/mes** (con dominio de pago)

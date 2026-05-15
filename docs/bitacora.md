# Bitácora del Proyecto XuperStream

## Formato de Entrada

```
## [Fecha] - Módulo: [Nombre]
**Cambios:**
- [Descripción del cambio]

**Archivos modificados:**
- [ruta/al/archivo]

**Decisiones:**
- [Decisión tomada y por qué]

**Pendientes:**
- [Tareas pendientes derivadas]
```

---

## [2026-05-15] - Módulo: Documentación

**Cambios:**
- Creación de estructura profesional de documentación siguiendo el Sistema Operativo para IA
- Creación de /docs/ con arquitectura, reglas, decisiones, bitácora, api-map, database-schema
- Creación de /ai/ con context.md, memory.json, system-rules.md
- Creación de CHANGELOG.md y roadmap.md
- Mover clave 3DES hardcodeada a variable de entorno
- Mejorar next.config.ts: activar strictMode, mejorar configuración

**Archivos modificados:**
- docs/arquitectura.md (nuevo)
- docs/reglas.md (nuevo)
- docs/decisiones.md (nuevo)
- docs/bitacora.md (nuevo)
- docs/api-map.md (nuevo)
- docs/database-schema.md (nuevo)
- ai/context.md (nuevo)
- ai/memory.json (nuevo)
- ai/system-rules.md (nuevo)
- CHANGELOG.md (nuevo)
- roadmap.md (nuevo)
- src/lib/guardian/xuper-client.ts (seguridad)
- next.config.ts (mejora)
- .env (agregar XUPER_DES_KEY)

**Decisiones:**
- Se adoptó el sistema de documentación profesional del PDF "Sistema Operativo para IA"
- La clave 3DES se movió a env var por seguridad, con fallback al valor conocido
- next.config.ts se mejoró con strictMode activado

**Pendientes:**
- Migrar i18n de inline a archivos JSON por locale
- Implementar rate limiting en API routes
- Agregar tests unitarios básicos
- Evaluar migración de auth legacy a solo NextAuth

---

## [2026-05-14] - Módulo: Auth

**Cambios:**
- Migración a NextAuth con Google OAuth
- OAuth Google integrado completamente
- AuthProvider creado como puente NextAuth ↔ Zustand
- Admin configurado para yecos11@gmail.com
- Credenciales visibles removidas del login screen
- Fix: error rojo "Could not sign in" ya no aparece falsamente

**Archivos modificados:**
- src/app/api/auth/[...nextauth]/route.ts
- src/components/AuthProvider.tsx (nuevo)
- src/lib/store.ts
- src/lib/admin-guard.ts
- src/lib/admin-config.ts (nuevo)
- src/components/views/LoginView.tsx
- src/app/layout.tsx

**Decisiones:**
- Se usa `signIn('google', { redirect: false })` para evitar error falso
- SessionSync mapea email admin a username 'admin'
- ErrorBoundary en AuthProvider para que NextAuth no rompa la app

**Pendientes:**
- Ninguno para este módulo

---

## [2026-05-14] - Módulo: UI

**Cambios:**
- SplashScreen reescrito sin framer-motion (causaba z-[9999] blocking en producción)
- CSS transitions y keyframes para animaciones de splash
- ErrorBoundary agregado a AuthProvider

**Archivos modificados:**
- src/components/SplashScreen.tsx
- src/app/globals.css
- src/components/AuthProvider.tsx

**Decisiones:**
- framer-motion AnimatePresence no removía DOM elements en producción
- Se reemplazó con CSS transitions puras y timer de seguridad de 3 segundos

**Pendientes:**
- Ninguno para este módulo

---

## [2026-05-14] - Módulo: Deploy

**Cambios:**
- Creación de vercel.json para despliegue en Vercel
- Fix: deploy no se activaba sin vercel.json

**Archivos modificados:**
- vercel.json (nuevo)

**Decisiones:**
- Framework: nextjs, buildCommand: npm run build

**Pendientes:**
- Ninguno

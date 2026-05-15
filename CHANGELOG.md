# Changelog - XuperStream

Todos los cambios notables del proyecto se documentan aquí.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

## [0.2.0] - 2026-05-15

### Añadido
- Estructura profesional de documentación `/docs/` (arquitectura, reglas, decisiones, bitácora, api-map, database-schema)
- Sistema de contexto persistente para IA `/ai/` (context.md, memory.json, system-rules.md)
- CHANGELOG.md y roadmap.md
- Clave 3DES movida a variable de entorno (`XUPER_DES_KEY`)

### Corregido
- next.config.ts: `reactStrictMode` activado
- Seguridad: clave 3DES ya no está hardcodeada en el código fuente

### Seguridad
- `XUPER_DES_KEY` como env var con fallback al valor conocido

## [0.1.0] - 2026-05-14

### Añadido
- Integración Google OAuth con NextAuth.js
- `AuthProvider.tsx` con SessionProvider + SessionSync
- `admin-config.ts` para configuración centralizada de admin
- Admin por email (yecos11@gmail.com) para Google login
- `vercel.json` para deploy en Vercel
- Traducciones actualizadas (es, en, pt)

### Corregido
- Fix: `loginWithGoogle` usa `signIn('google', { redirect: false })` para evitar error falso
- Fix: SplashScreen reescrito sin framer-motion (causaba z-[9999] blocking en producción)
- Fix: LoginView limpia URL error params de NextAuth
- Fix: Logout también llama `signOut()` de NextAuth
- Fix: Credenciales visibles removidas del login screen

### Seguridad
- Admin guard actualizado para verificar por email/username/role
- ErrorBoundary en AuthProvider para que NextAuth no rompa la app

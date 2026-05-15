# Decisiones Arquitectónicas

## ADR-001: Next.js App Router con SPA

**Fecha**: 2024 (inicio del proyecto)
**Estado**: Aceptado

### Contexto
Se necesitaba una plataforma de streaming con navegación fluida similar a Netflix/Disney+.

### Decisión
Usar Next.js 16 App Router como SPA con Zustand para routing client-side en lugar de file-based routing.

### Consecuencias
- (+) Navegación instantánea sin recargas de página
- (+) Estado global centralizado
- (-) No hay SSR para contenido dinámico (SEO limitado)
- (-) Toda la lógica de navegación está en `page.tsx`

---

## ADR-002: Autenticación Dual (NextAuth + Legacy)

**Fecha**: 2025-05
**Estado**: Aceptado

### Contexto
El proyecto tenía auth legacy (localStorage) y se agregó Google OAuth. Se necesitaba soportar ambos.

### Decisión
Implementar NextAuth con Google + Credentials providers, manteniendo compatibilidad con el sistema legacy. AuthProvider hace de puente (SessionSync).

### Consecuencias
- (+) Google OAuth funcional
- (+) Compatibilidad con usuarios existentes
- (-) Complejidad: dos sistemas de auth coexisten
- (-) Posible inconsistencia de estado entre NextAuth y Zustand

---

## ADR-003: SQLite/libSQL con Prisma

**Fecha**: 2024
**Estado**: Aceptado

### Contexto
Se necesitaba persistencia para el sistema Guardian sin configurar una base de datos externa.

### Decisión
Usar SQLite con Prisma y libSQL adapter para soportar tanto local como Turso cloud.

### Consecuencias
- (+) Zero config para desarrollo local
- (+) Migración fácil a Turso para producción
- (-) Limitaciones de SQLite para queries complejos
- (-) No soporta conexiones concurrentes en escritura

---

## ADR-004: Zustand como Único State Manager

**Fecha**: 2024
**Estado**: Aceptado

### Contexto
Se necesitaba gestión de estado para auth, player, favoritos, historial, etc.

### Decisión
Usar Zustand con 8 stores consolidados en un solo archivo (`store.ts`).

### Consecuencias
- (+) Simple, sin boilerplate
- (+) Persistencia fácil con localStorage
- (-) Archivo grande (~500 líneas)
- (-) No hay separación por módulo

---

## ADR-005: Embeds iframe para Streaming

**Fecha**: 2024
**Estado**: Aceptado

### Contexto
Se necesitaba reproducir contenido de múltiples servidores externos sin licencias.

### Decisión
Usar servidores embed (VidSrc, NifelVid, etc.) a través de iframes.

### Consecuencias
- (+) No requiere infraestructura de streaming
- (+) Acceso a contenido variado
- (-) Dependencia de servidores externos
- (-) Riesgo de popups/ads
- (-) CSP restrictions para iframes

---

## ADR-006: i18n Inline (No JSON externo)

**Fecha**: 2024
**Estado**: Aceptado — Reconsiderar

### Contexto
Se necesitaba soporte multiidioma con 3 locales.

### Decisión
Implementar i18n inline en `i18n.ts` con ~350 keys por idioma.

### Consecuencias
- (+) Sin archivos extra que importar
- (-) Archivo enorme (~1000+ líneas)
- (-) Difícil de mantener y actualizar
- (-) No hay workflow de traducción

### Alternativa considerada
Migrar a `next-intl` con JSON files por locale (ya está como dependencia).

---

## ADR-007: Guardian Background Processing

**Fecha**: 2024-05
**Estado**: Aceptado

### Contexto
Se necesitaba monitoreo automático de canales IPTV y fuentes.

### Decisión
Implementar sistema Guardian con cron jobs (node-cron) que ejecuta scanning y discovery automáticamente.

### Consecuencias
- (+) Canales siempre actualizados
- (+) Discovery automático de nuevas fuentes
- (-) Consumo de recursos en servidor
- (-) Complejidad de scheduling en serverless (Vercel)

---

## ADR-008: Admin por Email/Username/Role

**Fecha**: 2025-05
**Estado**: Aceptado

### Contexto
Se necesitaba que yecos11@gmail.com tuviera acceso admin al loguear con Google.

### Decisión
Triple verificación: username en ADMIN_USERS, email en ADMIN_EMAILS, o role en JWT token.

### Consecuencias
- (+) Flexible: admin por Google, credenciales o token
- (-) Lógica duplicada en admin-guard.ts y admin-config.ts
- (-) Configuración hardcodeada (debería ser dinámica)

# Roadmap - XuperStream

## Estado Actual (v0.2.0)

✅ Google OAuth funcional
✅ Admin por email configurado
✅ Streaming (movies/series) operativo
✅ IPTV con verificación de canales
✅ Guardian background scanner
✅ Chromecast básico
✅ i18n (es, en, pt)
✅ PWA ready
✅ Deploy en Vercel
✅ Documentación profesional

---

## Próximos Pasos (v0.3.0)

### Prioridad Alta

- [ ] **Migrar i18n a JSON files** — Separar traducciones en archivos por locale
- [ ] **Quitar `ignoreBuildErrors`** — Resolver errores TypeScript existentes
- [ ] **Rate limiting en API routes** — Proteger contra abuso
- [ ] **Tests básicos** — Al menos tests de integración para auth y API routes críticas

### Prioridad Media

- [ ] **Migrar auth legacy a solo NextAuth** — Eliminar el sistema de auth dual
- [ ] **Validación de input server-side** — Zod schemas en todas las API routes
- [ ] **Error handling consistente** — Clase de error centralizada, formato uniforme
- [ ] **Loading states** — Skeleton loading en todas las vistas
- [ ] **Offline mode mejorado** — Cache de contenido con Service Worker

### Prioridad Baja

- [ ] **Limpiar modelos Prisma sin uso** — User y Post
- [ ] **Migrar a Prisma migrate** — En lugar de `db push`
- [ ] **Monitoreo en producción** — Logging centralizado
- [ ] **CI/CD pipeline** — GitHub Actions para build + test

---

## Visión a Largo Plazo (v1.0)

### Funcionalidades

- [ ] **Sistema de usuarios en DB** — Migrar de hardcode a Prisma
- [ ] **Perfiles de usuario** — Avatar, preferencias, historial en servidor
- [ ] **Listas personalizadas** — Crear y compartir listas de contenido
- [ ] **Notificaciones push** — Nuevo contenido, canales caídos
- [ ] **Búsqueda avanzada** — Filtros por género, año, rating, idioma
- [ ] **EPG (Guía de programación)** — Integración completa con Xuper EPG
- [ ] **Multi-dispositivo** — Sincronización entre dispositivos

### Infraestructura

- [ ] **Base de datos en la nube** — Turso/Planetscale para producción
- [ ] **CDN para assets** — Cloudflare R2 o similar
- [ ] **Autenticación robusta** — OAuth completo (GitHub, Discord, Apple)
- [ ] **API versioning** — `/api/v1/` para estabilidad
- [ ] **WebSocket** — Para updates en tiempo real (canal status, etc.)

### Calidad

- [ ] **Cobertura de tests > 70%**
- [ ] **ESLint estricto** — Sin warnings
- [ ] **TypeScript strict mode**
- [ ] **Performance budget** — Lighthouse score > 90
- [ ] **Accessibility audit** — WCAG 2.1 AA

---

## Hitos

| Versión | Fecha Estimada | Descripción |
|---------|---------------|-------------|
| v0.3.0 | Q3 2026 | Tests, i18n refactor, rate limiting |
| v0.4.0 | Q4 2026 | Auth unificado, validación, offline |
| v0.5.0 | Q1 2027 | Usuarios en DB, perfiles |
| v1.0.0 | Q2 2027 | Versión estable con todas las features |

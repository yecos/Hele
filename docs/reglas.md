# Reglas del Proyecto XuperStream

## Reglas Críticas para Trabajar con IA

### REGLAS OBLIGATORIAS

1. **No permitir reescritura completa de archivos** — Solo modificar funciones específicas
2. **Modificar solo lo necesario** — No cambiar código que funciona sin razón
3. **Pedir plan antes de generar código** — Siempre explicar el cambio propuesto
4. **Separar frontend y backend** — No mezclar lógica de servidor en componentes cliente
5. **Proteger archivos críticos** — Los siguientes archivos son sensibles y requieren aprobación explícita:
   - `src/lib/store.ts` (8 stores Zustand)
   - `src/app/api/auth/[...nextauth]/route.ts` (autenticación)
   - `src/components/AuthProvider.tsx` (puente NextAuth ↔ Zustand)
   - `middleware.ts` (seguridad CSP)
   - `prisma/schema.prisma` (base de datos)
6. **Controlar dependencias** — No agregar paquetes npm sin justificación
7. **Validar tipado TypeScript** — No usar `any` sin justificación explícita

## Reglas de Arquitectura

### Estado (Zustand)
- **8 stores** en `src/lib/store.ts` — No crear stores adicionales sin consolidar
- Toda persistencia en localStorage con prefijo `xs-` o `xuper-`
- Siempre manejar corrupción de localStorage con try/catch y reset

### Autenticación
- **Dual auth**: NextAuth (Google + Credentials) + legacy localStorage
- **AuthProvider** es el puente: SessionProvider → SessionSync → Zustand
- **Admin detection**: Por username (`admin`), email (`yecos11@gmail.com`), o role JWT
- **NUNCA** exponer credenciales en el código cliente

### API Routes
- Toda API route debe validar input antes de procesar
- Admin routes DEBEN usar `requireAdmin()` o `isAdminFromSession()`
- Errores DEBEN tener formato consistente: `{ success: false, error: string }`
- No loggear datos sensibles (tokens, passwords) en producción

### Componentes
- **shadcn/ui** para todos los componentes UI base
- No duplicar componentes existentes de shadcn
- Usar `cn()` para composición de clases
- Componentes cliente deben tener `'use client'` explícito

### Estilos
- **Tailwind CSS 4** para todo el styling
- **Dark mode only** — No implementar light mode
- Variables CSS en `globals.css` para temas
- No usar estilos inline (`style={{}}`) excepto para valores dinámicos

### Internacionalización
- **3 idiomas**: es, en, pt
- Todas las strings visibles DEBEN estar en `src/lib/i18n.ts`
- No hardcodear texto en componentes
- Usar `useI18n()` hook para acceder a traducciones

## Reglas de Seguridad

### Credenciales
- **NUNCA** commit `.env` — Está en `.gitignore`
- Claves API DEBEN estar en variables de entorno
- La clave 3DES (`xuper2024key@#$`) DEBE moverse a `XUPER_DES_KEY` env var
- `NEXTAUTH_SECRET` es OBLIGATORIO en producción

### CSP y Headers
- **No relajar** las políticas CSP sin justificación documentada
- X-Frame-Options: SAMEORIGIN es necesario para embeds
- Los headers de seguridad en middleware.ts son obligatorios

### Admin Access
- Solo emails en `ADMIN_EMAILS` tienen acceso admin
- Verificación server-side SIEMPRE, nunca solo client-side
- Admin panel requiere `isAdminFromSession()` o `requireAdmin()`

## Reglas de Desarrollo

### Commits
- Formato: `tipo(módulo): descripción`
- Tipos: `feat`, `fix`, `docs`, `refactor`, `security`, `chore`
- Ejemplo: `fix(auth): corregir redirect loop en Google login`

### Testing
- Ejecutar `npm run build` después de cada cambio significativo
- Verificar que no hay errores de TypeScript
- Probar en móvil y desktop
- Verificar que el build no tiene warnings nuevos

### Performance
- No importar librerías enteras si solo se necesita una función
- Usar `dynamic import` para componentes pesados
- Lazy loading para vistas no críticas
- Cachear respuestas de API cuando sea posible

## Reglas Específicas del Proyecto

### IPTV
- Los canales se verifican con HEAD requests, no GET
- Auto-skip de canales muertos con 3 segundos de countdown
- No reproducir más de un stream simultáneamente

### Streaming (Movies/Series)
- Servidores embed via iframe, nunca streams directos
- Server probing mide latencia, no disponibilidad
- El reproductor DEBE bloquear popups de los embeds

### Xuper TV
- Login usa 3DES/ECB/PKCS5 encryption
- El DCS debe cachear dominios por 30 minutos
- Heartbeat cada 5 minutos para mantener sesión activa

### Guardian
- Scanner se ejecuta en cron (6am, 12pm, 6pm, 3am)
- Discovery tiene 4 motores independientes
- Los canales verificados se limpian y regeneran cada scan

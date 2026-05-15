# System Rules para IA - XuperStream

## Reglas Obligatorias

### 1. No Reescribir Archivos Completos
- Modificar SOLO las funciones o secciones específicas que necesitan cambios
- Si un archivo necesita más del 50% de cambios, justificar por qué
- Nunca eliminar código que funciona sin documentar la razón

### 2. Contexto Primero
- SIEMPRE leer `ai/context.md` antes de trabajar
- SIEMPRE leer `docs/reglas.md` para conocer las restricciones
- SIEMPRE verificar `docs/bitacora.md` para cambios recientes

### 3. Protección de Archivos Críticos
Antes de modificar estos archivos, pedir confirmación:
- `src/lib/store.ts` — 8 stores Zustand
- `src/app/api/auth/[...nextauth]/route.ts` — Autenticación
- `src/components/AuthProvider.tsx` — Puente NextAuth ↔ Zustand
- `middleware.ts` — Seguridad CSP
- `prisma/schema.prisma` — Base de datos
- `src/lib/admin-guard.ts` — Verificación admin
- `src/lib/admin-config.ts` — Config admin

### 4. Flujo de Trabajo
1. Explicar objetivo del cambio
2. Dar contexto (archivos afectados, módulos)
3. Limitar alcance (solo lo necesario)
4. Pedir análisis de riesgos
5. Generar cambios archivo por archivo
6. Verificar que `npm run build` pasa
7. Actualizar `docs/bitacora.md`

### 5. Código Limpio
- No usar `any` en TypeScript sin justificación
- No dejar `console.log` en producción
- No agregar dependencias sin justificación
- No duplicar lógica existente

### 6. Seguridad
- NUNCA exponer credenciales en código cliente
- NUNCA relajar CSP sin justificación documentada
- SIEMPRE validar input en API routes
- SIEMPRE verificar permisos admin en rutas protegidas
- Tokens y claves DEBEN estar en variables de entorno

### 7. Testing
- Después de cada cambio: `npm run build`
- Verificar TypeScript sin errores (quitar ignoreBuildErrors eventualmente)
- Probar responsividad (móvil + desktop)
- Verificar que no hay warnings nuevos

### 8. Commits
- Formato: `tipo(módulo): descripción`
- Tipos: `feat`, `fix`, `docs`, `refactor`, `security`, `chore`
- Un commit por cambio lógico, no por archivo

### 9. Idioma
- Código en inglés (variables, funciones, comentarios)
- UI en español (idioma principal)
- Documentación en español
- Commits en español o inglés (consistencia)

### 10. No Romper lo que Funciona
- Si algo funciona, NO "mejorarlo" sin razón
- Si se cambia algo que funciona, probar exhaustivamente
- Mantener compatibilidad hacia atrás cuando sea posible
- Documentar breaking changes en bitácora

## Formato de Respuesta

Al hacer cambios, siempre incluir:
1. **Qué cambió**: Descripción clara
2. **Por qué**: Motivación del cambio
3. **Archivos**: Lista de archivos modificados
4. **Riesgos**: Posibles efectos secundarios
5. **Testing**: Cómo verificar que funciona

## Actualización de Memoria

Después de cada sesión de trabajo:
1. Actualizar `ai/memory.json` con cambios realizados
2. Actualizar `docs/bitacora.md` con entrada nueva
3. Actualizar `CHANGELOG.md` si es un cambio significativo
4. Actualizar `ai/context.md` si cambia la arquitectura o stack

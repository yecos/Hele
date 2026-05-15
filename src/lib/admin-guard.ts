/**
 * Admin Guard - Verificación de permisos de administrador
 *
 * Server-side: Lee el header X-Admin-Auth que contiene el xs-auth JSON
 * Formato esperado: { username: string, token: string, email?: string, role?: string }
 */

// Usuarios con permisos de admin por username (siempre en minúsculas)
const ADMIN_USERS = ['admin'];

// Emails de Google con permisos de admin
const ADMIN_EMAILS = ['yecos11@gmail.com'];

/**
 * Verifica si un xs-auth JSON pertenece a un usuario admin
 * Espera formato: JSON.stringify({ username, token, email?, role? })
 */
export function isAdminFromAuthData(authData: string): boolean {
  try {
    const parsed = JSON.parse(authData);
    if (!parsed.username) return false;

    // Check by explicit role
    if (parsed.role === 'admin') return true;

    // Check by username
    if (ADMIN_USERS.includes(parsed.username.toLowerCase())) return true;

    // Check by email (for Google OAuth users)
    if (parsed.email && ADMIN_EMAILS.includes(parsed.email.toLowerCase())) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Extrae los datos de admin de una request Next.js
 * Busca en: X-Admin-Auth header (xs-auth JSON directo)
 */
export function getAdminAuthData(request: Request): string | null {
  // Header personalizado con el xs-auth JSON completo
  const xsAuth = request.headers.get('x-admin-auth');
  if (xsAuth) return xsAuth;

  // Fallback: Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    // Intentar parsear como JSON (nuevo formato)
    try {
      const parsed = JSON.parse(token);
      if (parsed.username && parsed.token) return token;
    } catch {
      // No es JSON, podría ser un token legacy — rechazar por seguridad
    }
  }

  return null;
}

/**
 * Middleware de verificación admin para API routes
 * Returns { isAdmin: true, username } o lanza error
 */
export function requireAdmin(request: Request): { isAdmin: true; username: string } {
  const authData = getAdminAuthData(request);
  if (!authData) {
    throw new Error('No se proporcionó token de autenticación');
  }
  if (!isAdminFromAuthData(authData)) {
    throw new Error('Acceso denegado - Se requieren permisos de administrador');
  }
  const parsed = JSON.parse(authData);
  return { isAdmin: true, username: parsed.username.toLowerCase() };
}

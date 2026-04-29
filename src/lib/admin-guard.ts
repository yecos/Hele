/**
 * Admin Guard - Verificación de permisos de administrador
 * 
 * Server-side: Decodifica el token xs-auth del header Authorization
 * Client-side: Compara username con la lista de admins
 */

// Usuarios con permisos de admin
const ADMIN_USERS = ['admin'];

/**
 * Verifica si un token xs-auth pertenece a un usuario admin
 * Token formato: base64(username:timestamp:random)
 */
export function isAdminFromToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 3) return false;
    const username = parts[0].toLowerCase();
    return ADMIN_USERS.includes(username);
  } catch {
    return false;
  }
}

/**
 * Extrae el token de admin de una request Next.js
 * Busca en: Authorization header, cookie xs-auth, o body token
 */
export function getAdminToken(request: Request): string | null {
  // 1. Authorization header: "Bearer <token>"
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. Custom header (para fetch directo desde client)
  const xsAuth = request.headers.get('x-xs-auth');
  if (xsAuth) return xsAuth;

  return null;
}

/**
 * Middleware de verificación admin para API routes
 * Returns { isAdmin: boolean, username?: string } o lanza error
 */
export function requireAdmin(request: Request): { isAdmin: true; username: string } {
  const token = getAdminToken(request);
  if (!token) {
    throw new Error('No se proporcionó token de autenticación');
  }
  if (!isAdminFromToken(token)) {
    throw new Error('Acceso denegado - Se requieren permisos de administrador');
  }
  const decoded = Buffer.from(token, 'base64').toString('utf-8');
  const username = decoded.split(':')[0].toLowerCase();
  return { isAdmin: true, username };
}

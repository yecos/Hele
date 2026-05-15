/**
 * Admin Guard - Verificación de permisos de administrador
 *
 * Server-side: Lee el header X-Admin-Auth que contiene el xs-auth JSON
 * Formato esperado: { username: string, token: string, email?: string, role?: string }
 */

import { ADMIN_USERS, ADMIN_EMAILS } from '@/lib/admin-config';

// Re-export for convenience
export { ADMIN_USERS, ADMIN_EMAILS };

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

/**
 * Verifies admin access using NextAuth server session.
 * This is the SECURE method — validates the JWT cryptographically.
 */
export async function isAdminFromSession(request: Request): Promise<{ isAdmin: boolean; username: string; email?: string }> {
  try {
    // Dynamically import to avoid circular deps
    const { getServerSession } = await import('next-auth');
    const { default: authOptions } = await import('@/app/api/auth/[...nextauth]/route');
    const session = await getServerSession(authOptions as any);

    if (!session?.user) {
      return { isAdmin: false, username: '' };
    }

    const email = (session.user as any).email || '';
    const username = (session.user as any).username || session.user.id || email.split('@')[0];

    // Check if this email is in the admin list
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      return { isAdmin: true, username, email };
    }

    // Check by username
    if (ADMIN_USERS.includes(username.toLowerCase())) {
      return { isAdmin: true, username, email };
    }

    // Check by role from token
    if ((session.user as any).role === 'admin') {
      return { isAdmin: true, username, email };
    }

    return { isAdmin: false, username, email };
  } catch {
    // If NextAuth session check fails, fall back to header-based check
    const authData = getAdminAuthData(request);
    if (authData && isAdminFromAuthData(authData)) {
      const parsed = JSON.parse(authData);
      return { isAdmin: true, username: parsed.username?.toLowerCase() || '' };
    }
    return { isAdmin: false, username: '' };
  }
}

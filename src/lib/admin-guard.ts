/**
 * Admin Guard - Verificación de permisos de administrador
 *
 * Supports two auth methods:
 * 1. NextAuth JWT token (via getToken from next-auth/jwt)
 * 2. Legacy xs-auth header (backward compatibility)
 */

import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

// Usuarios con permisos de admin (siempre en minúsculas) - legacy fallback
const ADMIN_USERS = ['admin'];

/**
 * Verifica si un xs-auth JSON pertenece a un usuario admin (legacy)
 */
export function isAdminFromAuthData(authData: string): boolean {
  try {
    const parsed = JSON.parse(authData);
    if (!parsed.username) return false;
    return ADMIN_USERS.includes(parsed.username.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Extrae los datos de admin de una request Next.js (legacy header-based)
 */
export function getAdminAuthData(request: Request): string | null {
  const xsAuth = request.headers.get('x-admin-auth');
  if (xsAuth) return xsAuth;

  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    try {
      const parsed = JSON.parse(token);
      if (parsed.username && parsed.token) return token;
    } catch {
      // Not JSON — reject
    }
  }

  return null;
}

/**
 * Check admin from NextAuth JWT token (primary method)
 * Works with NextRequest in middleware and API routes
 */
export async function isAdminFromNextAuth(req: NextRequest | Request): Promise<{ isAdmin: boolean; username: string; role: string }> {
  try {
    const token = await getToken({ 
      req: req as any, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      return { isAdmin: false, username: '', role: 'user' };
    }

    const role = (token.role as string) || 'user';
    const username = (token.name as string) || (token.email as string)?.split('@')[0] || '';

    // Admin if role is 'admin' or username is in ADMIN_USERS
    const isAdmin = role === 'admin' || ADMIN_USERS.includes(username.toLowerCase());
    
    return { isAdmin, username, role };
  } catch {
    return { isAdmin: false, username: '', role: 'user' };
  }
}

/**
 * Middleware de verificación admin para API routes
 * Tries NextAuth JWT first, then falls back to legacy header auth
 */
export async function requireAdmin(request: Request): Promise<{ isAdmin: true; username: string; role: string }> {
  // Try NextAuth JWT first
  const nextAuthResult = await isAdminFromNextAuth(request);
  if (nextAuthResult.isAdmin) {
    return { isAdmin: true, username: nextAuthResult.username, role: nextAuthResult.role };
  }

  // Fallback: legacy header-based auth
  const authData = getAdminAuthData(request);
  if (!authData) {
    throw new Error('No se proporcionó token de autenticación');
  }
  if (!isAdminFromAuthData(authData)) {
    throw new Error('Acceso denegado - Se requieren permisos de administrador');
  }
  const parsed = JSON.parse(authData);
  return { isAdmin: true, username: parsed.username.toLowerCase(), role: 'admin' };
}

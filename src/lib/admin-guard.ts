/**
 * Admin authorization helpers.
 *
 * Privileged API routes MUST use isAdminFromSession().
 * Legacy header parsing remains only for non-privileged compatibility and must
 * never be used as a fallback for authorization decisions.
 */

import { getServerSession } from 'next-auth';
import { ADMIN_USERS, ADMIN_EMAILS } from '@/lib/admin-config';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export { ADMIN_USERS, ADMIN_EMAILS };

/**
 * Legacy parser kept temporarily for compatibility with old clients.
 * Do not use this function to authorize privileged API routes.
 */
export function isAdminFromAuthData(authData: string): boolean {
  try {
    const parsed = JSON.parse(authData);

    if (!parsed.username) return false;
    if (parsed.role === 'admin') return true;
    if (ADMIN_USERS.includes(String(parsed.username).toLowerCase())) return true;

    if (
      parsed.email &&
      ADMIN_EMAILS.includes(String(parsed.email).toLowerCase())
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Reads legacy auth material from request headers.
 * Kept only while older non-admin flows are migrated.
 */
export function getAdminAuthData(request: Request): string | null {
  const xsAuth = request.headers.get('x-admin-auth');
  if (xsAuth) return xsAuth;

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '');

  try {
    const parsed = JSON.parse(token);
    return parsed.username && parsed.token ? token : null;
  } catch {
    return null;
  }
}

/**
 * @deprecated Privileged routes must use isAdminFromSession().
 */
export function requireAdmin(): never {
  throw new Error(
    'Legacy header-based admin authorization is disabled. Use isAdminFromSession().'
  );
}

/**
 * Verifies admin access using the cryptographically validated NextAuth session.
 * There is deliberately no header-based fallback: authorization fails closed.
 */
export async function isAdminFromSession(
  _request?: Request
): Promise<{ isAdmin: boolean; username: string; email?: string }> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return { isAdmin: false, username: '' };
    }

    const user = session.user as typeof session.user & {
      id?: string;
      username?: string;
      role?: string;
    };

    const email = user.email?.toLowerCase() || '';
    const username =
      user.username?.toLowerCase() ||
      user.id?.toLowerCase() ||
      email.split('@')[0] ||
      '';

    const isAdmin =
      user.role === 'admin' ||
      (email !== '' && ADMIN_EMAILS.includes(email)) ||
      (username !== '' && ADMIN_USERS.includes(username));

    return {
      isAdmin,
      username,
      ...(email ? { email } : {}),
    };
  } catch (error) {
    console.error('[AdminGuard] Session validation failed:', error);
    return { isAdmin: false, username: '' };
  }
}

/**
 * User database - centralized
 * Single source of truth for local user accounts
 */

export interface LocalUser {
  password: string;
  name: string;
  role: string;
}

export const USERS_DB: Record<string, LocalUser> = {
  admin: { password: process.env.ADMIN_PASSWORD || 'admin123', name: 'Admin', role: 'admin' },
  hele: { password: process.env.HELE_PASSWORD || 'hele123', name: 'Hele', role: 'user' },
  usuario: { password: process.env.USUARIO_PASSWORD || 'usuario123', name: 'Usuario', role: 'user' },
};

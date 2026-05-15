/**
 * Centralized admin configuration
 * Single source of truth for admin users and emails
 */

// Admin usernames
export const ADMIN_USERS = ['admin'];

// Admin Google emails
export const ADMIN_EMAILS = ['yecos11@gmail.com'];

/**
 * Check if a username has admin privileges
 */
export function isAdminUsername(username: string): boolean {
  return ADMIN_USERS.includes(username.toLowerCase());
}

/**
 * Check if an email has admin privileges
 */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Get role for a Google user based on email
 */
export function getGoogleUserRole(email: string): { username: string; role: string } {
  const emailPrefix = email.split('@')[0].toLowerCase();
  if (isAdminEmail(email)) {
    return { username: 'admin', role: 'admin' };
  }
  return { username: emailPrefix, role: 'user' };
}
